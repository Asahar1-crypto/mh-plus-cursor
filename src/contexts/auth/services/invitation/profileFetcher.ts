
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch owner profile for an account
 */
export const fetchOwnerProfile = async (ownerId: string): Promise<{ name: string }> => {
  if (!ownerId) {
    return { name: 'בעל החשבון' };
  }
  
  try {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', ownerId)
      .maybeSingle();
      
    if (ownerProfile && ownerProfile.name) {
      return { name: ownerProfile.name };
    }
  } catch (err) {
    console.error('Error fetching owner profile:', err);
  }
  
  return { name: 'בעל החשבון' };
};
