
import { InvitationDetails } from './types';

// Re-export the existing types for consistency
export type { InvitationDetails };

// Add additional helper types if needed in the future
export interface InvitationResponse {
  invitation: InvitationDetails;
  status: 'success' | 'error' | 'pending';
  message?: string;
}
