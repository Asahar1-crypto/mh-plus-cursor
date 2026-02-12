
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
        // Fetching invitation details
        
        // Use secure RPC function that doesn't expose email addresses
        const { data: publicData, error: publicError } = await supabase
          .rpc('get_public_invitation_details', { p_invitation_id: invitationId });
          
        if (publicError) {
          console.error("Error fetching invitation via RPC:", publicError);
          throw new Error('אירעה שגיאה בעת חיפוש ההזמנה: ' + publicError.message);
        }
        
        if (!publicData || publicData.length === 0) {
          throw new Error("הזמנה לא נמצאה או שפג תוקפה");
        }
        
        const invitation = publicData[0];
        
        // Store account_id for acceptance flow
        if (invitation.account_id) {
          sessionStorage.setItem('pendingInvitationAccountId', invitation.account_id);
        }
        
        // Get email and phone from invitation (returned from secure RPC)
        const invitationEmail = invitation.email || '';
        const invitationPhone = invitation.phone_number || '';
        
        setInvitationDetails({
          ownerName: invitation.owner_name || 'בעל החשבון',
          accountName: invitation.account_name || 'חשבון משותף',
          email: invitationEmail,
          phoneNumber: invitationPhone,
          expires_at: invitation.expires_at,
        });
        
        // Store enriched data for acceptance
        sessionStorage.setItem('currentInvitationDetails', JSON.stringify({
          invitation_id: invitationId,
          account_id: invitation.account_id,
          expires_at: invitation.expires_at,
          email: invitationEmail,
          phone_number: invitationPhone,
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
