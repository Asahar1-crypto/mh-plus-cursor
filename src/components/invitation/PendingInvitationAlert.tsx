
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasPendingInvitations } from '@/utils/notifications';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { PendingInvitationRecord } from '@/contexts/auth/services/invitation/types';

const PendingInvitationAlert = () => {
  const [dismissed, setDismissed] = useState(false);
  const [invitations, setInvitations] = useState<Record<string, PendingInvitationRecord>>({});
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    // Check for invitations when component loads
    checkForInvitations();
    
    // Check for invitations every 15 seconds
    const interval = setInterval(checkForInvitations, 15000);
    
    return () => clearInterval(interval);
  }, [user]);
  
  const checkForInvitations = () => {
    if (!user) return;
    
    const pendingInvitationsData = localStorage.getItem('pendingInvitations');
    if (!pendingInvitationsData) return;
    
    try {
      const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
      
      // Check if there are invitations for the current user
      const currentUserInvitations: Record<string, PendingInvitationRecord> = {};
      let hasInvitationsForCurrentUser = false;
      
      Object.entries(pendingInvitations).forEach(([invitationId, invitation]) => {
        // Case-insensitive email comparison
        if (invitation.sharedWithEmail && 
            user.email && 
            invitation.sharedWithEmail.toLowerCase() === user.email.toLowerCase()) {
          currentUserInvitations[invitationId] = invitation;
          hasInvitationsForCurrentUser = true;
        }
      });
      
      if (hasInvitationsForCurrentUser) {
        console.log('Found pending invitations for the current user:', currentUserInvitations);
        setInvitations(currentUserInvitations);
      }
    } catch (error) {
      console.error('Failed to parse pending invitations:', error);
    }
  };
  
  // If user is not logged in, or there are no invitations, or alert was dismissed, don't show anything
  if (!user || Object.keys(invitations).length === 0 || dismissed) {
    return null;
  }
  
  // Get the first invitation to display
  const firstInvitationId = Object.keys(invitations)[0];
  const firstInvitation = invitations[firstInvitationId];
  
  if (!firstInvitationId || !firstInvitation) {
    return null;
  }
  
  const handleViewInvitation = () => {
    navigate(`/invitation/${firstInvitationId}`);
    setDismissed(true);
  };
  
  const handleDismiss = () => {
    setDismissed(true);
    // Show a smaller notification that disappears after a short time
    toast.info('הזמנה ממתינה לאישור', {
      description: 'תמיד תוכל לגשת להזמנות בעמוד הגדרות החשבון',
      duration: 5000
    });
  };
  
  return (
    <Alert className="mb-6 bg-blue-50 border-blue-200 flex items-center justify-between">
      <div className="flex items-center">
        <Bell className="h-5 w-5 text-blue-500 mr-2" />
        <AlertDescription>
          יש לך הזמנה לחשבון משותף מ-{firstInvitation.ownerName || 'משתמש'} לחשבון {firstInvitation.name || 'חשבון משותף'}
        </AlertDescription>
      </div>
      <div className="flex space-x-2 rtl:space-x-reverse">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDismiss}
          className="text-gray-500 border-gray-300 hover:bg-gray-100"
        >
          סגור
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleViewInvitation}
          className="bg-blue-500 hover:bg-blue-600"
        >
          צפה בהזמנה
        </Button>
      </div>
    </Alert>
  );
};

export default PendingInvitationAlert;
