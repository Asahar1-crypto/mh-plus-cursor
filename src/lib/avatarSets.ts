// Avatar Sets Configuration
// Each avatar set contains 4 roles: father, mother, son, daughter
// New avatar sets can be added here in the future

export type FamilyRole = 'father' | 'mother' | 'son' | 'daughter';

export interface AvatarSet {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  avatars: Record<FamilyRole, string>;
  preview: string; // The image used for the set preview (typically the father)
}

// All available avatar sets
export const AVATAR_SETS: AvatarSet[] = [
  {
    id: 'wallets',
    name: 'Wallets',
    nameHe: 'ארנקים',
    description: 'Cute wallet characters for the whole family',
    descriptionHe: 'דמויות ארנק חמודות לכל המשפחה',
    avatars: {
      father: '/avatars/wallets/father.png',
      mother: '/avatars/wallets/mother.png',
      son: '/avatars/wallets/son.png',
      daughter: '/avatars/wallets/daughter.png',
    },
    preview: '/avatars/wallets/father.png',
  },
];

// Default avatar set ID
export const DEFAULT_AVATAR_SET_ID = 'wallets';

/**
 * Get an avatar set by its ID
 */
export function getAvatarSet(setId: string): AvatarSet | undefined {
  return AVATAR_SETS.find((set) => set.id === setId);
}

/**
 * Get the avatar URL for a specific family role in a given set
 */
export function getAvatarUrl(setId: string, role: FamilyRole): string {
  const set = getAvatarSet(setId);
  if (!set) {
    // Fallback to default set
    const defaultSet = getAvatarSet(DEFAULT_AVATAR_SET_ID);
    return defaultSet?.avatars[role] || '';
  }
  return set.avatars[role];
}

/**
 * Get all avatars for a given set
 */
export function getAvatarSetAvatars(setId: string): Record<FamilyRole, string> | undefined {
  const set = getAvatarSet(setId);
  return set?.avatars;
}

/**
 * Family role labels in Hebrew
 */
export const FAMILY_ROLE_LABELS: Record<FamilyRole, string> = {
  father: 'אבא',
  mother: 'אמא',
  son: 'בן',
  daughter: 'בת',
};
