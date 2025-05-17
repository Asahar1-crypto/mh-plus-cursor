
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LoginRequiredAlert = () => {
  const navigate = useNavigate();
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800">
      <p>{"עליך להיות מחובר/ת כדי לקבל את ההזמנה הזו."}</p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => navigate('/register')}>
          {"הרשמה"}
        </Button>
        <Button 
          size="sm" 
          onClick={() => {
            // Store the invitation ID to redirect back after login
            const invitationId = window.location.pathname.split('/').pop();
            if (invitationId) {
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
