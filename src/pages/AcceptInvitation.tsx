
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { InvitationDetails } from '@/components/invitation/types';

// Import the components
import LoadingState from '@/components/invitation/LoadingState';
import ErrorState from '@/components/invitation/ErrorState';
import SuccessState from '@/components/invitation/SuccessState';

const AcceptInvitation = () => {
  const { invitationId } = useParams();
  const { isAuthenticated, acceptInvitation, user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  useEffect(() => {
    if (!invitationId) {
      setStatus('error');
      setErrorMessage('מזהה הזמנה חסר');
      return;
    }
    
    // Fetch invitation details
    const fetchInvitationDetails = async () => {
      try {
        console.log(`Fetching invitation details for ID: ${invitationId}`);
        
        // First try to get basic invitation info
        const { data: invitation, error } = await supabase
          .from('invitations')
          .select(`
            id, 
            account_id, 
            email, 
            invitation_id, 
            expires_at, 
            accepted_at,
            accounts:account_id (
              id,
              name,
              owner_id
            )
          `)
          .eq('invitation_id', invitationId)
          .is('accepted_at', null)
          .gt('expires_at', 'now()')
          .single();
          
        if (error) {
          console.error("Error fetching invitation from Supabase:", error);
          throw new Error('לא נמצאה הזמנה תקפה במערכת');
        }
        
        console.log("Found invitation:", invitation);
        
        if (!invitation || !invitation.accounts) {
          throw new Error("הזמנה לא תקפה או שפג תוקפה");
        }
        
        // Get owner profile
        let ownerName = 'בעל החשבון';
        
        if (invitation.accounts.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', invitation.accounts.owner_id)
            .single();
            
          if (ownerData) {
            ownerName = ownerData.name || 'בעל החשבון';
          }
        }
        
        // Set invitation details
        setInvitationDetails({
          ownerName: ownerName,
          accountName: invitation.accounts.name || 'חשבון משותף',
          email: invitation.email || '',
        });
        
        // Store IDs in sessionStorage for later use during acceptance
        sessionStorage.setItem('pendingInvitationAccountId', invitation.account_id);
        
        if (invitation.accounts.owner_id) {
          sessionStorage.setItem('pendingInvitationOwnerId', invitation.accounts.owner_id);
        }
        
        setStatus('success');
        
      } catch (error) {
        console.error('Error fetching invitation details:', error);
        
        // Fallback to localStorage
        try {
          const pendingInvitationsData = localStorage.getItem('pendingInvitations');
          
          if (!pendingInvitationsData) {
            console.error("No invitations found in localStorage");
            setStatus('error');
            setErrorMessage('לא נמצאו הזמנות פעילות עבורך');
            return;
          }
          
          const pendingInvitations = JSON.parse(pendingInvitationsData);
          const localInvitation = pendingInvitations[invitationId];
          
          if (!localInvitation) {
            console.error(`Invitation with ID ${invitationId} not found in localStorage`);
            setStatus('error');
            setErrorMessage('ההזמנה לא נמצאה או שפג תוקפה');
            return;
          }
          
          console.log("Found invitation in localStorage:", localInvitation);
          
          setInvitationDetails({
            ownerName: localInvitation.ownerName || 'בעל החשבון',
            accountName: localInvitation.name || 'חשבון משותף',
            email: localInvitation.sharedWithEmail || '',
          });
          
          // Store the account_id in sessionStorage if it exists
          if (localInvitation.accountId) {
            console.log("Storing account ID in sessionStorage:", localInvitation.accountId);
            sessionStorage.setItem('pendingInvitationAccountId', localInvitation.accountId);
          }
          
          // Also store the owner ID to ensure proper account linking
          if (localInvitation.ownerId) {
            console.log("Storing owner ID in sessionStorage:", localInvitation.ownerId);
            sessionStorage.setItem('pendingInvitationOwnerId', localInvitation.ownerId);
          }
          
          setStatus('success');
        } catch (localStorageError) {
          console.error('Failed to get invitation from localStorage:', localStorageError);
          setStatus('error');
          setErrorMessage('אירעה שגיאה בעת קריאת פרטי ההזמנה');
        }
      }
    };
    
    // Add a short delay to simulate loading
    const timer = setTimeout(() => {
      fetchInvitationDetails();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [invitationId]);
  
  return (
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      {status === 'loading' && <LoadingState />}
      
      {status === 'error' && <ErrorState message={errorMessage} />}
      
      {status === 'success' && invitationDetails && (
        <SuccessState 
          invitationDetails={invitationDetails}
          invitationId={invitationId || ''}
          user={user}
          isAuthenticated={isAuthenticated}
          acceptInvitation={acceptInvitation}
        />
      )}
    </div>
  );
};

export default AcceptInvitation;
