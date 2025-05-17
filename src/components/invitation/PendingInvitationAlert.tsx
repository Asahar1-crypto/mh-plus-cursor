
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasPendingInvitations } from '@/utils/notifications';
import { useAuth } from '@/contexts/auth';

interface PendingInvitation {
  invitationId: string;
  accountId: string;
  accountName: string;
  ownerId: string;
}

interface PendingInvitations {
  email: string;
  invitations: PendingInvitation[];
}

const PendingInvitationAlert = () => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // אם המשתמש לא מחובר או אין הזמנות או שהמשתמש סגר את ההתראה, אין מה להציג
  if (!user || !hasPendingInvitations() || dismissed) {
    return null;
  }
  
  // קבלת ההזמנות מאחסון מקומי
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  
  if (!pendingInvitationsData) {
    return null;
  }
  
  let pendingInvitations: Record<string, any> = {};
  
  try {
    pendingInvitations = JSON.parse(pendingInvitationsData);
  } catch (error) {
    console.error('Failed to parse pending invitations:', error);
    return null;
  }
  
  // בדיקה אם יש הזמנות ששייכות למשתמש הנוכחי
  const currentUserInvitations: Record<string, any> = {};
  let hasInvitationsForCurrentUser = false;
  
  Object.entries(pendingInvitations).forEach(([invitationId, invitation]) => {
    // בודקים אם האימייל בהזמנה תואם לאימייל של המשתמש המחובר (ללא תלות ברישיות)
    if (invitation.sharedWithEmail && 
        user.email && 
        invitation.sharedWithEmail.toLowerCase() === user.email.toLowerCase()) {
      currentUserInvitations[invitationId] = invitation;
      hasInvitationsForCurrentUser = true;
    }
  });
  
  // אם אין הזמנות למשתמש הנוכחי, לא מציגים כלום
  if (!hasInvitationsForCurrentUser) {
    return null;
  }
  
  // מקבלים את ההזמנה הראשונה להצגה
  const firstInvitationId = Object.keys(currentUserInvitations)[0];
  const firstInvitation = currentUserInvitations[firstInvitationId];
  
  if (!firstInvitationId || !firstInvitation) {
    return null;
  }
  
  const handleViewInvitation = () => {
    navigate(`/invitation/${firstInvitationId}`);
    setDismissed(true);
  };
  
  const handleDismiss = () => {
    setDismissed(true);
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
