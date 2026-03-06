import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { toast } from 'sonner';
import { useBirthdayProjects } from '@/hooks/useBirthdayProjects';
import { BirthdayProjectCard } from '@/components/birthday/BirthdayProjectCard';
import { EventDatePicker } from '@/components/birthday/EventDatePicker';
import { differenceInYears, parseISO, format } from 'date-fns';

const BirthdayProjects: React.FC = () => {
  const navigate = useNavigate();
  const { user, account } = useAuth();
  const { childrenList } = useExpense();
  const { projects, isLoading, createProject, isCreating } = useBirthdayProjects(account?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [birthdayDate, setBirthdayDate] = useState<Date | undefined>(undefined);
  const [customName, setCustomName] = useState('');

  // Given a birth date string, return the next upcoming birthday as a Date object
  const nextUpcomingBirthday = (birthDateStr: string): Date => {
    const birth = parseISO(birthDateStr);
    const today = new Date();
    const thisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    return thisYear < today
      ? new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate())
      : thisYear;
  };

  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);
    if (childId && childId !== '__custom__') {
      const child = childrenList?.find((c) => c.id === childId);
      if (child?.birthDate) {
        setBirthdayDate(nextUpcomingBirthday(child.birthDate));
      }
    } else {
      setBirthdayDate(undefined);
    }
  };

  if (!user || !account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleCreate = async () => {
    if (!birthdayDate) return;

    let childName = customName;
    let childId: string | null = null;
    let childAge: number | null = null;

    if (selectedChildId && selectedChildId !== '__custom__') {
      const child = childrenList?.find((c) => c.id === selectedChildId);
      if (child) {
        childId = child.id;
        childName = child.name;
        if (child.birthDate) {
          childAge = differenceInYears(birthdayDate, parseISO(child.birthDate));
        }
      }
    }

    if (!childName) return;

    try {
      const project = await createProject({
        accountId: account.id,
        childId,
        childName,
        birthdayDate: format(birthdayDate, 'yyyy-MM-dd'),
        childAgeAtEvent: childAge,
        initiatedBy: user.id,
      });

      setDialogOpen(false);
      setSelectedChildId('');
      setBirthdayDate(undefined);
      setCustomName('');
      navigate(`/birthday-projects/${project.id}`);
    } catch (err: unknown) {
      console.error('createProject error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`שגיאה ביצירת פרויקט: ${msg}`);
    }
  };

  const isChildCustom = selectedChildId === '__custom__' || !selectedChildId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
              <PartyPopper className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">פרויקטי יום הולדת</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            פרויקט חדש
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <PartyPopper className="h-16 w-16 text-muted-foreground/40" />
            <p className="text-muted-foreground text-lg">אין עדיין פרויקטי יום הולדת</p>
            <p className="text-muted-foreground text-sm">צרו פרויקט משותף לתכנון יום ההולדת של הילד/ה</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              צור פרויקט
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <BirthdayProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Create project dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>פרויקט יום הולדת חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>ילד/ה</Label>
              <Select value={selectedChildId} onValueChange={handleChildSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר ילד/ה" />
                </SelectTrigger>
                <SelectContent>
                  {childrenList?.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">אחר / הכנס שם ידנית</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isChildCustom && (
              <div className="space-y-1">
                <Label htmlFor="childName">שם הילד/ה</Label>
                <Input
                  id="childName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="שם הילד/ה"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>
                תאריך יום ההולדת
                {selectedChildId && selectedChildId !== '__custom__' && birthdayDate && (
                  <span className="mr-2 text-xs text-muted-foreground font-normal">(מולא אוטומטית – ניתן לשנות)</span>
                )}
              </Label>
              <EventDatePicker
                value={birthdayDate}
                onChange={setBirthdayDate}
                placeholder="בחר תאריך יום ההולדת"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ביטול
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  isCreating ||
                  !birthdayDate ||
                  (!selectedChildId && !customName) ||
                  (isChildCustom && !customName)
                }

              >
                {isCreating ? 'יוצר...' : 'צור פרויקט'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BirthdayProjects;
