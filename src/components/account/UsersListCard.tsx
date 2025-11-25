import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, XCircle, Loader2, Crown, UserCheck } from 'lucide-react';
import { Account, AccountMember } from '@/contexts/auth/types';
import { User as UserType } from '@/contexts/auth/types';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { memberService } from '@/contexts/auth/services/account/memberService';

interface UsersListCardProps {
  account: Account | null;
  user: UserType | null;
  onRemovePartner: () => Promise<void>;
  isLoading?: boolean;
}

const UsersListCard: React.FC<UsersListCardProps> = ({ account, user, onRemovePartner, isLoading }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<AccountMember | null>(null);

  // Load account members
  useEffect(() => {
    const loadMembers = async () => {
      if (!account?.id) return;
      
      setMembersLoading(true);
      try {
        const accountMembers = await memberService.getAccountMembers(account.id);
        setMembers(accountMembers);
      } catch (error) {
        console.error('Failed to load account members:', error);
        toast.error('שגיאה בטעינת חברי החשבון');
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, [account?.id]);

  const handleRemoveMember = async (member: AccountMember) => {
    if (!account?.id || !member.user_id) return;
    
    setIsRemoving(true);
    try {
      await memberService.removeMember(account.id, member.user_id);
      // Refresh members list
      const updatedMembers = await memberService.getAccountMembers(account.id);
      setMembers(updatedMembers);
      toast.success('החבר הוסר בהצלחה מהחשבון');
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error(error.message || 'שגיאה בהסרת החבר מהחשבון');
    } finally {
      setIsRemoving(false);
      setShowConfirmDialog(false);
      setMemberToRemove(null);
    }
  };

  const getRoleIcon = (role: 'admin' | 'member') => {
    return role === 'admin' ? (
      <Crown className="h-4 w-4 text-yellow-600" />
    ) : (
      <UserCheck className="h-4 w-4 text-blue-600" />
    );
  };

  const getRoleBadge = (role: 'admin' | 'member') => {
    return role === 'admin' ? (
      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">
        <Crown className="h-3 w-3" />
        מנהל
      </span>
    ) : (
      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
        <UserCheck className="h-3 w-3" />
        חבר
      </span>
    );
  };

  const canRemoveMember = (member: AccountMember) => {
    // Can't remove yourself
    if (member.user_id === user?.id) return false;
    // Only admins can remove members
    if (account?.userRole !== 'admin') return false;
    // Can't remove the last admin
    if (member.role === 'admin') {
      const adminCount = members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) return false;
    }
    return true;
  };

  if (!account || !user) return null;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">חברי החשבון</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          רשימת כל המשתמשים שיש להם גישה לחשבון זה
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {membersLoading ? (
          <div className="flex items-center justify-center p-6 sm:p-8">
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
            <span className="mr-2 text-sm">טוען חברי חשבון...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center p-6 sm:p-8 text-muted-foreground">
            <User className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm">אין חברים בחשבון זה</p>
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            {members.map((member) => (
              <div key={member.user_id} className="p-3 sm:p-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm sm:text-base truncate">{member.user_name}</p>
                      {member.user_id === user?.id && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">(אתה)</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      הצטרף ב-{new Date(member.joined_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full xs:w-auto">
                  {getRoleBadge(member.role)}
                  
                  {canRemoveMember(member) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive border-destructive hover:bg-destructive/10 flex-1 xs:flex-none h-8 text-xs"
                      disabled={isRemoving || isLoading}
                      onClick={() => {
                        setMemberToRemove(member);
                        setShowConfirmDialog(true);
                      }}
                    >
                      {isRemoving && memberToRemove?.user_id === member.user_id ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                          הסר
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תסיר את {memberToRemove?.user_name} מהחשבון.
                המשתמש יאבד גישה לכל הנתונים של החשבון.
                לא ניתן לבטל פעולה זו לאחר הביצוע.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
                ביטול
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => memberToRemove && handleRemoveMember(memberToRemove)} 
                disabled={isRemoving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> מסיר...
                  </>
                ) : (
                  'הסר חבר'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default UsersListCard;