/**
 * Mascot Service
 *
 * Single source of truth for "given a (kind, pose), what asset do I render?".
 * The handoff spec defines 14 named poses for the blue mascot, but only 3 of
 * the new high-fidelity renders exist on disk today (happy, success, checking).
 * The rest fall back to either:
 *   1) Another available new-design mascot whose mood is closest, OR
 *   2) One of the 19 pre-existing illustrations in /illustrations/ (lower fi
 *      but covers semantically meaningful states like waiting, warning, error).
 *
 * Callers should NOT compute paths themselves — always go through
 * `resolveMascot()` so the fallback chain stays consistent and a future
 * batch of new renders can be plugged in by editing this file alone.
 */

export type MascotKind = 'blue' | 'orange' | 'teal' | 'pink' | 'family';

/**
 * 14 named blue-mascot poses from the design handoff + 'all' for the family
 * group shot. Adding a new pose? Add it here and in POSE_FILES below.
 */
export type MascotPose =
  | 'neutral'
  | 'happy'
  | 'success'
  | 'paymentDone'
  | 'thinking'
  | 'checking'
  | 'loading'
  | 'secure'
  | 'warning'
  | 'error'
  | 'waiting'
  | 'celebrate'
  | 'announce'
  | 'empty'
  | 'verified'
  | 'search'
  | 'all';

interface PoseSpec {
  /** Public-folder URL of the asset to render */
  url: string;
  /** Did we use a fallback because the requested pose has no native render? */
  fallback: boolean;
}

/**
 * The 3 new high-fidelity blue renders + the family group, freshly placed in
 * /public/mascots/ during Wave 2.
 */
const NEW_BLUE = {
  happy:    '/mascots/blue-happy.webp',
  success:  '/mascots/blue-success.webp',
  checking: '/mascots/blue-checking.webp',
} as const;

const FAMILY_HERO = '/mascots/family.webp';

/**
 * Pre-existing illustrations from /public/illustrations/ — 19 WebPs imported
 * earlier. Filename typos (`succes`, `paymantdone`, `organzinig`, `planing`)
 * are intentional — we agreed to keep filenames as-is. The mapping below
 * absorbs the inconsistency so callers always use clean names.
 */
const LEGACY_ILLO = {
  // Blue
  default:  '/illustrations/natural.webp',
  thinking: '/illustrations/thinking.webp',
  waiting:  '/illustrations/waiting.webp',
  warning:  '/illustrations/warning.webp',
  error:    '/illustrations/error.webp',
  approved: '/illustrations/succes.webp',       // sic — file is `succes.webp`
  security: '/illustrations/secure.webp',
  verified: '/illustrations/paymantdone.webp',  // sic — file is `paymantdone.webp`
  search:   '/illustrations/checking.webp',
  happyAlt: '/illustrations/Happy.webp',        // sic — capital H

  // Orange
  orangeDefault:    '/illustrations/mom.webp',
  orangeCalculator: '/illustrations/budget.webp',
  orangeChecklist:  '/illustrations/planing.webp',     // sic — file is `planing.webp`
  orangeOrganize:   '/illustrations/organzinig.webp',  // sic — file is `organzinig.webp`

  // Other characters
  tealCoin: '/illustrations/kid.webp',
  pinkHeart: '/illustrations/girl.webp',

  // Family groups
  familyNeutral: '/illustrations/family.webp',
  familyWarm:    '/illustrations/family2.webp',
  familyCool:    '/illustrations/family3.webp',
} as const;

/**
 * Pose lookup for the blue mascot. Each entry yields either a native
 * high-fi render (fallback: false) or a best-effort legacy illustration
 * (fallback: true). The fallback flag lets the renderer log usage so we
 * know which poses are most urgent to commission next.
 */
const BLUE_POSES: Record<MascotPose, PoseSpec | null> = {
  // Native renders
  happy:       { url: NEW_BLUE.happy,    fallback: false },
  success:     { url: NEW_BLUE.success,  fallback: false },
  checking:    { url: NEW_BLUE.checking, fallback: false },

  // Mapped to native render (semantic neighbors)
  neutral:     { url: NEW_BLUE.happy,    fallback: true },
  paymentDone: { url: NEW_BLUE.success,  fallback: true },
  loading:     { url: NEW_BLUE.checking, fallback: true },
  secure:      { url: LEGACY_ILLO.security, fallback: true },

  // Mapped to legacy illustrations
  thinking:    { url: LEGACY_ILLO.thinking, fallback: true },
  warning:     { url: LEGACY_ILLO.warning,  fallback: true },
  error:       { url: LEGACY_ILLO.error,    fallback: true },
  waiting:     { url: LEGACY_ILLO.waiting,  fallback: true },
  celebrate:   { url: LEGACY_ILLO.happyAlt, fallback: true },
  announce:    { url: LEGACY_ILLO.happyAlt, fallback: true },
  empty:       { url: LEGACY_ILLO.thinking, fallback: true },
  verified:    { url: LEGACY_ILLO.verified, fallback: true },
  search:      { url: LEGACY_ILLO.search,   fallback: true },

  all: null, // family-only
};

const ORANGE_POSES: Partial<Record<MascotPose, PoseSpec>> = {
  neutral:     { url: LEGACY_ILLO.orangeDefault,    fallback: false },
  happy:       { url: LEGACY_ILLO.orangeDefault,    fallback: false },
  thinking:    { url: LEGACY_ILLO.orangeCalculator, fallback: true },
  checking:    { url: LEGACY_ILLO.orangeChecklist,  fallback: false },
  // Orange-specific roles
  empty:       { url: LEGACY_ILLO.orangeOrganize,   fallback: false },
};

const TEAL_POSES: Partial<Record<MascotPose, PoseSpec>> = {
  neutral: { url: LEGACY_ILLO.tealCoin, fallback: false },
  happy:   { url: LEGACY_ILLO.tealCoin, fallback: false },
  success: { url: LEGACY_ILLO.tealCoin, fallback: true },
};

const PINK_POSES: Partial<Record<MascotPose, PoseSpec>> = {
  neutral: { url: LEGACY_ILLO.pinkHeart, fallback: false },
  happy:   { url: LEGACY_ILLO.pinkHeart, fallback: false },
  celebrate: { url: LEGACY_ILLO.pinkHeart, fallback: true },
};

const FAMILY_POSES: Partial<Record<MascotPose, PoseSpec>> = {
  all:     { url: FAMILY_HERO,                fallback: false },
  neutral: { url: LEGACY_ILLO.familyNeutral,  fallback: true },
  happy:   { url: LEGACY_ILLO.familyWarm,     fallback: true },
};

/**
 * Default ultimate fallback when a kind/pose combo has nothing useful.
 * Using the blue happy mascot keeps the layout from collapsing.
 */
const ULTIMATE_FALLBACK: PoseSpec = {
  url: NEW_BLUE.happy,
  fallback: true,
};

/**
 * Resolve a (kind, pose) request to a concrete asset.
 *
 * @returns object with `url` (string) and `fallback` (boolean — true means
 *   we used a substitute because the exact pose isn't rendered yet).
 */
export function resolveMascot(kind: MascotKind, pose: MascotPose): PoseSpec {
  switch (kind) {
    case 'blue':
      return BLUE_POSES[pose] ?? ULTIMATE_FALLBACK;
    case 'orange':
      return ORANGE_POSES[pose] ?? { url: LEGACY_ILLO.orangeDefault, fallback: true };
    case 'teal':
      return TEAL_POSES[pose] ?? { url: LEGACY_ILLO.tealCoin, fallback: true };
    case 'pink':
      return PINK_POSES[pose] ?? { url: LEGACY_ILLO.pinkHeart, fallback: true };
    case 'family':
      return FAMILY_POSES[pose] ?? { url: FAMILY_HERO, fallback: true };
  }
}
