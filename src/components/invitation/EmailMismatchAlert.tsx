
import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";

interface EmailMismatchAlertProps {
  invitationEmail: string;
  userEmail: string;
}

const EmailMismatchAlert = ({ invitationEmail, userEmail }: EmailMismatchAlertProps) => {
  return (
    <div className="bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
      <p>{"ההזמנה מיועדת לכתובת"} {invitationEmail} {"אך אתה מחובר עם"} {userEmail}.</p>
      <div className="mt-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="border-red-300 text-red-700"
          onClick={async () => {
            // התנתקות מהחשבון הנוכחי
            await supabase.auth.signOut();
            window.location.reload();
          }}
        >
          {"התנתק וחזור להזמנה"}
        </Button>
      </div>
    </div>
  );
};

export default EmailMismatchAlert;
