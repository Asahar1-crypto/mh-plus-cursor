import { useAuth } from '@/contexts/auth';
import { getAvatarSet, getAvatarUrl, DEFAULT_AVATAR_SET_ID, type FamilyRole, type AvatarSet } from '@/lib/avatarSets';

/**
 * Hook to get the current family's avatar set and helpers
 */
export function useAvatarSet() {
  const { account } = useAuth();
  
  const avatarSetId = account?.avatar_set || DEFAULT_AVATAR_SET_ID;
  const avatarSet = getAvatarSet(avatarSetId);

  /**
   * Get the avatar URL for a specific family role
   */
  const getAvatar = (role: FamilyRole): string => {
    return getAvatarUrl(avatarSetId, role);
  };

  return {
    avatarSetId,
    avatarSet,
    getAvatar,
  };
}
