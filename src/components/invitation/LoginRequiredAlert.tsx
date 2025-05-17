
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface LoginRequiredAlertProps {
  email?: string;
  invitationId?: string;
}

const LoginRequiredAlert = ({ email, invitationId }: LoginRequiredAlertProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800">
      <p>{"עליך להיות מחובר/ת כדי לקבל את ההזמנה הזו."}</p>
      <div className="mt-2 flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => {
            // If we have an email and invitationId, include them in the URL
            if (email && invitationId) {
              console.log(`Navigating to register with email=${email} and invitationId=${invitationId}`);
              navigate(`/register?email=${encodeURIComponent(email)}&invitationId=${invitationId}`);
            } else {
              navigate('/register');
            }
          }}
        >
          {"הרשמה"}
        </Button>
        <Button 
          size="sm" 
          onClick={() => {
            // Store the invitation ID to redirect back after login
            if (invitationId) {
              console.log(`Storing pendingInvitationId=${invitationId} in sessionStorage`);
              sessionStorage.setItem('pendingInvitationId', invitationId);
            }
            navigate('/login');
          }}
        >
          {"התחברות"}
        </Button>
      </div>
    </div>
  );
};

export default LoginRequiredAlert;
