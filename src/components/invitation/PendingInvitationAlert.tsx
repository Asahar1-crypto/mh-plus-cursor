
import React, { useState, useEffect, useRef } from 'react';
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
  const [checkPerformed, setCheckPerformed] = useState(false);
  const checkTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    // Check for invitations only once when component loads
    if (user?.email && !checkPerformed) {
      checkForInvitations();
      setCheckPerformed(true);
      setLoading(false);
    } else if (!user) {
      setLoading(true);
    }
    
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [user, checkPerformed]);
  
  const checkForInvitations = async () => {
    if (!user?.email) return;
    
    try {
      console.log("PendingInvitationAlert: Checking for pending invitations for", user.email);
      
      // Check database for invitations with explicit conditions
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          invitation_id,
          email,
          account_id,
          accounts (
            id,
            name,
            owner_id
          )
        `)
        .eq('email', user.email.toLowerCase())
        .is('accepted_at', null) // Must not be accepted
        .gt('expires_at', 'now()'); // Must not be expired
      
      if (error) {
        console.error('PendingInvitationAlert: Error fetching invitations:', error);
        return;
      }
      
      // Only update state if there's a change in invitations
      if (data && Array.isArray(data)) {
        console.log('PendingInvitationAlert: Found pending invitations:', data);

        // Filter out invitations with missing account data
        const validInvitations = data.filter(invitation => {
          // Check if accounts data exists and has required properties
          if (!invitation || !invitation.account_id) {
            return false;
          }
          
          // If accounts data is missing, try to fetch it separately
          if (!invitation.accounts || !invitation.accounts.id) {
            console.log("PendingInvitationAlert: Missing account data for invitation:", invitation.invitation_id);
            return false;
          }
          
          return true;
        });

        // Set invitations in state
        setInvitations(validInvitations);
        
        // Ensure the UI is not in dismissed state if there are invitations
        if (dismissed && validInvitations.length > 0) {
          setDismissed(false);
        }
      } else {
        // No invitations found or invalid data format
        console.log('PendingInvitationAlert: No valid invitations found');
        setInvitations([]);
      }
    } catch (error) {
      console.error('PendingInvitationAlert: Error checking for invitations:', error);
      // Set empty array in case of error
      setInvitations([]);
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
  
  // Fetch owner profile information for display
  const fetchOwnerProfile = async () => {
    if (!firstInvitation.accounts?.owner_id) return 'בעל החשבון';
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', firstInvitation.accounts.owner_id)
        .maybeSingle();
        
      return data && data.name ? data.name : 'בעל החשבון';
    } catch (err) {
      console.error('Error fetching owner profile:', err);
      return 'בעל החשבון';
    }
  };
  
  // Extract account name from the data
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
  
  // Get owner name using a React useState with initial value
  const [ownerName, setOwnerName] = useState<string>('בעל החשבון');
  
  // Fetch the owner's name when component renders
  useEffect(() => {
    if (firstInvitation?.accounts?.owner_id) {
      fetchOwnerProfile().then(name => setOwnerName(name));
    }
  }, [firstInvitation]);
  
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
