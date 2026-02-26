import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountMember } from '@/contexts/auth/types';

interface ParentSelectorProps {
  value: string | null;
  members: AccountMember[];
  onChange: (parentId: string | null) => void;
  compact?: boolean;
}

const ParentSelector: React.FC<ParentSelectorProps> = ({ value, members, onChange, compact }) => {
  return (
    <Select
      value={value || '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? null : v)}
    >
      <SelectTrigger className={compact ? 'h-8 text-xs w-full min-w-[100px] max-w-[150px]' : 'h-9 text-sm w-full min-w-[120px] max-w-[180px]'}>
        <SelectValue placeholder="לא משובץ" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="text-muted-foreground">לא משובץ</span>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id}>
            {member.user_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ParentSelector;
