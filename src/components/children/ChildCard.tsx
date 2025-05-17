
import React, { useState } from 'react';
import { format } from 'date-fns';
import { UserPlus } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Child } from '@/contexts/ExpenseContext';

interface ChildCardProps {
  child: Child;
}

const ChildCard: React.FC<ChildCardProps> = ({ child }) => {
  const { sendInvitation } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  
  const handleSendInvitation = async () => {
    if (!email) return;
    
    setIsPending(true);
    try {
      await sendInvitation(email);
      setEmail('');
      setShowInvite(false);
    } finally {
      setIsPending(false);
    }
  };
  
  // Calculate age
  const birthDate = new Date(child.birthDate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>{child.name}</CardTitle>
        <CardDescription>
          {format(new Date(child.birthDate), 'dd/MM/yyyy')} ({age} שנים)
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">הוצאות החודש:</span>
            <span>₪0.00</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">הוצאות קבועות:</span>
            <span>₪0.00 / חודש</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        {showInvite ? (
          <div className="w-full space-y-2">
            <div className="flex gap-2">
              <Input 
                placeholder="דוא״ל של ההורה השני" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button 
                size="sm" 
                onClick={handleSendInvitation}
                disabled={!email || isPending}
              >
                {isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  'שלח'
                )}
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => setShowInvite(false)}
            >
              ביטול
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowInvite(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            הזמן הורה נוסף
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ChildCard;
