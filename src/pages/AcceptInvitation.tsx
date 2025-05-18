
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { InvitationDetails } from '@/components/invitation/types';
import { toast } from 'sonner';
import { debugInvitations } from '@/utils/notifications';

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
  
  // Debug function that displays invitation storage status to help troubleshoot
  const debugInvitationStatus = () => {
    debugInvitations();
    toast.info('בדיקת נתוני הזמנה בוצעה. בדוק את הקונסול לפרטים.');
  };
  
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
        
        // First try to get basic invitation info from the database
        console.log("Querying database for invitation details");
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
          .gt('expires_at', 'now()');
          
        if (error) {
          console.error("Error fetching invitation from Supabase:", error);
          throw new Error('לא נמצאה הזמנה תקפה במערכת');
        }
        
        if (!invitation || invitation.length === 0) {
          console.log("No active invitation found in database, checking localStorage...");
          throw new Error("הזמנה לא נמצאה בבסיס הנתונים");
        }
        
        const invitationRecord = invitation[0];
        console.log("Found invitation in database:", invitationRecord);
        
        if (!invitationRecord.accounts) {
          console.error("Invitation found but account data is missing");
          throw new Error("הזמנה לא תקפה או שפג תוקפה");
        }
        
        // Get owner profile
        let ownerName = 'בעל החשבון';
        
        if (invitationRecord.accounts.owner_id) {
          console.log("Fetching owner profile information");
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', invitationRecord.accounts.owner_id)
            .single();
            
          if (ownerData) {
            ownerName = ownerData.name || 'בעל החשבון';
          }
        }
        
        // Set invitation details
        setInvitationDetails({
          ownerName: ownerName,
          accountName: invitationRecord.accounts.name || 'חשבון משותף',
          email: invitationRecord.email || '',
        });
        
        // Store IDs in sessionStorage for later use during acceptance
        sessionStorage.setItem('pendingInvitationAccountId', invitationRecord.account_id);
        
        if (invitationRecord.accounts.owner_id) {
          sessionStorage.setItem('pendingInvitationOwnerId', invitationRecord.accounts.owner_id);
        }
        
        setStatus('success');
        
      } catch (dbError) {
        console.error('Error fetching invitation from database:', dbError);
        
        // Fallback to localStorage
        try {
          console.log("Checking localStorage for invitation");
          const pendingInvitationsData = localStorage.getItem('pendingInvitations');
          
          if (!pendingInvitationsData) {
            console.error("No invitations found in localStorage");
            setStatus('error');
            setErrorMessage('לא נמצאו הזמנות פעילות עבורך');
            return;
          }
          
          const pendingInvitations = JSON.parse(pendingInvitationsData);
          console.log("Invitations in localStorage:", pendingInvitations);
          
          if (!pendingInvitations || Object.keys(pendingInvitations).length === 0) {
            console.error("Empty invitations object in localStorage");
            setStatus('error');
            setErrorMessage('לא נמצאו הזמנות פעילות עבורך');
            return;
          }
          
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
    <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
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
      
      {/* Debug button - only shown in error state */}
      {status === 'error' && (
        <button 
          onClick={debugInvitationStatus}
          className="mt-4 text-sm text-gray-500 underline"
        >
          בדוק נתוני הזמנה (דיבאג)
        </button>
      )}
    </div>
  );
};

export default AcceptInvitation;
