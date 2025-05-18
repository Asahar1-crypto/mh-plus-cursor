
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { debugInvitations, clearAllPendingInvitations } from '@/utils/notifications';

interface DebugButtonsProps {
  show: boolean;
}

const DebugButtons: React.FC<DebugButtonsProps> = ({ show }) => {
  const navigate = useNavigate();
  
  if (!show) return null;
  
  // Debug function that displays invitation status to help troubleshoot
  const debugInvitationStatus = () => {
    debugInvitations();
    toast.info('בדיקת נתוני הזמנה בוצעה. בדוק את הקונסול לפרטים.');
  };

  // Troubleshoot function to reset everything and go back to dashboard
  const resetAndGoBack = () => {
    clearAllPendingInvitations();
    toast.info('ניקיון בוצע, חוזר לדף הבית');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  };
  
  return (
    <div className="flex flex-col gap-2 mt-4">
      <button 
        onClick={debugInvitationStatus}
        className="text-sm text-gray-500 underline"
      >
        בדוק נתוני הזמנה (דיבאג)
      </button>
      <button 
        onClick={resetAndGoBack}
        className="mt-2 text-sm text-red-500 underline"
      >
        נקה נתונים וחזור לדף הבית
      </button>
    </div>
  );
};

export default DebugButtons;
