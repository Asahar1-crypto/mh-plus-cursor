
/**
 * Type definitions for RPC function parameters and return types
 * This helps with TypeScript type checking for Supabase RPC calls
 */

// Accept invitation RPC types
export interface AcceptInvitationParams {
  invitation_id: string;
  user_id: string;
  email: string;
}

export interface AcceptInvitationResult {
  account_id: string;
  success: boolean;
  message?: string;
}

// Remove invitation RPC types
export interface RemoveInvitationParams {
  invitation_id: string;
}

export interface RemoveInvitationResult {
  success: boolean;
  message?: string;
}

// Send invitation RPC types
export interface SendInvitationParams {
  email: string;
  account_id: string;
  owner_id: string;
}

export interface SendInvitationResult {
  invitation_id: string;
  success: boolean;
  message?: string;
}
