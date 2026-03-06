import * as React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const HEBREW_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
];

interface EventDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function EventDatePicker({
  value,
  onChange,
  placeholder = 'בחר תאריך',
  className,
  disabled = false,
}: EventDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(value ?? new Date());

  const currentYear = new Date().getFullYear();
  const years = React.useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear - 1; y <= currentYear + 5; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  const months = HEBREW_MONTHS.map((label, index) => ({ value: index, label }));

  const handleYearChange = (yearStr: string) => {
    const d = new Date(month);
    d.setFullYear(parseInt(yearStr));
    setMonth(d);
  };

  const handleMonthChange = (monthStr: string) => {
    const d = new Date(month);
    d.setMonth(parseInt(monthStr));
    setMonth(d);
  };

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    if (date) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-right font-normal', !value && 'text-muted-foreground', className)}
        >
          {value ? format(value, 'dd/MM/yyyy') : <span>{placeholder}</span>}
          <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <Select value={month.getMonth().toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[120px] h-8 bg-background">
              <SelectValue placeholder="חודש" />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-background max-h-[200px]">
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month.getFullYear().toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[90px] h-8 bg-background">
              <SelectValue placeholder="שנה" />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-background max-h-[200px]">
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DayPicker
          mode="single"
          selected={value}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          locale={he}
          className={cn('p-3 pointer-events-auto')}
          classNames={{
            months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
            month: 'space-y-4',
            caption: 'flex justify-center pt-1 relative items-center',
            caption_label: 'text-sm font-medium',
            nav: 'space-x-1 flex items-center',
            nav_button: cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'),
            nav_button_previous: 'absolute left-1',
            nav_button_next: 'absolute right-1',
            table: 'w-full border-collapse space-y-1',
            head_row: 'flex',
            head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
            row: 'flex w-full mt-2',
            cell: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
            day: cn(buttonVariants({ variant: 'ghost' }), 'h-9 w-9 p-0 font-normal aria-selected:opacity-100'),
            day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
            day_today: 'bg-accent text-accent-foreground',
            day_outside: 'day-outside text-muted-foreground opacity-50',
            day_disabled: 'text-muted-foreground opacity-50',
            day_hidden: 'invisible',
          }}
          components={{
            IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
            IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
