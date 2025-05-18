
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useInvitationDetails } from '@/hooks/useInvitationDetails';

// Import the components
import LoadingState from '@/components/invitation/LoadingState';
import ErrorState from '@/components/invitation/ErrorState';
import SuccessState from '@/components/invitation/SuccessState';
import DebugButtons from '@/components/invitation/DebugButtons';

const AcceptInvitation = () => {
  const { invitationId } = useParams();
  const { user, isAuthenticated, acceptInvitation } = useAuth();
  const { status, invitationDetails, errorMessage } = useInvitationDetails(invitationId);
  
  return (
    <div className="container mx-auto py-10 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      {status === 'loading' && <LoadingState />}
      
      {status === 'error' && (
        <>
          <ErrorState message={errorMessage} />
          <DebugButtons show={true} />
        </>
      )}
      
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
