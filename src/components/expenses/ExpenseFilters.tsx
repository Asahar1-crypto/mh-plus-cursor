
import React from 'react';
import { Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Expense, Child } from '@/contexts/expense/types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { memberService } from '@/contexts/auth/services/account/memberService';

interface ExpenseFiltersProps {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedChild: string | null;
  setSelectedChild: (child: string | null) => void;
  selectedStatus: Expense['status'] | null;
  setSelectedStatus: (status: Expense['status'] | null) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedPayer: string | null;
  setSelectedPayer: (payer: string | null) => void;
  childrenList: Child[];
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedChild,
  setSelectedChild,
  selectedStatus,
  setSelectedStatus,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  selectedPayer,
  setSelectedPayer,
  childrenList
}) => {
  const { account } = useAuth();
  
  // Get account members
  const { data: accountMembers } = useQuery({
    queryKey: ['account-members', account?.id],
    queryFn: () => memberService.getAccountMembers(account!.id),
    enabled: !!account?.id
  });
  // Categories for filtering - updated to include all categories used in the system
  const categories = [
    'חינוך',
    'רפואה', 
    'פנאי',
    'ביגוד',
    'מזון',
    'מזונות',
    'קייטנות',
    'אחר',
  ];

  // Generate months for dropdown
  const months = [
    { value: 0, label: 'ינואר' },
    { value: 1, label: 'פברואר' },
    { value: 2, label: 'מרץ' },
    { value: 3, label: 'אפריל' },
    { value: 4, label: 'מאי' },
    { value: 5, label: 'יוני' },
    { value: 6, label: 'יולי' },
    { value: 7, label: 'אוגוסט' },
    { value: 8, label: 'ספטמבר' },
    { value: 9, label: 'אוקטובר' },
    { value: 10, label: 'נובמבר' },
    { value: 11, label: 'דצמבר' },
  ];

  // Current year and few years back for filtering
  const years = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2
  ];

  return (
    <Card className="bg-muted/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Filter className="mr-2 h-5 w-5" /> סינון הוצאות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">לפי חודש</label>
            <div className="flex gap-2">
              <Select 
                value={selectedMonth?.toString()} 
                onValueChange={(value) => setSelectedMonth(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={months[new Date().getMonth()].label} />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedYear?.toString()} 
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={new Date().getFullYear().toString()} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">לפי קטגוריה</label>
            <Select 
              value={selectedCategory || 'all'} 
              onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="כל הקטגוריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">לפי סטטוס</label>
            <Select 
              value={selectedStatus || 'all'} 
              onValueChange={(value) => setSelectedStatus(value === 'all' ? null : value as Expense['status'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="pending">ממתינה לאישור</SelectItem>
                <SelectItem value="approved">אושרה</SelectItem>
                <SelectItem value="rejected">נדחתה</SelectItem>
                <SelectItem value="paid">שולמה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">לפי שיוך לילד</label>
            <Select 
              value={selectedChild || 'all'} 
              onValueChange={(value) => setSelectedChild(value === 'all' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="כל הילדים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="general">הוצאה כללית</SelectItem>
                {childrenList.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">מי צריך לשלם</label>
            <Select 
              value={selectedPayer || 'all'} 
              onValueChange={(value) => setSelectedPayer(value === 'all' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="כל המשלמים" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="split">חצי-חצי</SelectItem>
                {accountMembers?.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.user_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
