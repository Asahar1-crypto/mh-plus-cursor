
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
        
        // First try to get from Supabase with comprehensive data selection
        const { data: invitations, error } = await supabase
          .from('invitations')
          .select(`
            *,
            accounts:account_id (
              id,
              name,
              owner_id
            )
          `)
          .eq('invitation_id', invitationId)
          .is('accepted_at', null)
          .gt('expires_at', 'now()');
          
        console.log("Supabase invitation query results:", { invitations, error });
          
        if (error) {
          console.error("Error fetching invitation from Supabase:", error);
          throw error;
        }
        
        if (!invitations || invitations.length === 0) {
          console.log("No invitation found in Supabase, checking localStorage");
          // Fallback to localStorage for demo purposes
          const pendingInvitationsData = localStorage.getItem('pendingInvitations');
          console.log("Pending invitations in localStorage:", pendingInvitationsData);
          
          if (!pendingInvitationsData) {
            console.error("No invitations found in localStorage either");
            setStatus('error');
            return;
          }
          
          const pendingInvitations = JSON.parse(pendingInvitationsData);
          const invitation = pendingInvitations[invitationId];
          
          if (!invitation) {
            console.error(`Invitation with ID ${invitationId} not found in localStorage`);
            setStatus('error');
            return;
          }
          
          // Construct detail from localStorage data
          console.log("Found invitation in localStorage:", invitation);
          setInvitationDetails({
            ownerName: invitation.ownerName || 'בעל החשבון',
            accountName: invitation.name || 'חשבון משותף',
            email: invitation.sharedWithEmail || '',
          });
        } else {
          // Use supabase data
          const invitation = invitations[0];
          const account = invitation.accounts;
          console.log("Processing Supabase invitation:", { invitation, account });
          
          // If we have account data, fetch the owner's profile separately
          if (account && account.owner_id) {
            const { data: ownerData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', account.owner_id)
              .single();
              
            const ownerName = ownerData?.name || 'בעל החשבון';
            
            setInvitationDetails({
              ownerName: ownerName,
              accountName: account?.name || 'חשבון משותף',
              email: invitation.email || '',
            });
          } else {
            // Fallback if we can't get the owner's profile
            setInvitationDetails({
              ownerName: 'בעל החשבון',
              accountName: account?.name || 'חשבון משותף',
              email: invitation.email || '',
            });
          }
        }
        
        setStatus('success');
        
      } catch (error) {
        console.error('Error fetching invitation:', error);
        setStatus('error');
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
