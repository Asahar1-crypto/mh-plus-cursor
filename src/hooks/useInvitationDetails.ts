
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
        
        // Get invitation data by invitation_id (accessible by anyone if valid)
        const { data: invitationData, error: invitationError } = await supabase
          .from('invitations')
          .select('*')
          .eq('invitation_id', invitationId)
          .is('accepted_at', null)
          .gt('expires_at', 'now()')
          .maybeSingle();
          
        if (invitationError) {
          console.error("Error fetching invitation from Supabase:", invitationError);
          throw new Error('אירעה שגיאה בעת חיפוש ההזמנה: ' + invitationError.message);
        }
        
        if (!invitationData) {
          console.log("No active invitation found in database");
          throw new Error("הזמנה לא נמצאה או שפג תוקפה");
        }
        
        const invitation = invitationData;
        console.log("Found invitation in database:", invitation);
        
        // Try to get account data
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', invitation.account_id);
          
        if (accountError || !accountData || accountData.length === 0) {
          console.warn("Account not found or error fetching account:", accountError);
          // Instead of throwing error, create a fallback account info
          setInvitationDetails({
            ownerName: 'בעל החשבון',
            accountName: 'חשבון שותף (נתונים לא זמינים)',
            email: invitation.email || '',
            expires_at: invitation.expires_at,
          });
          
          // Store minimal data for acceptance
          sessionStorage.setItem('pendingInvitationAccountId', invitation.account_id);
          sessionStorage.setItem('currentInvitationDetails', JSON.stringify({
            ...invitation,
            accounts: { name: 'חשבון שותף (נתונים לא זמינים)' },
            owner_profile: { name: 'בעל החשבון' }
          }));
          
          setStatus('success');
          return;
        }
        
        const account = accountData[0];
        
        // Fetch owner profile
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
        }
        
        setInvitationDetails({
          ownerName: ownerName,
          accountName: account.name || 'חשבון משותף',
          email: invitation.email || '',
          expires_at: invitation.expires_at,
        });
        
        // Store data for acceptance
        if (invitation.account_id) {
          sessionStorage.setItem('pendingInvitationAccountId', invitation.account_id);
        }
        
        if (account.owner_id) {
          sessionStorage.setItem('pendingInvitationOwnerId', account.owner_id);
        }
        
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
