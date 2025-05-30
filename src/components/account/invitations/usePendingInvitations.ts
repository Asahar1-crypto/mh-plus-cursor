
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { PendingInvitation } from './types';

export const usePendingInvitations = () => {
  const { user, acceptInvitation } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPendingInvitations = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      console.log('Fetching pending invitations for:', user.email);

      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          email,
          account_id,
          expires_at,
          accounts!inner (
            id,
            name,
            owner_id,
            profiles!accounts_owner_id_fkey (
              name
            )
          )
        `)
        .eq('email', user.email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', 'now()');

      if (error) {
        console.error('Error fetching invitations:', error);
        toast.error('שגיאה בטעינת ההזמנות');
        return;
      }

      console.log('Found pending invitations:', data);
      
      // Filter out invitations with missing account data
      const validInvitations = (data || []).filter(invitation => 
        invitation.accounts && invitation.accounts.id
      );
      
      console.log('Valid invitations after filtering:', validInvitations);
      setInvitations(validInvitations);
    } catch (error) {
      console.error('Error in fetchPendingInvitations:', error);
      toast.error('שגיאה בטעינת ההזמנות');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user || processing) return;

    try {
      setProcessing(invitationId);
      console.log('Accepting invitation:', invitationId);
      
      await acceptInvitation(invitationId);
      
      setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitationId));
      toast.success('הצטרפת לחשבון בהצלחה!');
      
      // Force page reload to update the account context properly
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'שגיאה באישור ההזמנה');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    if (!user || processing) return;

    try {
      setProcessing(invitationId);
      console.log('Declining invitation:', invitationId);

      const { error } = await supabase
        .from('invitations')
        .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq('invitation_id', invitationId);

      if (error) {
        console.error('Error declining invitation:', error);
        throw new Error('שגיאה בדחיית ההזמנה');
      }

      setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitationId));
      toast.success('ההזמנה נדחתה');

    } catch (error: any) {
      console.error('Error declining invitation:', error);
      toast.error(error.message || 'שגיאה בדחיית ההזמנה');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    fetchPendingInvitations();
  }, [user]);

  return {
    invitations,
    loading,
    processing,
    handleAcceptInvitation,
    handleDeclineInvitation
  };
};
