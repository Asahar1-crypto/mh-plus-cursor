
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { User } from '@/contexts/auth/types';
import InvitationDetailsCard from './InvitationDetailsCard';
import LoginRequiredAlert from './LoginRequiredAlert';
import EmailMismatchAlert from './EmailMismatchAlert';

interface SuccessStateProps {
  invitationDetails: {
    ownerName: string;
    accountName: string;
    email: string;
  };
  invitationId: string;
  user: User | null;
  isAuthenticated: boolean;
  acceptInvitation: (invitationId: string) => Promise<void>;
}

const SuccessState = ({ 
  invitationDetails, 
  invitationId, 
  user, 
  isAuthenticated, 
  acceptInvitation
}: SuccessStateProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  
  const handleAccept = async () => {
    if (!invitationId) return;
    
    setIsProcessing(true);
    try {
      await acceptInvitation(invitationId);
      
      // Navigate to dashboard after successful acceptance
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error accepting invitation:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRegister = () => {
    // Navigate to registration page with email from invitation
    navigate(`/register?email=${encodeURIComponent(invitationDetails.email)}&invitationId=${invitationId}`);
  };
  
  // FIXED: Use case-insensitive email comparison
  const emailMismatch = isAuthenticated && user && invitationDetails && 
    user.email.toLowerCase() !== invitationDetails.email.toLowerCase();
  
  return (
    <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-500" />
        </div>
        <CardTitle className="text-2xl font-bold">{"הוזמנת לחשבון משותף"}</CardTitle>
        <CardDescription>
          {"הוזמנת להצטרף לחשבון \"מחציות פלוס\" לניהול הוצאות משותפות"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <InvitationDetailsCard 
            ownerName={invitationDetails.ownerName}
            accountName={invitationDetails.accountName}
            email={invitationDetails.email}
          />
          
          {!isAuthenticated && (
            <>
              <LoginRequiredAlert 
                email={invitationDetails.email} 
                invitationId={invitationId}
              />
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="mb-2 text-sm text-blue-800">אין לך חשבון? הירשם עכשיו עם האימייל מההזמנה:</p>
                <Button 
                  onClick={handleRegister} 
                  variant="outline" 
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  הירשם עם {invitationDetails.email}
                </Button>
              </div>
            </>
          )}
          
          {emailMismatch && user && (
            <EmailMismatchAlert 
              invitationEmail={invitationDetails.email} 
              userEmail={user.email} 
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => navigate('/')}>
          {"דחה הזמנה"}
        </Button>
        <Button 
          onClick={handleAccept}
          disabled={
            !isAuthenticated || 
            isProcessing || 
            emailMismatch
          }
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {"מקבל הזמנה..."}
            </span>
          ) : (
            "קבל הזמנה"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SuccessState;
