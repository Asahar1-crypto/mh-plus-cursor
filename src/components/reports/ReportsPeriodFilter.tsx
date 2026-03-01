import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { PeriodFilter, PeriodType } from '@/utils/reportsPeriodUtils';

interface ReportsPeriodFilterProps {
  value: PeriodFilter;
  onChange: (period: PeriodFilter) => void;
}

export const ReportsPeriodFilter: React.FC<ReportsPeriodFilterProps> = ({ value, onChange }) => {
  const now = new Date();
  const isMobile = useIsMobile();
  const currentYear = now.getFullYear();

  const periodTypeOptions: { value: PeriodType; label: string }[] = [
    { value: 'all', label: 'כל התקופה' },
    { value: 'month', label: 'חודש' },
    { value: 'quarter', label: 'רבעון' },
    { value: 'year', label: 'שנה' },
    { value: 'range', label: 'טווח תאריכים' },
  ];

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: format(date, 'MMMM yyyy', { locale: he }),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      });
    }
    return options;
  }, []);

  const quarterOptions = useMemo(() => {
    const options = [];
    for (let y = currentYear; y >= currentYear - 2; y--) {
      for (let q = 1; q <= 4; q++) {
        options.push({
          value: `${y}-Q${q}`,
          label: `רבעון ${q} ${y}`,
          year: y,
          quarter: q,
        });
      }
    }
    return options;
  }, [currentYear]);

  const yearOptions = useMemo(() => {
    const options = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      options.push({ value: String(y), label: String(y), year: y });
    }
    return options;
  }, [currentYear]);

  const handleTypeChange = (type: PeriodType) => {
    if (type === 'all') {
      onChange({ type: 'all' });
    } else if (type === 'month') {
      onChange({
        type: 'month',
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
    } else if (type === 'quarter') {
      onChange({
        type: 'quarter',
        year: now.getFullYear(),
        quarter: Math.floor(now.getMonth() / 3) + 1,
      });
    } else if (type === 'year') {
      onChange({ type: 'year', year: now.getFullYear() });
    } else {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      onChange({
        type: 'range',
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      });
    }
  };

  const monthValue = value.type === 'month' && value.year && value.month
    ? `${value.year}-${String(value.month).padStart(2, '0')}`
    : '';

  const quarterValue = value.type === 'quarter' && value.year && value.quarter
    ? `${value.year}-Q${value.quarter}`
    : '';

  const yearValue = value.type === 'year' && value.year ? String(value.year) : '';

  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      <Select value={value.type} onValueChange={(v) => handleTypeChange(v as PeriodType)}>
        <SelectTrigger className="w-[140px] min-h-[44px] text-right">
          <SelectValue placeholder="בחר תקופה" />
        </SelectTrigger>
        <SelectContent>
          {periodTypeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.type === 'month' && (
        <Select
          value={monthValue}
          onValueChange={(v) => {
            const [y, m] = v.split('-').map(Number);
            onChange({ ...value, year: y, month: m });
          }}
        >
          <SelectTrigger className="w-[160px] min-h-[44px] text-right">
            <SelectValue placeholder="בחר חודש" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.type === 'quarter' && (
        <Select
          value={quarterValue}
          onValueChange={(v) => {
            const [y, qStr] = v.split('-');
            const q = parseInt(qStr.replace('Q', ''), 10);
            onChange({ ...value, year: parseInt(y, 10), quarter: q });
          }}
        >
          <SelectTrigger className="w-[140px] min-h-[44px] text-right">
            <SelectValue placeholder="בחר רבעון" />
          </SelectTrigger>
          <SelectContent>
            {quarterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.type === 'year' && (
        <Select
          value={yearValue}
          onValueChange={(v) => onChange({ ...value, year: parseInt(v, 10) })}
        >
          <SelectTrigger className="w-[100px] min-h-[44px] text-right">
            <SelectValue placeholder="בחר שנה" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.type === 'range' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-h-[44px] justify-end">
              {value.startDate && value.endDate
                ? `${value.startDate} - ${value.endDate}`
                : 'בחר טווח תאריכים'}
              <CalendarIcon className="h-4 w-4 mr-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[95vw] p-0" align="start">
            <Calendar
              mode="range"
              selected={
                value.startDate && value.endDate
                  ? { from: new Date(value.startDate), to: new Date(value.endDate) }
                  : undefined
              }
              onSelect={(range) => {
                if (range?.from) {
                  onChange({
                    ...value,
                    startDate: format(range.from, 'yyyy-MM-dd'),
                    endDate: range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd'),
                  });
                }
              }}
              numberOfMonths={isMobile ? 1 : 2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
