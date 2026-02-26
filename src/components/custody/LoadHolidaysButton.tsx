import React, { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LoadHolidaysButtonProps {
  onLoad: (schoolYear: string) => Promise<void>;
  isLoading: boolean;
}

function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 8) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function getSchoolYearOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  return [
    `${year - 1}-${year}`,
    `${year}-${year + 1}`,
    `${year + 1}-${year + 2}`,
  ];
}

const LoadHolidaysButton: React.FC<LoadHolidaysButtonProps> = ({ onLoad, isLoading }) => {
  const [selectedYear, setSelectedYear] = useState(getCurrentSchoolYear());
  const yearOptions = getSchoolYearOptions();

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={() => onLoad(selectedYear)}
        disabled={isLoading}
        size="sm"
        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md text-xs sm:text-sm h-9 flex-shrink-0"
      >
        {isLoading ? (
          <Loader2 className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
        ) : (
          <Calendar className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        )}
        <span className="hidden xs:inline">טען</span> חגים
      </Button>
    </div>
  );
};

export default LoadHolidaysButton;
