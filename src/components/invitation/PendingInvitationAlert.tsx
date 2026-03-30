
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

const POLL_INTERVAL_MS = 15_000;

const PendingInvitationAlert = () => {
  const [dismissed, setDismissed] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualChecking, setManualChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.email) {
      setLoading(true);
      setInvitations([]);
      return;
    }

    // Initial check
    checkForInvitations().then(() => setLoading(false));

    // Poll every 15 seconds
    intervalRef.current = setInterval(() => {
      checkForInvitations();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.email, user?.id]);
  
  const checkForInvitations = async () => {
    if (!user?.email) return;
    
    try {
      // Get user's phone from profile
      let userPhone: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_e164')
          .eq('id', user.id)
          .single();
        userPhone = profile?.phone_e164;
      }
      
      // Build query to check both email and phone invitations
      let query = supabase
        .from('invitations')
        .select('*')
        .is('accepted_at', null)
        .gt('expires_at', 'now()');
      
      // Check by email OR phone — use separate safe queries to avoid filter injection
      let rawInvitations: any[] | null = null;
      let error: any = null;

      if (user?.email && userPhone) {
        const { data: byEmail, error: e1 } = await supabase
          .from('invitations')
          .select('*')
          .is('accepted_at', null)
          .gt('expires_at', 'now()')
          .eq('email', user.email.toLowerCase());
        const { data: byPhone, error: e2 } = await supabase
          .from('invitations')
          .select('*')
          .is('accepted_at', null)
          .gt('expires_at', 'now()')
          .eq('phone_number', userPhone);
        error = e1 || e2;
        // Deduplicate by invitation_id
        const map = new Map<string, any>();
        [...(byEmail || []), ...(byPhone || [])].forEach(inv => map.set(inv.invitation_id, inv));
        rawInvitations = Array.from(map.values());
      } else if (user?.email) {
        query = query.eq('email', user.email.toLowerCase());
        const result = await query;
        rawInvitations = result.data;
        error = result.error;
      } else if (userPhone) {
        query = query.eq('phone_number', userPhone);
        const result = await query;
        rawInvitations = result.data;
        error = result.error;
      } else {
        const result = await query;
        rawInvitations = result.data;
        error = result.error;
      }
      
      if (error) {
        console.error('PendingInvitationAlert: Error fetching invitations:', error);
        return;
      }
      
      if (!rawInvitations || rawInvitations.length === 0) {
        setInvitations([]);
        return;
      }

      // For each invitation, try to get account data but don't filter out if missing
      const enrichedInvitations = await Promise.all(
        rawInvitations.map(async (invitation) => {
          try {
            const { data: accountData } = await supabase
              .from('accounts')
              .select(`
                id,
                name,
                owner_id,
                profiles!accounts_owner_id_fkey (
                  name
                )
              `)
              .eq('id', invitation.account_id)
              .single();

            return {
              ...invitation,
              accounts: accountData || {
                id: invitation.account_id,
                name: 'חשבון שותף',
                owner_id: null,
                profiles: { name: 'בעל החשבון' }
              }
            };
          } catch (err) {
            // Return invitation with fallback data instead of filtering out
            return {
              ...invitation,
              accounts: {
                id: invitation.account_id,
                name: 'חשבון שותף',
                owner_id: null,
                profiles: { name: 'בעל החשבון' }
              }
            };
          }
        })
      );

      setInvitations(enrichedInvitations);
      
      if (dismissed && enrichedInvitations.length > 0) {
        setDismissed(false);
      }
    } catch (error) {
      console.error('PendingInvitationAlert: Error checking for invitations:', error);
      setInvitations([]);
    }
  };
  
  const handleManualCheck = async () => {
    setManualChecking(true);
    await checkForInvitations();
    setManualChecking(false);
  };

  if (!user || invitations.length === 0 || dismissed || loading) {
    return null;
  }
  
  const firstInvitation = invitations[0];
  
  if (!firstInvitation || !firstInvitation.invitation_id) {
    return null;
  }
  
  const ownerName = firstInvitation.accounts?.profiles?.name || 'בעל החשבון';
  const accountName = firstInvitation.accounts?.name || 'חשבון משותף';
  
  const handleViewInvitation = () => {
    if (!firstInvitation.invitation_id) {
      return;
    }
    
    // Use family-invitation for SMS invitations, regular invitation for email
    const isPhoneInvitation = !!firstInvitation.phone_number;
    const path = isPhoneInvitation 
      ? `/family-invitation?invitationId=${firstInvitation.invitation_id}`
      : `/invitation/${firstInvitation.invitation_id}`;
    
    setDismissed(true);
    navigate(path);
  };
  
  const handleDismiss = () => {
    setDismissed(true);
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
          variant="ghost"
          size="sm"
          onClick={handleManualCheck}
          disabled={manualChecking}
          className="text-blue-500 hover:bg-blue-100"
          title="בדוק שוב"
        >
          <RefreshCw className={`h-4 w-4 ${manualChecking ? 'animate-spin' : ''}`} />
          <span className="mr-1">בדוק שוב</span>
        </Button>
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
