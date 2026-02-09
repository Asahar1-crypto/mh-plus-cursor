import React from 'react';
import { useAuth } from '@/contexts/auth';
import { Navigate } from 'react-router-dom';
import EmailChangeForm from '@/components/admin/EmailChangeForm';
import EmailChangeHistory from '@/components/admin/EmailChangeHistory';

const AdminEmailManagement: React.FC = () => {
  const { profile } = useAuth();

  // בדיקת הרשאות Super Admin
  if (!profile?.is_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">ניהול כתובות מייל</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">שינוי ומעקב אחרי כתובות מייל של משתמשים</p>
        </div>

        {/* Email Change Form */}
        <EmailChangeForm onEmailChanged={() => {
          // רענון ההיסטוריה מתבצע אוטומטית דרך הקומפוננטה
          window.location.reload();
        }} />

        {/* Email Change History */}
        <EmailChangeHistory />
      </div>
    </div>
  );
};

export default AdminEmailManagement;
