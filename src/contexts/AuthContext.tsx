
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  ownerId: string;
  sharedWithId?: string;
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
      
      setUser(mockUser);
      setAccount(mockAccount);
      
      // Save to localStorage for persistence
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('account', JSON.stringify(mockAccount));
      
      toast.success('התחברת בהצלחה!');
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
    setIsLoading(true);
    try {
      // Mock invitation - in a real app, this would be an API call
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`הזמנה נשלחה ל-${email}`);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('שליחת ההזמנה נכשלה, אנא נסה שוב.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      // Mock accepting invitation - in a real app, this would be an API call
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If the user is not logged in, we would prompt them to create an account
      // If they are logged in, we'd add them to the account
      
      if (user && account) {
        const updatedAccount = {
          ...account,
          sharedWithId: user.id
        };
        
        setAccount(updatedAccount);
        localStorage.setItem('account', JSON.stringify(updatedAccount));
      }
      
      toast.success('הצטרפת לחשבון בהצלחה!');
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      toast.error('קבלת ההזמנה נכשלה, אנא נסה שוב.');
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
      acceptInvitation,
      verifyEmail,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
