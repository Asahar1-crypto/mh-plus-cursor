
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Mail } from 'lucide-react';

const VerifyEmail = () => {
  const { state } = useLocation();
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  
  const email = state?.email || 'your email';
  
  // In a real app, we would get the token from URL params
  const mockToken = 'mock-verification-token';
  
  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const success = await verifyEmail(mockToken);
      if (success) {
        // In a real app, we would redirect to login after successful verification
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">אימות אימייל</CardTitle>
            <CardDescription>
              שלחנו לך אימייל אימות ל-{email}.<br />
              אנא לחץ על הקישור באימייל לאימות החשבון שלך.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center mb-4">
              לא קיבלת אימייל? בדוק בתיקיית הספאם או לחץ על הכפתור למטה לשליחה חוזרת.
            </p>
            
            {/* For demo purposes only - in a real app the verification would happen via email link */}
            <Button 
              variant="secondary" 
              className="w-full mb-2"
              onClick={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  מאמת...
                </span>
              ) : (
                'אמת חשבון (לצורכי הדגמה)'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {}}
            >
              שלח אימייל אימות שוב
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="link"
              className="text-sm text-muted-foreground"
              onClick={() => navigate('/login')}
            >
              חזרה למסך התחברות
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
