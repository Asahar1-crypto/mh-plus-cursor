
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

      // First get all pending invitations for this user
      const { data: rawInvitations, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', 'now()');

      if (error) {
        console.error('Error fetching invitations:', error);
        toast.error('שגיאה בטעינת ההזמנות');
        return;
      }

      console.log('Raw invitations found:', rawInvitations);
      
      if (!rawInvitations || rawInvitations.length === 0) {
        setInvitations([]);
        return;
      }

      // For each invitation, try to get account data
      const enrichedInvitations = await Promise.all(
        rawInvitations.map(async (invitation) => {
          try {
            // Try to get account data
            const { data: accountData } = await supabase
              .from('accounts')
              .select(`
                id,
                name,
                owner_id,
                profiles!accounts_owner_id_fkey (
                  name
                )
              `)
              .eq('id', invitation.account_id)
              .single();

            if (accountData) {
              return {
                ...invitation,
                accounts: accountData
              };
            } else {
              // If account data is missing, create a fallback
              console.warn(`Account data missing for invitation ${invitation.invitation_id}, creating fallback`);
              return {
                ...invitation,
                accounts: {
                  id: invitation.account_id,
                  name: 'חשבון שותף (נתונים לא זמינים)',
                  owner_id: null,
                  profiles: {
                    name: 'בעל החשבון'
                  }
                }
              };
            }
          } catch (err) {
            console.error(`Error fetching account for invitation ${invitation.invitation_id}:`, err);
            // Return invitation with fallback data
            return {
              ...invitation,
              accounts: {
                id: invitation.account_id,
                name: 'חשבון שותף (נתונים לא זמינים)',
                owner_id: null,
                profiles: {
                  name: 'בעל החשבון'
                }
              }
            };
          }
        })
      );

      console.log('Enriched invitations:', enrichedInvitations);
      setInvitations(enrichedInvitations);
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
