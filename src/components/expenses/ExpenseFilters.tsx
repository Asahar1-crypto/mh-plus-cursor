import React from 'react';
import { Filter, Calendar, User, Tag, DollarSign, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  // Categories for filtering
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
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  // Current year and few years back for filtering
  const years = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2
  ];

  const hasActiveFilters = selectedCategory || selectedChild || selectedStatus || selectedPayer;

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedChild(null);
    setSelectedStatus(null);
    setSelectedPayer(null);
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/80 backdrop-blur-sm border border-border/50 shadow-lg animate-fade-in">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </div>
            סינון הוצאות
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground self-start sm:self-auto"
            >
              נקה הכל
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {/* Category Filter */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <Tag className="h-3 w-3" />
              קטגוריה
            </div>
            <Select value={selectedCategory || 'all'} onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}>
              <SelectTrigger className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors duration-200">
                <SelectValue placeholder="כל הקטגוריות" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-lg border border-border/50">
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Child Filter */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <User className="h-3 w-3" />
              ילד
            </div>
            <Select value={selectedChild || 'all'} onValueChange={(value) => setSelectedChild(value === 'all' ? null : value)}>
              <SelectTrigger className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors duration-200">
                <SelectValue placeholder="כל הילדים" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-lg border border-border/50">
                <SelectItem value="all">כל הילדים</SelectItem>
                {childrenList.map(child => (
                  <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              סטטוס
            </div>
            <Select value={selectedStatus || 'all'} onValueChange={(value) => setSelectedStatus(value === 'all' ? null : (value as Expense['status']))}>
              <SelectTrigger className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors duration-200">
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-lg border border-border/50">
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="pending">ממתין לאישור</SelectItem>
                <SelectItem value="approved">מאושר</SelectItem>
                <SelectItem value="paid">שולם</SelectItem>
                <SelectItem value="rejected">נדחה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Month Filter */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" />
              חודש
            </div>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors duration-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-lg border border-border/50">
                {months.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" />
              שנה
            </div>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors duration-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-lg border border-border/50">
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payer Filter */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <Users className="h-3 w-3" />
              משלם
            </div>
            <Select value={selectedPayer || 'all'} onValueChange={(value) => setSelectedPayer(value === 'all' ? null : value)}>
              <SelectTrigger className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors duration-200">
                <SelectValue placeholder="כל המשלמים" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-lg border border-border/50">
                <SelectItem value="all">כל המשלמים</SelectItem>
                <SelectItem value="split">הוצאות משותפות</SelectItem>
                {accountMembers?.map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.user_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-3 sm:pt-4 border-t border-border/50">
            <span className="text-xs sm:text-sm text-muted-foreground w-full sm:w-auto mb-1 sm:mb-0">פילטרים פעילים:</span>
            {selectedCategory && (
              <Badge variant="secondary" className="gap-2 bg-primary/10 text-primary border-primary/20">
                קטגוריה: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedChild && (
              <Badge variant="secondary" className="gap-2 bg-primary/10 text-primary border-primary/20">
                ילד: {childrenList.find(c => c.id === selectedChild)?.name}
                <button
                  onClick={() => setSelectedChild(null)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedStatus && (
              <Badge variant="secondary" className="gap-2 bg-primary/10 text-primary border-primary/20">
                סטטוס: {selectedStatus === 'pending' ? 'ממתין' : selectedStatus === 'approved' ? 'מאושר' : selectedStatus === 'paid' ? 'שולם' : 'נדחה'}
                <button
                  onClick={() => setSelectedStatus(null)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedPayer && (
              <Badge variant="secondary" className="gap-2 bg-primary/10 text-primary border-primary/20">
                משלם: {selectedPayer === 'split' ? 'משותף' : accountMembers?.find(m => m.user_id === selectedPayer)?.user_name}
                <button
                  onClick={() => setSelectedPayer(null)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};