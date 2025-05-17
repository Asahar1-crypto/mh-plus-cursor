
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  ownerId: string;
  sharedWithId?: string;
  sharedWithEmail?: string;
  sharedWithName?: string;
  ownerName?: string;
  invitationId?: string;
  isSharedAccount?: boolean;
}

export interface AuthContextType {
  user: User | null;
  account: Account | null;
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
}
