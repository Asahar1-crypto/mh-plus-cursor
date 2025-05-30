
export interface PendingInvitation {
  invitation_id: string;
  email: string;
  account_id: string;
  expires_at: string;
  accounts: {
    id: string;
    name: string;
    owner_id: string;
    profiles?: {
      name?: string;
    };
  };
}
