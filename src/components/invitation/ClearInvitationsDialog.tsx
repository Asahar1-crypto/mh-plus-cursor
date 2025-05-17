
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { clearAllPendingInvitations } from '@/utils/notifications';
import { useNavigate } from 'react-router-dom';

interface ClearInvitationsDialogProps {
  redirectTo?: string;
  buttonText?: string;
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
}

const ClearInvitationsDialog = ({
  redirectTo,
  buttonText = "נקה הזמנות לחשבון משותף",
  buttonVariant = 'destructive',
  buttonSize = 'default'
}: ClearInvitationsDialogProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClearInvitations = () => {
    clearAllPendingInvitations();
    setOpen(false);
    
    if (redirectTo) {
      // Redirect after cleaning invitations
      setTimeout(() => {
        navigate(redirectTo);
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className="flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ניקוי הזמנות לחשבון משותף
          </DialogTitle>
          <DialogDescription>
            פעולה זו תמחק את כל ההזמנות לחשבונות משותפים מהאחסון המקומי במכשיר זה. 
            אם תקבל הזמנות חדשות בעתיד, הן יתקבלו כרגיל.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            ביטול
          </Button>
          <Button variant="destructive" onClick={handleClearInvitations}>
            אישור ניקוי
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClearInvitationsDialog;
