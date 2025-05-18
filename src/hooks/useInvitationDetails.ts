
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
    
    // Only fetch once to avoid loops
    if (fetchAttempted) {
      return;
    }
    
    // Store invitationId in sessionStorage so we can retrieve it post-login if needed
    sessionStorage.setItem('pendingInvitationId', invitationId);
    
    // Fetch invitation details
    const fetchInvitationDetails = async () => {
      try {
        setFetchAttempted(true);
        console.log(`Fetching invitation details for ID: ${invitationId}`);
        
        // Get invitation data first
        const { data: invitationData, error: invitationError } = await supabase
          .from('invitations')
          .select('*')
          .eq('invitation_id', invitationId)
          .is('accepted_at', null)
          .gt('expires_at', 'now()');
          
        if (invitationError) {
          console.error("Error fetching invitation from Supabase:", invitationError);
          throw new Error('אירעה שגיאה בעת חיפוש ההזמנה: ' + invitationError.message);
        }
        
        // Check if we have valid invitation data
        const invitationArray = Array.isArray(invitationData) ? invitationData : [];
        
        if (!invitationArray || invitationArray.length === 0) {
          console.log("No active invitation found in database");
          throw new Error("הזמנה לא נמצאה או שפג תוקפה");
        }
        
        const invitation = invitationArray[0];
        console.log("Found invitation in database:", invitation);
        
        // Now fetch account data separately
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', invitation.account_id);
          
        if (accountError) {
          console.error("Failed to fetch account data:", accountError);
          throw new Error("הזמנה לא תקפה - חסרים פרטי חשבון");
        }
        
        if (!accountData || accountData.length === 0) {
          console.error("No account data found for account_id:", invitation.account_id);
          throw new Error("הזמנה לא תקפה - חסרים פרטי חשבון");
        }
        
        const account = accountData[0];
        
        // Fetch owner profile separately
        let ownerName = 'בעל החשבון';
        
        try {
          if (account.owner_id) {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', account.owner_id)
              .maybeSingle();
            
            if (ownerProfile && ownerProfile.name) {
              ownerName = ownerProfile.name;
            }
          }
        } catch (err) {
          console.error("Error fetching owner profile:", err);
          // Continue with default name
        }
        
        // Set invitation details
        setInvitationDetails({
          ownerName: ownerName,
          accountName: account.name || 'חשבון משותף',
          email: invitation.email || '',
        });
        
        // Store the account ID and owner ID in sessionStorage for use during acceptance
        if (invitation.account_id) {
          sessionStorage.setItem('pendingInvitationAccountId', invitation.account_id);
        }
        
        if (account.owner_id) {
          sessionStorage.setItem('pendingInvitationOwnerId', account.owner_id);
        }
        
        // Store full details in sessionStorage for debugging
        const enrichedInvitation = {
          ...invitation,
          accounts: account,
          owner_profile: { name: ownerName }
        };
        sessionStorage.setItem('currentInvitationDetails', JSON.stringify(enrichedInvitation));
        
        setStatus('success');
        
      } catch (error: any) {
        console.error('Error fetching invitation details:', error);
        setStatus('error');
        setErrorMessage(error.message || 'לא ניתן למצוא את ההזמנה');
      }
    };
    
    // Add a short delay to simulate loading
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
