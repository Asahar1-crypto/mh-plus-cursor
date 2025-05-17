
// Standalone interfaces for invitation data structures to avoid circular references
export interface InvitationData {
  id: string;
  account_id: string;
  email: string;
  invitation_id: string;
}

export interface InvitationRecord {
  id: string;
  account_id: string;
  email: string;
  invitation_id: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface AccountRecord {
  id: string;
  name: string;
  owner_id: string;
  shared_with_email?: string;
  shared_with_id?: string;
  invitation_id?: string;
}

// Define a simple standalone type for pending invitations stored in localStorage
export type PendingInvitationRecord = {
  name: string;
  ownerName: string;
  sharedWithEmail: string;
  invitationId: string;
  accountId?: string;  // This field is now properly defined in the type
};
