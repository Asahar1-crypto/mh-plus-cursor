
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  
  // Get invitations from localStorage
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  
  if (!pendingInvitationsData || dismissed) {
    return null;
  }
  
  let pendingInvitations: Record<string, any> = {};
  
  try {
    pendingInvitations = JSON.parse(pendingInvitationsData);
  } catch (error) {
    console.error('Failed to parse pending invitations:', error);
    return null;
  }
  
  // If there are no invitations in the parsed data, don't show anything
  if (!pendingInvitations || Object.keys(pendingInvitations).length === 0) {
    return null;
  }
  
  // Get the first invitation to display
  const firstInvitationId = Object.keys(pendingInvitations)[0];
  const firstInvitation = pendingInvitations[firstInvitationId];
  
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
