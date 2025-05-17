
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { InvitationDetails, InvitationData } from '@/components/invitation/types';

// Import the components
import LoadingState from '@/components/invitation/LoadingState';
import ErrorState from '@/components/invitation/ErrorState';
import SuccessState from '@/components/invitation/SuccessState';

const AcceptInvitation = () => {
  const { invitationId } = useParams();
  const { isAuthenticated, acceptInvitation, user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  
  useEffect(() => {
    if (!invitationId) {
      setStatus('error');
      return;
    }
    
    // Fetch invitation details
    const fetchInvitationDetails = async () => {
      try {
        console.log(`Fetching invitation details for ID: ${invitationId}`);
        
        // First try to get basic invitation info
        const { data: invitation, error } = await supabase
          .from('invitations')
          .select('id, account_id, email, invitation_id, expires_at, accepted_at')
          .eq('invitation_id', invitationId)
          .is('accepted_at', null)
          .gt('expires_at', 'now()')
          .single();
          
        if (error) {
          console.error("Error fetching invitation from Supabase:", error);
          throw error;
        }
        
        console.log("Found invitation:", invitation);
        
        if (!invitation) {
          throw new Error("Invitation not found");
        }
        
        // Get account information
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', invitation.account_id)
          .single();
          
        if (accountError) {
          console.error("Error fetching account:", accountError);
          throw accountError;
        }
        
        if (!account) {
          throw new Error("Account not found");
        }
        
        console.log("Found account:", account);
        
        // Get owner profile
        let ownerName = 'בעל החשבון';
        
        if (account.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', account.owner_id)
            .single();
            
          if (ownerData) {
            ownerName = ownerData.name || 'בעל החשבון';
          }
        }
        
        // Set invitation details
        setInvitationDetails({
          ownerName: ownerName,
          accountName: account.name || 'חשבון משותף',
          email: invitation.email || '',
        });
        
        // Store IDs in sessionStorage for later use during acceptance
        sessionStorage.setItem('pendingInvitationAccountId', invitation.account_id);
        
        if (account.owner_id) {
          sessionStorage.setItem('pendingInvitationOwnerId', account.owner_id);
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
            return;
          }
          
          const pendingInvitations = JSON.parse(pendingInvitationsData);
          const localInvitation = pendingInvitations[invitationId];
          
          if (!localInvitation) {
            console.error(`Invitation with ID ${invitationId} not found in localStorage`);
            setStatus('error');
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
      
      {status === 'error' && <ErrorState />}
      
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
