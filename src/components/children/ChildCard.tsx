
import React, { useState } from 'react';
import { format } from 'date-fns';
import { UserPlus, Edit3 } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Child } from '@/contexts/ExpenseContext';
import EditChildForm from './EditChildForm';

interface ChildCardProps {
  child: Child;
}

const ChildCard: React.FC<ChildCardProps> = ({ child }) => {
  const { sendInvitation } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
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
    <Card className="group hover:scale-105 hover:shadow-2xl transition-all duration-500 animate-fade-in overflow-hidden relative bg-gradient-to-br from-card/90 to-card/95 backdrop-blur-lg border border-border/50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
      
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent truncate">
              {child.name}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {format(new Date(child.birthDate), 'dd/MM/yyyy')} ({age} שנים)
            </CardDescription>
          </div>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-primary/10 transition-colors duration-300">
                <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </Button>
            </DialogTrigger>
            <EditChildForm 
              child={child} 
              open={editDialogOpen} 
              setOpen={setEditDialogOpen} 
            />
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2 sm:pb-3 p-3 sm:p-4 relative z-10">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between p-2 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm rounded-lg border border-border/30 group-hover:border-primary/30 transition-colors duration-300">
            <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              הוצאות החודש:
            </span>
            <span className="text-xs sm:text-sm font-semibold">₪0.00</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm rounded-lg border border-border/30 group-hover:border-primary/30 transition-colors duration-300">
            <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
              הוצאות קבועות:
            </span>
            <span className="text-xs sm:text-sm font-semibold">₪0.00 / חודש</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 sm:pt-3 p-3 sm:p-4 relative z-10">
        {showInvite ? (
          <div className="w-full space-y-2 animate-fade-in">
            <div className="flex gap-2">
              <Input 
                placeholder="דוא״ל של ההורה השני" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
              <Button 
                size="sm" 
                onClick={handleSendInvitation}
                disabled={!email || isPending}
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              >
                {isPending ? (
                  <span className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  'שלח'
                )}
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-8 sm:h-9 text-xs sm:text-sm"
              onClick={() => setShowInvite(false)}
            >
              ביטול
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-8 sm:h-9 text-xs sm:text-sm bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border-border/50 hover:border-primary/50 transition-all duration-300 group-hover:shadow-md"
            onClick={() => setShowInvite(true)}
          >
            <UserPlus className="ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform duration-300" />
            הזמן הורה נוסף
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ChildCard;
