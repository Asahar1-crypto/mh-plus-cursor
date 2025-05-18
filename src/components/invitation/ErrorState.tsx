
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import ClearInvitationsButton from './ClearInvitationsButton';

interface ErrorStateProps {
  message?: string;
}

const ErrorState = ({ message = 'ההזמנה לא נמצאה או שפג תוקפה' }: ErrorStateProps) => {
  const navigate = useNavigate();
  
  // Clear all invitation storage data on error
  const cleanupInvitationData = () => {
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    sessionStorage.removeItem('pendingInvitationOwnerId');
    sessionStorage.removeItem('currentInvitationDetails');
    sessionStorage.removeItem('pendingInvitationRedirectChecked');
  };
  
  return (
    <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <CardTitle className="text-2xl font-bold">{"אירעה שגיאה"}</CardTitle>
        <CardDescription>
          {message}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="mb-2 text-sm text-red-800">
              אם אתה מצפה להזמנה לחשבון משותף וחושב שזו טעות, אנא בקש מבעל החשבון לשלוח לך הזמנה חדשה.
            </p>
            <p className="text-sm text-red-800">
              לחלופין, אם אתה רואה שורה זו בטעות, נקה את רשימת ההזמנות ונסה שוב:
            </p>
          </div>
          
          <div className="mt-4">
            <ClearInvitationsButton redirectAfterClear={true} variant="destructive" className="w-full" />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={() => {
            cleanupInvitationData();
            navigate('/');
          }}
        >
          {"חזרה לדף הבית"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ErrorState;
