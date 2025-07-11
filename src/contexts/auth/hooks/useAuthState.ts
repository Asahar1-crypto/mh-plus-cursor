
import { useState, useCallback } from 'react';
import { User, Account, UserAccounts, Profile } from '../types';
import { authService } from '../authService';
import { invitationCheckService } from '../services/user/invitationCheckService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Custom hook for managing authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [userAccounts, setUserAccounts] = useState<UserAccounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<number>(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    }
  }, [user?.id]);

  const checkAndSetUserData = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    // Avoid multiple simultaneous checks with stronger protection
    const now = Date.now();
    if (!forceRefresh && (now - lastCheck < 2000 || isCheckingAuth)) {
      console.log('Skipping auth check - too soon since last check or already checking');
      return;
    }
    
    setLastCheck(now);
    setIsCheckingAuth(true);
    console.log('Checking auth state...');
    setIsLoading(true);
    
    try {
      const authResult = await authService.checkAuth();
      console.log('Auth check result:', { 
        user: authResult.user ? `${authResult.user.id} (${authResult.user.email})` : null, 
        account: authResult.account ? `${authResult.account.id} (${authResult.account.name})` : null,
        userAccounts: authResult.userAccounts ? 
          `${authResult.userAccounts.ownedAccounts.length} owned, ${authResult.userAccounts.sharedAccounts.length} shared` : null
      });
      
      setUser(authResult.user);
      setAccount(authResult.account);
      setUserAccounts(authResult.userAccounts);
      
      // Load profile data if user exists
      if (authResult.user?.id) {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authResult.user.id)
            .single();
          
          if (error) throw error;
          setProfile(profileData);
        } catch (error) {
          console.error('Error loading profile:', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      // Check for new invitations when user data is loaded - but only once
      if (authResult.user?.email && now - lastCheck > 5000) {
        setTimeout(async () => {
          try {
            await invitationCheckService.checkPendingInvitations(authResult.user.email);
          } catch (error) {
            console.error("Failed to check pending invitations:", error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to check auth state:", error);
      
      // Only show toast for non-network errors
      if (error instanceof Error && 
          !error.message.includes('network') && 
          !error.message.includes('connection')) {
        toast.error("שגיאה בבדיקת מצב ההתחברות");
      }
      
      // Clear state on critical errors
      setUser(null);
      setAccount(null);
      setUserAccounts(null);
    } finally {
      setIsLoading(false);
      setIsCheckingAuth(false);
    }
  }, [lastCheck, isCheckingAuth, refreshProfile]);

  return {
    user,
    setUser,
    profile,
    setProfile,
    account,
    setAccount,
    userAccounts,
    setUserAccounts,
    isLoading,
    setIsLoading,
    checkAndSetUserData,
    refreshProfile
  };
};
