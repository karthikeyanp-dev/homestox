
import { supabase } from '../utils/supabase';
import { HomeInvitation, MemberWithProfile } from '../types';

export const memberService = {
    /**
     * Invite a member to a home via email.
     * Creates an invitation record. If the user exists, links their user_id.
     */
    async inviteMember(homeId: string, email: string, invitedBy: string): Promise<void> {
        const normalizedEmail = email.trim().toLowerCase();

        // 1. Check if user is already a member of this home
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', normalizedEmail)
            .single();

        if (existingProfile) {
            const { data: existingMember } = await supabase
                .from('home_members')
                .select('user_id')
                .eq('home_id', homeId)
                .eq('user_id', existingProfile.id)
                .single();

            if (existingMember) {
                throw new Error('This user is already a member of this home.');
            }
        }

        // 2. Check if there's already a pending invitation
        const { data: existingInvite } = await supabase
            .from('home_invitations')
            .select('id')
            .eq('home_id', homeId)
            .eq('invited_email', normalizedEmail)
            .eq('status', 'pending')
            .single();

        if (existingInvite) {
            throw new Error('An invitation has already been sent to this email.');
        }

        // 3. Create the invitation
        const { error } = await supabase
            .from('home_invitations')
            .insert({
                home_id: homeId,
                invited_email: normalizedEmail,
                invited_by: invitedBy,
                invited_user_id: existingProfile?.id || null,
                status: 'pending',
            });

        if (error) throw error;
    },

    /**
     * Accept an invitation — adds user as member and marks invite accepted.
     */
    async acceptInvitation(invitationId: string, userId: string): Promise<void> {
        // 1. Get the invitation
        const { data: invite, error: fetchError } = await supabase
            .from('home_invitations')
            .select('*')
            .eq('id', invitationId)
            .single();

        if (fetchError || !invite) throw new Error('Invitation not found.');
        if (invite.status !== 'pending') throw new Error('This invitation is no longer pending.');

        // 2. Add as member
        const { error: memberError } = await supabase
            .from('home_members')
            .insert({
                home_id: invite.home_id,
                user_id: userId,
                role: 'member',
            });

        if (memberError) throw memberError;

        // 3. Mark invitation as accepted
        const { error: updateError } = await supabase
            .from('home_invitations')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', invitationId);

        if (updateError) throw updateError;
    },

    /**
     * Reject an invitation.
     */
    async rejectInvitation(invitationId: string): Promise<void> {
        const { error } = await supabase
            .from('home_invitations')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', invitationId);

        if (error) throw error;
    },

    /**
     * Get all members of a home with their profile data.
     */
    async getHomeMembers(homeId: string): Promise<MemberWithProfile[]> {
        const { data, error } = await supabase
            .from('home_members')
            .select(`
                home_id,
                user_id,
                role,
                profiles:user_id (
                    id,
                    email,
                    full_name,
                    avatar_url
                )
            `)
            .eq('home_id', homeId);

        if (error) throw error;

        return (data || []).map((m: any) => ({
            home_id: m.home_id,
            user_id: m.user_id,
            role: m.role,
            profile: m.profiles || { id: m.user_id, email: 'Unknown' },
        }));
    },

    /**
     * Get all pending invitations sent for a specific home.
     */
    async getHomePendingInvitations(homeId: string): Promise<HomeInvitation[]> {
        const { data, error } = await supabase
            .from('home_invitations')
            .select(`
                *,
                inviter_profile:invited_by (
                    id,
                    email,
                    full_name,
                    avatar_url
                )
            `)
            .eq('home_id', homeId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as HomeInvitation[];
    },

    /**
     * Get all pending invitations for the current user (by email).
     */
    async getUserPendingInvitations(email: string): Promise<HomeInvitation[]> {
        const normalizedEmail = email.trim().toLowerCase();


        const { data, error } = await supabase
            .from('home_invitations')
            .select(`
                *,
                home:home_id (
                    id,
                    name
                ),
                inviter_profile:invited_by (
                    id,
                    email,
                    full_name,
                    avatar_url
                )
            `)
            .eq('invited_email', normalizedEmail)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });


        if (error) throw error;
        return (data || []) as HomeInvitation[];
    },

    /**
     * Remove a member from a home (only owners can do this).
     */
    async removeMember(homeId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('home_members')
            .delete()
            .eq('home_id', homeId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    /**
     * Cancel a pending invitation.
     */
    async cancelInvitation(invitationId: string): Promise<void> {
        const { error } = await supabase
            .from('home_invitations')
            .delete()
            .eq('id', invitationId);

        if (error) throw error;
    },
};
