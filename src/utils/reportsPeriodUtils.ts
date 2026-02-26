import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export type PeriodType = 'all' | 'month' | 'quarter' | 'year' | 'range';

export interface PeriodFilter {
  type: PeriodType;
  month?: number;
  year?: number;
  quarter?: number;
  startDate?: string;
  endDate?: string;
}

export function filterExpensesByPeriod<T extends { date: string }>(
  expenses: T[],
  period: PeriodFilter
): T[] {
  if (period.type === 'all') return expenses;

  return expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    const expYear = expDate.getFullYear();
    const expMonth = expDate.getMonth() + 1;

    switch (period.type) {
      case 'month':
        return period.year === expYear && period.month === expMonth;

      case 'quarter':
        if (!period.year || !period.quarter) return true;
        const qStart = (period.quarter - 1) * 3 + 1;
        const qEnd = period.quarter * 3;
        return expYear === period.year && expMonth >= qStart && expMonth <= qEnd;

      case 'year':
        return period.year === expYear;

      case 'range':
        if (!period.startDate || !period.endDate) return true;
        return exp.date >= period.startDate && exp.date <= period.endDate;

      default:
        return true;
    }
  });
}

export function getPeriodLabel(period: PeriodFilter): string {
  switch (period.type) {
    case 'all':
      return 'כל התקופה';
    case 'month':
      if (period.year && period.month) {
        const d = new Date(period.year, period.month - 1, 1);
        return format(d, 'MMMM yyyy', { locale: he });
      }
      return 'חודש';
    case 'quarter':
      return period.year && period.quarter
        ? `רבעון ${period.quarter} ${period.year}`
        : 'רבעון';
    case 'year':
      return period.year ? `שנת ${period.year}` : 'שנה';
    case 'range':
      return period.startDate && period.endDate
        ? `${period.startDate} - ${period.endDate}`
        : 'טווח תאריכים';
    default:
      return '';
  }
}

export function getQuarterFromDate(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}
