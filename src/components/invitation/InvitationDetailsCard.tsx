
import React from 'react';

interface InvitationDetailsProps {
  ownerName: string;
  accountName: string;
  email?: string;
  phoneNumber?: string;
}

const InvitationDetailsCard = ({ ownerName, accountName, email, phoneNumber }: InvitationDetailsProps) => {
  // Format phone number for display (hide middle digits)
  const formatPhoneForDisplay = (phone: string) => {
    if (!phone) return '';
    if (phone.length > 6) {
      return phone.slice(0, 4) + '****' + phone.slice(-3);
    }
    return phone;
  };

  return (
    <div className="bg-muted p-4 rounded-md">
      <h3 className="font-medium mb-2">{"פרטי ההזמנה:"}</h3>
      <p className="text-sm"><strong>{"מזמין:"}</strong> {ownerName}</p>
      <p className="text-sm"><strong>{"חשבון:"}</strong> {accountName}</p>
      {phoneNumber && (
        <p className="text-sm"><strong>{"הזמנה לטלפון:"}</strong> {formatPhoneForDisplay(phoneNumber)}</p>
      )}
      {email && (
        <p className="text-sm"><strong>{"הזמנה לאימייל:"}</strong> {email}</p>
      )}
      <p className="text-sm"><strong>{"תפקיד:"}</strong> {"שותף בחשבון"}</p>
    </div>
  );
};

export default InvitationDetailsCard;
