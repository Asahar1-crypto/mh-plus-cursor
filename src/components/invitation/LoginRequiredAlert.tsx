
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface LoginRequiredAlertProps {
  email?: string;
  phoneNumber?: string;
  invitationId?: string;
}

const LoginRequiredAlert = ({ email, phoneNumber, invitationId }: LoginRequiredAlertProps) => {
  const navigate = useNavigate();
  
  const handleRegister = () => {
    const params = new URLSearchParams();
    if (invitationId) {
      params.set('invitationId', invitationId);
    }
    if (phoneNumber) {
      params.set('phone', phoneNumber);
    }
    if (email) {
      params.set('email', email);
    }
    
    // For phone-based invitations, go to family register
    if (phoneNumber) {
      navigate(`/family-register?${params.toString()}`);
    } else if (email && invitationId) {
      navigate(`/register?email=${encodeURIComponent(email)}&invitationId=${invitationId}`);
    } else {
      navigate('/register');
    }
  };
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800">
      <p>{"עליך להיות מחובר/ת כדי לקבל את ההזמנה הזו."}</p>
      <div className="mt-2 flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleRegister}
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
