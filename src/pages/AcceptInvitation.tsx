
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, X } from 'lucide-react';

const AcceptInvitation = () => {
  const { invitationId } = useParams();
  const { isAuthenticated, acceptInvitation } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    // Simulate loading invitation data
    const timeout = setTimeout(() => {
      setStatus(invitationId ? 'success' : 'error');
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [invitationId]);
  
  const handleAccept = async () => {
    if (!invitationId) return;
    
    setIsProcessing(true);
    try {
      await acceptInvitation(invitationId);
      
      // In a real app, we would automatically add the user to the account
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDecline = () => {
    navigate('/');
  };
  
  if (status === 'loading') {
    return (
      <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
            </div>
            <p className="text-center mt-4">טוען את פרטי ההזמנה...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <X className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold">הזמנה לא תקפה</CardTitle>
            <CardDescription>
              ההזמנה שהתבקשת לקבל אינה קיימת או שפג תוקפה
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-2">
            <Button onClick={() => navigate('/')}>
              חזרה לדף הבית
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10 px-4 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">הוזמנת לחשבון משותף</CardTitle>
          <CardDescription>
            הוזמנת להצטרף לחשבון "מחציות פלוס" לניהול הוצאות משותפות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-medium mb-2">פרטי ההזמנה:</h3>
              <p className="text-sm"><strong>מזמין:</strong> ישראל ישראלי</p>
              <p className="text-sm"><strong>חשבון:</strong> משפחת ישראלי</p>
              <p className="text-sm"><strong>תפקיד:</strong> שותף בחשבון</p>
            </div>
            
            {!isAuthenticated && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800">
                <p>עליך להיות מחובר/ת כדי לקבל את ההזמנה הזו.</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate('/register')}>
                    הרשמה
                  </Button>
                  <Button size="sm" onClick={() => navigate('/login')}>
                    התחברות
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button variant="outline" onClick={handleDecline}>
            דחה הזמנה
          </Button>
          <Button onClick={handleAccept} disabled={!isAuthenticated || isProcessing}>
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                מקבל הזמנה...
              </span>
            ) : (
              'קבל הזמנה'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
