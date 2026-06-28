import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type NotificationType = 'status_update' | 'purchase' | 'item_added' | 'item_deleted';

interface RequestBody {
  senderUserId: string;
  homeId: string;
  title: string;
  body: string;
  type: NotificationType;
  itemId?: string;
  itemName?: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  details?: {
    error?: string;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_TYPES: NotificationType[] = ['status_update', 'purchase', 'item_added', 'item_deleted'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authHeader) {
      return new Response(JSON.stringify({ error: 'Missing required configuration' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Service-role client — used for auth verification AND all DB operations
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await serviceClient.auth.getUser(token);

    if (authError || !user) {
      console.error('auth.getUser failed:', authError?.message ?? 'no user returned');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', detail: authError?.message }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const payload = (await req.json()) as RequestBody;
    const { senderUserId, homeId, title, body, type, itemId, itemName, data } = payload;

    if (!senderUserId || !homeId || !title || !body || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (user.id !== senderUserId) {
      return new Response(JSON.stringify({ error: 'senderUserId mismatch' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: senderMembership, error: senderMembershipError } = await serviceClient
      .from('home_members')
      .select('home_id')
      .eq('home_id', homeId)
      .eq('user_id', senderUserId)
      .maybeSingle();

    if (senderMembershipError || !senderMembership) {
      return new Response(JSON.stringify({ error: 'Sender is not a member of this home' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: members, error: membersError } = await serviceClient
      .from('home_members')
      .select('user_id')
      .eq('home_id', homeId)
      .neq('user_id', senderUserId);

    if (membersError) {
      return new Response(JSON.stringify({ error: 'Failed to load home members' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const recipientIds = (members ?? []).map((member) => member.user_id);

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ success: true, recipients: 0, pushesSent: 0 }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const notificationRows = recipientIds.map((recipientId) => ({
      home_id: homeId,
      user_id: recipientId,
      title,
      body,
      type,
      item_id: itemId,
      item_name: itemName,
      read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await serviceClient.from('notifications').insert(notificationRows);
    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to store notifications' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokenRows, error: tokenError } = await serviceClient
      .from('push_tokens')
      .select('push_token')
      .in('user_id', recipientIds);

    if (tokenError) {
      return new Response(JSON.stringify({ error: 'Failed to load push tokens' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const tokens = (tokenRows ?? []).map((row) => row.push_token).filter(Boolean);

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, recipients: recipientIds.length, pushesSent: 0 }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // priority: 'high' is required for Android to display the notification as a
    // heads-up banner instead of silently inserting it into the tray. Expo/FCM
    // default to 'normal' priority when omitted, which Android treats as a
    // silent tray notification (no pop/banner). See Expo Push API docs:
    // https://docs.expo.dev/push-notifications/sending-notifications/#message-request-format
    //
    // channelId: 'default' routes the notification to the MAX-importance channel
    // that the client creates via setNotificationChannelAsync('default', ...).
    // Without this, Expo falls back to its auto-created "Default" channel whose
    // importance may be lower and cannot be raised after first creation.
    //
    // interruptionLevel: 'active' ensures iOS shows the banner prominently.
    const pushMessages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      priority: 'high',
      channelId: 'default',
      interruptionLevel: 'active',
      data: data ?? {},
    }));

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessages),
    });

    const expoResult = (await expoResponse.json()) as { data?: ExpoPushTicket[] };
    const invalidTokens: string[] = [];

    if (expoResult.data) {
      expoResult.data.forEach((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(tokens[index]);
        }
      });
    }

    if (invalidTokens.length > 0) {
      await serviceClient.from('push_tokens').delete().in('push_token', invalidTokens);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipients: recipientIds.length,
        pushesSent: tokens.length,
        invalidTokensRemoved: invalidTokens.length,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
