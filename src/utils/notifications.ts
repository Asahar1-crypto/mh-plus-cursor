
import { toast } from 'sonner';
import { PendingInvitationRecord } from '@/contexts/auth/services/invitation/types';

/**
 * מציג התראה על הזמנה חדשה
 */
export const showInvitationNotification = (invitationId: string) => {
  // בדיקה אם יש פרטי הזמנה ב-localStorage
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    const invitation = pendingInvitations[invitationId];
    
    if (!invitation) return;
    
    // הצגת התראה עם פרטי ההזמנה
    toast.info(
      `יש לך הזמנה לחשבון משותף מ-${invitation.ownerName}!`,
      {
        description: `לצפייה בהזמנה וקבלתה: /invitation/${invitationId}`,
        duration: 15000,
        action: {
          label: "צפה בהזמנה",
          onClick: () => {
            window.location.href = `/invitation/${invitationId}`;
          }
        }
      }
    );
  } catch (error) {
    console.error('Failed to parse pending invitations:', error);
  }
};

/**
 * בודק אם יש הזמנות ממתינות למשתמש הנוכחי
 */
export const hasPendingInvitations = (currentUserEmail?: string): boolean => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return false;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    
    // אם לא סופק אימייל משתמש, נבדוק רק אם יש הזמנות כלשהן
    if (!currentUserEmail) {
      return Object.keys(pendingInvitations).length > 0;
    }
    
    // בדיקה אם יש הזמנה שמתאימה לאימייל המשתמש הנוכחי
    return Object.values(pendingInvitations).some(
      invitation => 
        invitation.sharedWithEmail && 
        invitation.sharedWithEmail.toLowerCase() === currentUserEmail.toLowerCase()
    );
  } catch (error) {
    console.error('Failed to parse pending invitations:', error);
    return false;
  }
};

/**
 * מסיר הזמנה ספציפית מ-localStorage
 */
export const removePendingInvitation = (invitationId: string): void => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    if (pendingInvitations[invitationId]) {
      delete pendingInvitations[invitationId];
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log(`Removed invitation ${invitationId} from localStorage`);
    }
  } catch (error) {
    console.error('Failed to remove pending invitation:', error);
  }
};

/**
 * מנקה הזמנות שלא מתאימות למשתמש הנוכחי
 */
export const clearInvalidInvitations = (currentUserEmail: string): void => {
  const pendingInvitationsData = localStorage.getItem('pendingInvitations');
  if (!pendingInvitationsData) return;
  
  try {
    const pendingInvitations = JSON.parse(pendingInvitationsData) as Record<string, PendingInvitationRecord>;
    let hasChanges = false;
    
    Object.entries(pendingInvitations).forEach(([invitationId, invitation]) => {
      // אם ההזמנה שייכת למשתמש אחר, מוחקים אותה
      if (invitation.sharedWithEmail && 
          invitation.sharedWithEmail.toLowerCase() !== currentUserEmail.toLowerCase()) {
        delete pendingInvitations[invitationId];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      console.log(`Cleared invalid invitations for user ${currentUserEmail}`);
    }
  } catch (error) {
    console.error('Failed to clear invalid invitations:', error);
  }
};

/**
 * מנקה את כל ההזמנות הממתינות
 */
export const clearAllPendingInvitations = (): void => {
  try {
    localStorage.removeItem('pendingInvitations');
    localStorage.removeItem('pendingInvitationsAfterRegistration');
    sessionStorage.removeItem('pendingInvitationId');
    sessionStorage.removeItem('pendingInvitationAccountId');
    console.log('All pending invitations cleared from storage');
    toast.success('רשימת ההזמנות נוקתה בהצלחה');
  } catch (error) {
    console.error('Failed to clear pending invitations:', error);
    toast.error('אירעה שגיאה בניקוי רשימת ההזמנות');
  }
};

/**
 * בדיקה אוטומטית של הזמנות חדשות
 */
export const checkForNewInvitations = async (email: string) => {
  if (!email) return;
  
  try {
    // ייבוא שירות בדיקת ההזמנות
    const { invitationCheckService } = await import('@/contexts/auth/services/user/invitationCheckService');
    
    // בדיקת הזמנות
    const invitations = await invitationCheckService.checkPendingInvitations(email);
    
    // אם יש הזמנות חדשות, מציג התראה
    if (invitations && invitations.length > 0) {
      const firstInvitation = invitations[0];
      if (firstInvitation.invitation_id) {
        showInvitationNotification(firstInvitation.invitation_id);
      }
    }
  } catch (error) {
    console.error('Failed to check for new invitations:', error);
  }
};
