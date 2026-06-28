-- =============================================
-- 04: Notifications & Push Tokens
-- =============================================
-- Creates the notifications and push_tokens tables
-- with RLS policies, indexes, and cleanup utility.
-- =============================================

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('status_update', 'purchase', 'item_added', 'item_deleted')),
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_home_id ON notifications(home_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only view their own notifications
CREATE POLICY "Users can view home notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: Users can insert notifications for their own homes
-- (Server-side edge functions use service_role which bypasses RLS)
CREATE POLICY "Users can insert own notifications"
    ON notifications FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND home_id IN (SELECT get_my_home_ids())
    );

-- UPDATE: Users can only update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- Cleanup function (call via pg_cron or manually)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PUSH TOKENS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(push_token);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens"
    ON push_tokens FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own push tokens"
    ON push_tokens FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens"
    ON push_tokens FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
    ON push_tokens FOR DELETE
    USING (user_id = auth.uid());
