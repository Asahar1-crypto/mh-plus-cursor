import React, { useState } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EducationLevel } from '@/integrations/supabase/custodyService';

interface LoadVacationsButtonProps {
  onLoad: (schoolYear: string, educationLevel: EducationLevel) => Promise<void>;
  isLoading: boolean;
}

const educationLevels: { value: EducationLevel; label: string }[] = [
  { value: 'kindergarten', label: 'גנים' },
  { value: 'elementary', label: 'יסודי' },
  { value: 'middle_school', label: 'חטיבה' },
  { value: 'high_school', label: 'תיכון' },
];

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

const LoadVacationsButton: React.FC<LoadVacationsButtonProps> = ({ onLoad, isLoading }) => {
  const [selectedYear, setSelectedYear] = useState(getCurrentSchoolYear());
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>('elementary');
  const yearOptions = getSchoolYearOptions();

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as EducationLevel)}>
          <SelectTrigger className="w-[100px] sm:w-[130px] h-9 text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {educationLevels.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => onLoad(selectedYear, selectedLevel)}
        disabled={isLoading}
        size="sm"
        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-md text-xs sm:text-sm h-9 flex-shrink-0"
      >
        {isLoading ? (
          <Loader2 className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
        ) : (
          <GraduationCap className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        )}
        <span className="hidden xs:inline">טען</span> חופשות
      </Button>
    </div>
  );
};

export default LoadVacationsButton;
