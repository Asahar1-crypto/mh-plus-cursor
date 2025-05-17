
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const { verifyEmail, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const email = location.state?.email || '';
  const token = searchParams.get('token');
  
  useEffect(() => {
    // If we have a token, verify email
    if (token) {
      verifyEmailWithToken(token);
    }
    
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated) {
      // Check if we have pending invitations from registration
      const pendingInvitationsData = localStorage.getItem('pendingInvitationsAfterRegistration');
      if (pendingInvitationsData) {
        // We'll redirect to dashboard and the automatic linking will happen there
        navigate('/dashboard');
      }
    }
  }, [token, isAuthenticated]);
  
  const verifyEmailWithToken = async (token: string) => {
    setIsVerifying(true);
    try {
      const result = await verifyEmail(token);
      setVerificationStatus(result ? 'success' : 'error');
      
      // If verification was successful, redirect to login
      if (result) {
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
      <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          {token ? (
            <>
              {verificationStatus === 'pending' && (
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {verificationStatus === 'success' && (
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              )}
              {verificationStatus === 'error' && (
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
              )}
              <CardTitle className="text-2xl font-bold">
                {verificationStatus === 'pending' && 'מאמת את האימייל...'}
                {verificationStatus === 'success' && 'האימייל אומת בהצלחה'}
                {verificationStatus === 'error' && 'אימות האימייל נכשל'}
              </CardTitle>
              <CardDescription>
                {verificationStatus === 'pending' && 'אנא המתן בזמן שאנו מאמתים את האימייל שלך.'}
                {verificationStatus === 'success' && 'תודה על אימות האימייל. מעביר אותך למסך ההתחברות...'}
                {verificationStatus === 'error' && 'לא הצלחנו לאמת את האימייל שלך. אנא נסה שוב או צור קשר עם התמיכה.'}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle className="text-2xl font-bold">בדוק את האימייל שלך</CardTitle>
              <CardDescription>
                שלחנו הוראות לאימות חשבונך אל {email || 'האימייל שסיפקת'}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!token && (
            <div className="text-center text-muted-foreground">
              <p>לא קיבלת אימייל? בדוק את תיבת הספאם שלך או חזור למסך ההרשמה ונסה שוב.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => navigate('/login')} 
            variant="outline"
            disabled={isVerifying}
          >
            חזרה למסך ההתחברות
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmail;
