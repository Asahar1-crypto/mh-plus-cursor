import React from 'react';
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountMember } from '@/contexts/auth/types';

export interface CustodyFilterState {
  eventType: 'all' | 'holiday' | 'vacation';
  parentFilter: 'all' | 'unassigned' | string;
}

interface CustodyFiltersProps {
  filters: CustodyFilterState;
  onChange: (filters: CustodyFilterState) => void;
  members: AccountMember[];
}

const CustodyFilters: React.FC<CustodyFiltersProps> = ({ filters, onChange, members }) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
      <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={filters.eventType}
        onValueChange={(v) => onChange({ ...filters, eventType: v as any })}
      >
        <SelectTrigger className="w-[90px] sm:w-[130px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">הכל</SelectItem>
          <SelectItem value="holiday">חגים</SelectItem>
          <SelectItem value="vacation">חופשות</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.parentFilter}
        onValueChange={(v) => onChange({ ...filters, parentFilter: v })}
      >
        <SelectTrigger className="w-[100px] sm:w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל ההורים</SelectItem>
          <SelectItem value="unassigned">לא משובץ</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>{m.user_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CustodyFilters;
