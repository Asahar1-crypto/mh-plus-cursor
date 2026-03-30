import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserRoundX, UserPlus, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Account } from '@/contexts/auth/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';

interface VirtualPartnerCardProps {
  account: Account | null;
  isAdmin: boolean;
}

const VirtualPartnerCard = ({ account, isAdmin }: VirtualPartnerCardProps) => {
  const { user } = useAuth();
  const [partnerName, setPartnerName] = useState(account?.virtual_partner_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Count real account members
  const { data: memberCount } = useQuery({
    queryKey: ['account-member-count', account?.id],
    queryFn: async () => {
      if (!account?.id) return 0;
      const { count, error } = await supabase
        .from('account_members')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id);
      if (error) {
        console.error('Error counting members:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!account?.id,
  });

  // Only show when there's no real partner (fewer than 2 members)
  if (memberCount === undefined || memberCount >= 2) return null;

  const hasVirtualPartner = !!account?.virtual_partner_name;

  const handleSave = async () => {
    if (!account?.id || !isAdmin) {
      toast({
        title: 'שגיאה',
        description: 'רק מנהל החשבון יכול לשנות הגדרה זו',
        variant: 'destructive',
      });
      return;
    }

    if (!partnerName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין שם בן/בת הזוג',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ virtual_partner_name: partnerName.trim() })
        .eq('id', account.id);

      if (error) throw error;

      toast({
        title: hasVirtualPartner ? 'עודכן בהצלחה' : 'נשמר בהצלחה',
        description: hasVirtualPartner ? 'שם בן/בת הזוג עודכן' : 'שותף/ה וירטואלי/ת הוגדר/ה',
      });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    } catch (error) {
      console.error('Error updating virtual partner name:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בשמירת שם בן/בת הזוג',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (!account?.id || !isAdmin) return;

    setIsRemoving(true);

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ virtual_partner_name: null, virtual_partner_id: null })
        .eq('id', account.id);

      if (error) throw error;

      setPartnerName('');
      toast({
        title: 'הוסר בהצלחה',
        description: 'השותף/ה הווירטואלי/ת הוסר/ה',
      });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    } catch (error) {
      console.error('Error removing virtual partner:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בהסרת השותף/ה הווירטואלי/ת',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleInvitePartner = () => {
    navigate('/account-settings?tab=family');
  };

  return (
    <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserRoundX className="h-4 w-4 text-primary" />
          שותף/ה וירטואלי/ת
        </CardTitle>
        <CardDescription>
          {hasVirtualPartner
            ? 'את/ה מנהל/ת את החשבון לבד. ניתן לשנות את שם בן/בת הזוג או להזמין אותו/ה להצטרף.'
            : 'תוכל/י לנהל הוצאות ולראות התקזזות גם בלי שהשותף/ה נרשם/ת למערכת. אם יצטרף/תצטרף בעתיד, כל הנתונים יועברו אוטומטית.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Partner name input */}
        <div className="space-y-2">
          <Label htmlFor="virtual-partner-name">שם השותף/ה</Label>
          <div className="flex gap-2">
            <Input
              id="virtual-partner-name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder='לדוגמה: אבי, נטלי'
              className="text-right flex-1"
              dir="rtl"
              disabled={!isAdmin}
            />
            <Button
              onClick={handleSave}
              disabled={
                isUpdating ||
                !isAdmin ||
                !partnerName.trim() ||
                partnerName.trim() === (account?.virtual_partner_name || '')
              }
              size="sm"
              className="shrink-0"
            >
              <Save className="h-4 w-4 ml-1" />
              {isUpdating ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </div>

        {/* Remove virtual partner — only if one is currently set */}
        {hasVirtualPartner && (
          <div className="border-t pt-4 space-y-3">
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={isRemoving || !isAdmin}
              className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              {isRemoving ? 'מסיר...' : 'הסר שותף/ה וירטואלי/ת'}
            </Button>
          </div>
        )}

        {/* Invite partner to join */}
        {hasVirtualPartner && (
          <div className="border-t pt-4 space-y-2">
            <Button
              variant="outline"
              onClick={handleInvitePartner}
              className="w-full gap-2"
              disabled={!isAdmin}
            >
              <UserPlus className="h-4 w-4" />
              הזמן את השותף/ה להצטרף
            </Button>
            <p className="text-sm text-muted-foreground">
              כשהשותף/ה יצטרף, כל ההוצאות יועברו אוטומטית לחשבון שלו/ה
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VirtualPartnerCard;
