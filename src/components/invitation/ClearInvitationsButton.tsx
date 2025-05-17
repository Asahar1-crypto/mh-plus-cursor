
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { clearAllPendingInvitations } from '@/utils/notifications';
import { useNavigate } from 'react-router-dom';

interface ClearInvitationsButtonProps {
  redirectAfterClear?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string; // Added className property
}

const ClearInvitationsButton = ({ 
  redirectAfterClear = false,
  variant = 'destructive',
  size = 'sm',
  className = '' // Added default value
}: ClearInvitationsButtonProps) => {
  const navigate = useNavigate();
  
  const handleClearInvitations = () => {
    clearAllPendingInvitations();
    
    if (redirectAfterClear) {
      // Redirect to home page after cleaning invitations
      setTimeout(() => {
        navigate('/');
      }, 500);
    }
  };
  
  return (
    <Button 
      onClick={handleClearInvitations}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`} // Use the className prop
    >
      <Trash2 className="h-4 w-4" />
      נקה הזמנות
    </Button>
  );
};

export default ClearInvitationsButton;
