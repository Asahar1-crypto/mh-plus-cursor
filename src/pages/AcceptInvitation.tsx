
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { InvitationDetails } from '@/components/invitation/types';
import { toast } from 'sonner';
import { debugInvitations, clearAllPendingInvitations } from '@/utils/notifications';

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
  const navigate = useNavigate();
  // Flag to track if we've already fetched the invitation
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
  // Debug function that displays invitation status to help troubleshoot
  const debugInvitationStatus = () => {
    debugInvitations();
    toast.info('בדיקת נתוני הזמנה בוצעה. בדוק את הקונסול לפרטים.');
  };

  // Troubleshoot function to reset everything and go back to dashboard
  const resetAndGoBack = () => {
    clearAllPendingInvitations();
    toast.info('ניקיון בוצע, חוזר לדף הבית');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  };
  
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
    if (!isAuthenticated) {
      sessionStorage.setItem('pendingInvitationId', invitationId);
    }
    
    // Fetch invitation details
    const fetchInvitationDetails = async () => {
      try {
        setFetchAttempted(true);
        console.log(`Fetching invitation details for ID: ${invitationId}`);
        
        // Get invitation info from the database with improved query
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
              owner_id,
              profiles!accounts_owner_id_fkey (
                id,
                name
              )
            )
          `)
          .eq('invitation_id', invitationId)
          .is('accepted_at', null)
          .gt('expires_at', 'now()')
          .maybeSingle(); // Use maybeSingle to prevent errors when no data is found
          
        if (error) {
          console.error("Error fetching invitation from Supabase:", error);
          throw new Error('אירעה שגיאה בעת חיפוש ההזמנה: ' + error.message);
        }
        
        if (!invitation) {
          console.log("No active invitation found in database");
          throw new Error("הזמנה לא נמצאה או שפג תוקפה");
        }
        
        const invitationRecord = invitation;
        console.log("Found invitation in database:", invitationRecord);
        
        if (!invitationRecord.accounts || !invitationRecord.accounts.id) {
          console.error("Invitation found but account data is missing or incomplete");
          throw new Error("הזמנה לא תקפה - חסרים פרטי חשבון");
        }
        
        // Get owner name from the nested profiles data
        let ownerName = 'בעל החשבון';
        
        // Handle different profile data structures
        if (invitationRecord.accounts.profiles) {
          if (Array.isArray(invitationRecord.accounts.profiles)) {
            if (invitationRecord.accounts.profiles.length > 0) {
              ownerName = invitationRecord.accounts.profiles[0]?.name || 'בעל החשבון';
            }
          } else if (typeof invitationRecord.accounts.profiles === 'object' && invitationRecord.accounts.profiles) {
            ownerName = invitationRecord.accounts.profiles.name || 'בעל החשבון';
          }
        }
        
        // Set invitation details
        setInvitationDetails({
          ownerName: ownerName,
          accountName: invitationRecord.accounts.name || 'חשבון משותף',
          email: invitationRecord.email || '',
        });
        
        // Store the account ID and owner ID in sessionStorage for use during acceptance
        if (invitationRecord.account_id) {
          sessionStorage.setItem('pendingInvitationAccountId', invitationRecord.account_id);
        }
        
        if (invitationRecord.accounts.owner_id) {
          sessionStorage.setItem('pendingInvitationOwnerId', invitationRecord.accounts.owner_id);
        }
        
        // Store full details in sessionStorage for debugging
        sessionStorage.setItem('currentInvitationDetails', JSON.stringify(invitationRecord));
        
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
  }, [invitationId, isAuthenticated, fetchAttempted, navigate]);
  
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
      
      {/* Debug buttons - only shown in error state */}
      {status === 'error' && (
        <div className="flex flex-col gap-2 mt-4">
          <button 
            onClick={debugInvitationStatus}
            className="text-sm text-gray-500 underline"
          >
            בדוק נתוני הזמנה (דיבאג)
          </button>
          <button 
            onClick={resetAndGoBack}
            className="mt-2 text-sm text-red-500 underline"
          >
            נקה נתונים וחזור לדף הבית
          </button>
        </div>
      )}
    </div>
  );
};

export default AcceptInvitation;
