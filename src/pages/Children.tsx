
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExpense, Child } from '@/contexts/ExpenseContext';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, User, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const childSchema = z.object({
  name: z.string().min(2, { message: 'השם חייב להיות לפחות 2 תווים' }),
  birthDate: z.date({
    required_error: 'יש לבחור תאריך לידה',
  }),
});

const Children = () => {
  const { children, addChild } = useExpense();
  const { user, sendInvitation } = useAuth();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.infer<typeof childSchema>>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof childSchema>) => {
    setIsPending(true);
    try {
      await addChild({
        name: data.name,
        birthDate: format(data.birthDate, 'yyyy-MM-dd'),
      });
      
      form.reset();
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="container mx-auto animate-fade-in py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">ילדים</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              הוסף ילד/ה
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>הוספת ילד/ה חדש/ה</DialogTitle>
              <DialogDescription>
                הוסף פרטים אודות הילד/ה
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם</FormLabel>
                      <FormControl>
                        <Input placeholder="ישראל/ה" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>תאריך לידה</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy')
                              ) : (
                                <span>בחר תאריך</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => 
                              date > new Date() || 
                              date < new Date('2000-01-01')
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        תאריך הלידה של הילד/ה
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        שומר...
                      </span>
                    ) : (
                      'שמור'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
        
        {children.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">אין ילדים עדיין</h3>
            <p className="text-muted-foreground mb-4">
              התחל להוסיף ילדים למערכת כדי לנהל את ההוצאות שלהם
            </p>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                הוסף ילד/ה ראשון/ה
              </Button>
            </DialogTrigger>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChildCardProps {
  child: Child;
}

const ChildCard: React.FC<ChildCardProps> = ({ child }) => {
  const { sendInvitation } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  
  const handleSendInvitation = async () => {
    if (!email) return;
    
    setIsPending(true);
    try {
      await sendInvitation(email);
      setEmail('');
      setShowInvite(false);
    } finally {
      setIsPending(false);
    }
  };
  
  // Calculate age
  const birthDate = new Date(child.birthDate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>{child.name}</CardTitle>
        <CardDescription>
          {format(new Date(child.birthDate), 'dd/MM/yyyy')} ({age} שנים)
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">הוצאות החודש:</span>
            <span>₪0.00</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">הוצאות קבועות:</span>
            <span>₪0.00 / חודש</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        {showInvite ? (
          <div className="w-full space-y-2">
            <div className="flex gap-2">
              <Input 
                placeholder="דוא״ל של ההורה השני" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button 
                size="sm" 
                onClick={handleSendInvitation}
                disabled={!email || isPending}
              >
                {isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  'שלח'
                )}
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => setShowInvite(false)}
            >
              ביטול
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowInvite(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            הזמן הורה נוסף
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default Children;
