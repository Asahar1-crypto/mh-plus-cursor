import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from './StatusBadge';
import { 
  Calendar, 
  User, 
  Tag, 
  Users,
  Check,
  X,
  Eye,
  FileText
} from 'lucide-react';
import { Expense } from '@/contexts/expense/types';

interface ExpenseCardMobileProps {
  expense: Expense;
  creatorName: string;
  paidByName: string;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onMarkAsPaid: () => void;
  onPreviewReceipt?: () => void;
  showCheckbox: boolean;
}

export const ExpenseCardMobile: React.FC<ExpenseCardMobileProps> = ({
  expense,
  creatorName,
  paidByName,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onMarkAsPaid,
  onPreviewReceipt,
  showCheckbox
}) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border border-border/50 hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 space-y-3">
        {/* Header: Checkbox + Date + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showCheckbox && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
              />
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(expense.date), 'dd/MM/yyyy')}
            </div>
          </div>
          <StatusBadge status={expense.status} />
        </div>

        {/* Description & Amount */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm line-clamp-2">{expense.description}</p>
            <span className="font-bold text-lg text-primary whitespace-nowrap">₪{expense.amount}</span>
          </div>
          <p className="text-xs text-muted-foreground">נוצר על ידי: {creatorName}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Category */}
          {expense.category && (
            <div className="flex items-center gap-1 justify-end">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                {expense.category}
              </Badge>
              <Tag className="h-3 w-3 text-muted-foreground" />
            </div>
          )}

          {/* Child */}
          {expense.childName && (
            <div className="flex items-center gap-1 justify-end text-muted-foreground">
              <span className="font-medium">{expense.childName}</span>
              <User className="h-3 w-3" />
            </div>
          )}

          {/* Payer */}
          <div className="flex items-center gap-1 justify-end text-muted-foreground col-span-2">
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <span className="font-medium">{paidByName}</span>
                <Users className="h-3 w-3" />
              </div>
              {expense.splitEqually && (
                <Badge variant="secondary" className="text-xs h-4">
                  חלוקה שווה
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          {/* Receipt */}
          <div>
            {expense.receiptId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={onPreviewReceipt}
                className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Eye className="h-4 w-4 ml-1" />
                <span className="text-xs">חשבונית</span>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">אין חשבונית</span>
            )}
          </div>

          {/* Status Actions */}
          <div className="flex gap-1">
            {expense.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onApprove}
                  className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Check className="h-4 w-4 ml-1" />
                  <span className="text-xs">אשר</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReject}
                  className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 ml-1" />
                  <span className="text-xs">דחה</span>
                </Button>
              </>
            )}
            {expense.status === 'approved' && (
              <Button
                size="sm"
                onClick={onMarkAsPaid}
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                סמן כשולם
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
