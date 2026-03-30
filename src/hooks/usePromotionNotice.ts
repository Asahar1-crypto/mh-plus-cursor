import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Account } from '@/contexts/auth/types';

const STORAGE_KEY_PREFIX = 'vp_state_';

/**
 * Hook that detects when a virtual partner has been promoted to a real user
 * and shows a one-time notification toast to the admin.
 *
 * It tracks the previous virtual_partner_id per account in localStorage.
 * When the account transitions from having a virtual partner to not having one,
 * it checks if a new member was added and shows a congratulatory toast.
 */
export function usePromotionNotice(account: Account | null, userId: string | null) {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!account?.id || !userId || hasChecked.current) return;
    // Only run for admins (account owners)
    if (account.userRole !== 'admin') return;

    hasChecked.current = true;

    const storageKey = `${STORAGE_KEY_PREFIX}${account.id}`;
    const previousState = localStorage.getItem(storageKey);

    if (previousState) {
      try {
        const prev = JSON.parse(previousState);
        // Previously had a virtual partner, now doesn't
        if (prev.virtual_partner_id && !account.virtual_partner_id) {
          // Virtual partner was promoted! Find the new member.
          checkForNewMember(account.id, userId, prev.virtual_partner_name || '');
        }
      } catch {
        // Corrupted data, just update
      }
    }

    // Save current state for future comparison
    localStorage.setItem(storageKey, JSON.stringify({
      virtual_partner_id: account.virtual_partner_id || null,
      virtual_partner_name: account.virtual_partner_name || null,
      timestamp: Date.now(),
    }));
  }, [account?.id, account?.virtual_partner_id, userId]);
}

async function checkForNewMember(accountId: string, adminUserId: string, virtualPartnerName: string) {
  try {
    // Find the non-admin member who recently joined
    const { data: members } = await supabase
      .from('account_members')
      .select('user_id, joined_at')
      .eq('account_id', accountId)
      .neq('user_id', adminUserId)
      .order('joined_at', { ascending: false })
      .limit(1);

    if (!members || members.length === 0) return;

    const newMember = members[0];

    // Check if this member joined recently (within the last 7 days)
    const joinedAt = new Date(newMember.joined_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (joinedAt < sevenDaysAgo) return;

    // Check if we already showed this notification
    const noticeKey = `vp_promotion_noticed_${accountId}`;
    if (localStorage.getItem(noticeKey)) return;

    // Get the new member's name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', newMember.user_id)
      .single();

    const partnerName = profile?.name || virtualPartnerName || 'השותף/ה';

    // Count how many expenses were transferred (approximate: count expenses assigned to the new member)
    const { count: expensesCount } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('paid_by_id', newMember.user_id);

    const expensesText = expensesCount && expensesCount > 0
      ? ` ${expensesCount} הוצאות הועברו לחשבון שלו/ה.`
      : '';

    toast.success(
      `${partnerName} הצטרף/ה למשפחה!${expensesText}`,
      { duration: 10000 }
    );

    // Mark as noticed so we don't show it again
    localStorage.setItem(noticeKey, Date.now().toString());
  } catch (error) {
    console.error('usePromotionNotice: Error checking for new member:', error);
  }
}
