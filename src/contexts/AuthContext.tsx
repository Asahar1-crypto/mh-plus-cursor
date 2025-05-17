import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  ownerId: string;
  sharedWithId?: string;
  sharedWithEmail?: string;
  invitationId?: string;
}

interface AuthContextType {
  user: User | null;
  account: Account | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  sendInvitation: (email: string) => Promise<void>;
  removeInvitation: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, this would verify the token with a server
        const savedUser = localStorage.getItem('user');
        const savedAccount = localStorage.getItem('account');
        
        if (savedUser && savedAccount) {
          setUser(JSON.parse(savedUser));
          setAccount(JSON.parse(savedAccount));
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('account');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock login - in a real app, this would be an API call
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful login
      const mockUser = {
        id: '12345',
        email: email,
        name: email.split('@')[0]
      };
      
      const mockAccount = {
        id: 'acc-12345',
        name: 'משפחת ' + mockUser.name,
        ownerId: mockUser.id
      };
      
      // Check if there's a pending invitation for this email
      const pendingAccounts = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      const invitationForUser = Object.values(pendingAccounts).find(
        (inv: any) => inv.sharedWithEmail === email
      ) as Account | undefined;
      
      if (invitationForUser) {
        // User is logging in and has a pending invitation
        mockAccount.sharedWithId = mockUser.id;
        mockAccount.id = invitationForUser.id;
        mockAccount.name = invitationForUser.name;
        mockAccount.ownerId = invitationForUser.ownerId;
        
        // Update the pending invitation in storage
        const updatedPending = { ...pendingAccounts };
        delete updatedPending[invitationForUser.invitationId!];
        localStorage.setItem('pendingInvitations', JSON.stringify(updatedPending));
        
        // Update the main account in storage
        const allAccounts = JSON.parse(localStorage.getItem('accounts') || '{}');
        allAccounts[mockAccount.id] = {
          ...allAccounts[mockAccount.id],
          sharedWithId: mockUser.id
        };
        localStorage.setItem('accounts', JSON.stringify(allAccounts));
        
        toast.success('התחברת בהצלחה והצטרפת לחשבון משותף!');
      } else {
        toast.success('התחברת בהצלחה!');
      }
      
      setUser(mockUser);
      setAccount(mockAccount);
      
      // Save to localStorage for persistence
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('account', JSON.stringify(mockAccount));
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('ההתחברות נכשלה, אנא נסה שוב.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock registration - in a real app, this would be an API call
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if there's a pending invitation for this email
      const pendingAccounts = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      const invitationForUser = Object.values(pendingAccounts).find(
        (inv: any) => inv.sharedWithEmail === email
      );
      
      if (invitationForUser) {
        toast.info('יש לך הזמנה לחשבון משותף! התחבר כדי לקבל אותה.');
      }
      
      toast.success('הרשמה בוצעה בהצלחה! אנא אמת את כתובת האימייל שלך.');
      
      // In a real app, we would not log in the user until they verify their email
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('ההרשמה נכשלה, אנא נסה שוב.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccount(null);
    localStorage.removeItem('user');
    localStorage.removeItem('account');
    toast.info('התנתקת בהצלחה');
  };

  const sendInvitation = async (email: string) => {
    if (!user || !account) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a unique invitation ID
      const invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create an updated account with the invited email
      const updatedAccount: Account = {
        ...account,
        sharedWithEmail: email,
        invitationId
      };
      
      // Create a pending invitation object
      const pendingInvitation = {
        ...updatedAccount,
        sharedWithEmail: email,
        invitationId
      };
      
      // Store the pending invitation
      const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      pendingInvitations[invitationId] = pendingInvitation;
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
      // Update accounts storage
      const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
      accounts[account.id] = updatedAccount;
      localStorage.setItem('accounts', JSON.stringify(accounts));
      
      // Update the current account state
      setAccount(updatedAccount);
      localStorage.setItem('account', JSON.stringify(updatedAccount));
      
      // In a real app, send an email to the invited user with a link to accept the invitation
      console.log(`Email would be sent to ${email} with invitation link: /invitation/${invitationId}`);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeInvitation = async () => {
    if (!user || !account) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create an updated account without the shared user
      const updatedAccount: Account = {
        ...account,
        sharedWithId: undefined,
        sharedWithEmail: undefined,
        invitationId: undefined
      };
      
      // Remove from pending invitations if it exists
      if (account.invitationId) {
        const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
        delete pendingInvitations[account.invitationId];
        localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      }
      
      // Update accounts storage
      const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
      accounts[account.id] = updatedAccount;
      localStorage.setItem('accounts', JSON.stringify(accounts));
      
      // Update the current account state
      setAccount(updatedAccount);
      localStorage.setItem('account', JSON.stringify(updatedAccount));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to remove invitation:', error);
      toast.error('הסרת השותף נכשלה, אנא נסה שוב.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch the pending invitation
      const pendingInvitations = JSON.parse(localStorage.getItem('pendingInvitations') || '{}');
      const invitation = pendingInvitations[invitationId];
      
      if (!invitation) {
        throw new Error('ההזמנה אינה קיימת או שפג תוקפה');
      }
      
      if (invitation.sharedWithEmail !== user.email) {
        throw new Error('ההזמנה אינה מיועדת לחשבון זה');
      }
      
      // Update the invitation to include the user's ID
      const updatedInvitation = {
        ...invitation,
        sharedWithId: user.id
      };
      
      // Remove from pending invitations
      delete pendingInvitations[invitationId];
      localStorage.setItem('pendingInvitations', JSON.stringify(pendingInvitations));
      
      // Update accounts storage
      const accounts = JSON.parse(localStorage.getItem('accounts') || '{}');
      accounts[invitation.id] = updatedInvitation;
      localStorage.setItem('accounts', JSON.stringify(accounts));
      
      // Update the current account state
      setAccount(updatedInvitation);
      localStorage.setItem('account', JSON.stringify(updatedInvitation));
      
      toast.success('הצטרפת לחשבון בהצלחה!');
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      toast.error(error instanceof Error ? error.message : 'קבלת ההזמנה נכשלה, אנא נסה שוב.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    setIsLoading(true);
    try {
      // Mock email verification - in a real app, this would be an API call
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('האימייל אומת בהצלחה!');
      return true;
    } catch (error) {
      console.error('Failed to verify email:', error);
      toast.error('אימות האימייל נכשל, אנא נסה שוב.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      // Mock password reset - in a real app, this would be an API call
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('הוראות לאיפוס סיסמה נשלחו לאימייל שלך');
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast.error('איפוס הסיסמה נכשל, אנא נסה שוב.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      account,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      sendInvitation,
      removeInvitation,
      acceptInvitation,
      verifyEmail,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
