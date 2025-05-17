
import React from 'react';

interface InvitationDetailsProps {
  ownerName: string;
  accountName: string;
  email: string;
}

const InvitationDetailsCard = ({ ownerName, accountName, email }: InvitationDetailsProps) => {
  return (
    <div className="bg-muted p-4 rounded-md">
      <h3 className="font-medium mb-2">{"פרטי ההזמנה:"}</h3>
      <p className="text-sm"><strong>{"מזמין:"}</strong> {ownerName}</p>
      <p className="text-sm"><strong>{"חשבון:"}</strong> {accountName}</p>
      <p className="text-sm"><strong>{"הזמנה לאימייל:"}</strong> {email}</p>
      <p className="text-sm"><strong>{"תפקיד:"}</strong> {"שותף בחשבון"}</p>
    </div>
  );
};

export default InvitationDetailsCard;
