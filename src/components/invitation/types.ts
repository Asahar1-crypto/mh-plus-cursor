
export interface InvitationDetails {
  ownerName: string;
  accountName: string;
  email: string;
}

export interface InvitationData {
  id: string;
  email: string;
  invitation_id: string;
  account_id: string;
  accounts: {
    id: string;
    name: string;
    owner_id: string;
  };
  owner_profile?: {
    name: string;
  };
}
