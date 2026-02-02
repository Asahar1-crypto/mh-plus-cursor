
export interface InvitationDetails {
  ownerName: string;
  accountName: string;
  email?: string;
  phoneNumber?: string;
  expires_at: string;
}

export interface InvitationData {
  id: string;
  email?: string;
  phone_number?: string;
  invitation_id: string;
  account_id: string;
  accounts: {
    id: string;
    name: string;
    owner_id: string;
    profiles?: {
      name?: string;
    };
  };
  owner_profile?: {
    name?: string;
  };
}
