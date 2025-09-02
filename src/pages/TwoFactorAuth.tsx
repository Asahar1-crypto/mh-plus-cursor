import React from 'react';
import { TwoFactorSetup } from '@/components/sms/TwoFactorSetup';

const TwoFactorAuth = () => {
  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-right">אימות דו-שלבי</h1>
        <p className="text-muted-foreground text-right mt-2">
          הגדר אימות דו-שלבי להגנה מתקדמת על החשבון שלך
        </p>
      </div>
      
      <TwoFactorSetup />
    </div>
  );
};

export default TwoFactorAuth;