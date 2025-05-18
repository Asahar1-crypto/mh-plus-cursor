
/**
 * Type definitions for RPC function parameters and returns
 */

export interface AcceptInvitationParams {
  p_invitation_id: string;
  p_user_id: string;
  p_user_email: string;
}

export interface AcceptInvitationReturn {
  success: boolean;
  account_id: string;
  invitation_id: string;
  owner_id: string;
}

export interface RemoveInvitationParams {
  p_account_id: string;
}

export interface RemoveInvitationReturn {
  success: boolean;
  account_id: string;
}

export interface CreateInvitationParams {
  p_email: string;
  p_account_id: string;
  p_invitation_id: string;
}

export interface CreateInvitationReturn {
  success: boolean;
  invitation_id: string;
  email: string;
  account_id: string;
}
