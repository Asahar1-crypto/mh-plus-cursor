
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

const PendingInvitationAlert = () => {
  const [dismissed, setDismissed] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    // Check for invitations immediately when component loads
    if (user?.email) {
      checkForInvitations();
      setLoading(false);
    } else {
      setLoading(true);
    }
    
    // Check for invitations more frequently to ensure notifications are shown
    const interval = setInterval(() => {
      if (user?.email) {
        checkForInvitations();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [user]);
  
  const checkForInvitations = async () => {
    if (!user?.email) return;
    
    try {
      console.log("PendingInvitationAlert: Checking for pending invitations for", user.email);
      
      // Check database for invitations
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          email,
          account_id,
          accounts (
            id,
            name,
            owner_id,
            profiles!owner_id (
              id,
              name
            )
          )
        `)
        .eq('email', user.email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
      
      if (error) {
        console.error('PendingInvitationAlert: Error fetching invitations:', error);
        return;
      }
      
      // Process database invitations
      if (data && data.length > 0) {
        console.log('PendingInvitationAlert: Found pending invitations in database:', data);
        setInvitations(data);
        
        // Ensure the UI is not in dismissed state if there are invitations
        if (dismissed && data.length > 0) {
          setDismissed(false);
        }
      } else {
        // No invitations found
        setInvitations([]);
      }
    } catch (error) {
      console.error('PendingInvitationAlert: Error checking for invitations:', error);
    }
  };
  
  // If user is not logged in, or there are no invitations, or alert was dismissed, don't show anything
  if (!user || invitations.length === 0 || dismissed || loading) {
    return null;
  }
  
  // Get the first invitation to display
  const firstInvitation = invitations[0];
  
  if (!firstInvitation || !firstInvitation.invitation_id) {
    return null;
  }
  
  // Extract owner and account names from the data
  const ownerName = firstInvitation.accounts?.profiles?.[0]?.name || 'בעל החשבון';
  const accountName = firstInvitation.accounts?.name || 'חשבון משותף';
  
  const handleViewInvitation = () => {
    navigate(`/invitation/${firstInvitation.invitation_id}`);
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
          יש לך הזמנה לחשבון משותף מ-{ownerName} לחשבון {accountName}
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
