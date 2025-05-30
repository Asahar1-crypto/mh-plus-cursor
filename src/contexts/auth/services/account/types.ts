
export interface AccountRPCResponse {
  id: string;
  name: string;
  owner_id: string;
}

export function isAccountRPCResponse(obj: any): obj is AccountRPCResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'owner_id' in obj
  );
}
