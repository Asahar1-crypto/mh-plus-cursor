
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InvitationDetails } from '@/components/invitation/types';

export function useInvitationDetails(invitationId: string | undefined) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    if (!invitationId) {
      setStatus('error');
      setErrorMessage('מזהה הזמנה חסר');
      return;
    }
    
    if (fetchAttempted) {
      return;
    }
    
    sessionStorage.setItem('pendingInvitationId', invitationId);
    
    const fetchInvitationDetails = async () => {
      try {
        setFetchAttempted(true);
        console.log(`Fetching invitation details for ID: ${invitationId}`);
        
        // Use secure RPC function that doesn't expose email addresses
        const { data: publicData, error: publicError } = await supabase
          .rpc('get_public_invitation_details', { p_invitation_id: invitationId });
          
        if (publicError) {
          console.error("Error fetching invitation via RPC:", publicError);
          throw new Error('אירעה שגיאה בעת חיפוש ההזמנה: ' + publicError.message);
        }
        
        if (!publicData || publicData.length === 0) {
          console.log("No active invitation found");
          throw new Error("הזמנה לא נמצאה או שפג תוקפה");
        }
        
        const invitation = publicData[0];
        console.log("Found invitation via secure RPC:", invitation);
        
        // Store account_id for acceptance flow
        if (invitation.account_id) {
          sessionStorage.setItem('pendingInvitationAccountId', invitation.account_id);
        }
        
        // For authenticated users, try to get full invitation details including email
        // This will only work if the email matches the logged-in user (via RLS)
        const { data: session } = await supabase.auth.getSession();
        let invitationEmail = '';
        
        if (session?.session?.user) {
          // Authenticated user - can see invitation if it's for their email
          const { data: fullInvitation } = await supabase
            .from('invitations')
            .select('email, account_id')
            .eq('invitation_id', invitationId)
            .maybeSingle();
            
          if (fullInvitation) {
            invitationEmail = fullInvitation.email || '';
          }
        }
        
        setInvitationDetails({
          ownerName: invitation.owner_name || 'בעל החשבון',
          accountName: invitation.account_name || 'חשבון משותף',
          email: invitationEmail,
          expires_at: invitation.expires_at,
        });
        
        // Store enriched data for acceptance
        sessionStorage.setItem('currentInvitationDetails', JSON.stringify({
          invitation_id: invitationId,
          account_id: invitation.account_id,
          expires_at: invitation.expires_at,
          email: invitationEmail,
          accounts: { name: invitation.account_name },
          owner_profile: { name: invitation.owner_name }
        }));
        
        setStatus('success');
        
      } catch (error: any) {
        console.error('Error fetching invitation details:', error);
        setStatus('error');
        setErrorMessage(error.message || 'לא ניתן למצוא את ההזמנה');
      }
    };
    
    const timer = setTimeout(() => {
      fetchInvitationDetails();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [invitationId, fetchAttempted]);

  return {
    status,
    invitationDetails,
    errorMessage,
    fetchAttempted
  };
}
