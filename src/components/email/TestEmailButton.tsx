
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { sendTestEmail } from '@/utils/emailService';
import { Loader2 } from 'lucide-react';

interface TestEmailButtonProps {
  email: string;
}

const TestEmailButton: React.FC<TestEmailButtonProps> = ({ email }) => {
  const [isSending, setIsSending] = useState(false);

  const handleSendTestEmail = async () => {
    if (isSending) return;
    
    setIsSending(true);
    try {
      await sendTestEmail(email);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button 
      onClick={handleSendTestEmail} 
      disabled={isSending}
      variant="secondary"
    >
      {isSending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          שולח אימייל בדיקה...
        </>
      ) : 'שלח אימייל בדיקה'}
    </Button>
  );
};

export default TestEmailButton;
