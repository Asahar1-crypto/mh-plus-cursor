
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Profile {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  selected_account_id: string | null;
}

export interface Account {
  id: string;
  name: string;
  // Legacy fields (will be removed in future)
  ownerId?: string;
  sharedWithId?: string;
  sharedWithEmail?: string;
  sharedWithName?: string;
  ownerName?: string;
  invitationId?: string;
  isSharedAccount?: boolean;
  // New member-based fields
  members?: AccountMember[];
  userRole?: 'admin' | 'member';
}

export interface AccountMember {
  user_id: string;
  user_name: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface UserAccounts {
  ownedAccounts: Account[];
  sharedAccounts: Account[];
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  account: Account | null;
  userAccounts: UserAccounts | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendInvitation: (email: string) => Promise<void>;
  removeInvitation: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  updateAccountName: (newName: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
