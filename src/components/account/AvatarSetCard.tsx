import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AVATAR_SETS, FAMILY_ROLE_LABELS, DEFAULT_AVATAR_SET_ID, type AvatarSet, type FamilyRole } from '@/lib/avatarSets';
import { Smile, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarSetCardProps {
  accountId: string | undefined;
  currentAvatarSet: string | null | undefined;
  isAdmin: boolean;
}

const ROLE_ORDER: FamilyRole[] = ['father', 'mother', 'son', 'daughter'];

const AvatarSetCard = ({ accountId, currentAvatarSet, isAdmin }: AvatarSetCardProps) => {
  const [selectedSet, setSelectedSet] = useState<string>(currentAvatarSet || DEFAULT_AVATAR_SET_ID);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Fetch the avatar_set directly from DB to ensure we have the latest value
  useEffect(() => {
    if (!accountId) return;
    const fetchAvatarSet = async () => {
      try {
        const { data } = await supabase
          .from('accounts')
          .select('avatar_set')
          .eq('id', accountId)
          .single();
        if (data?.avatar_set) {
          setSelectedSet(data.avatar_set);
        }
      } catch {
        // Column may not exist yet if migration hasn't run - that's ok
      }
    };
    fetchAvatarSet();
  }, [accountId]);

  const handleSelectSet = async (setId: string) => {
    if (!accountId || !isAdmin) {
      toast({
        title: "שגיאה",
        description: "רק מנהל החשבון יכול לשנות הגדרה זו",
        variant: "destructive",
      });
      return;
    }

    if (setId === selectedSet) return;

    setIsUpdating(true);
    const previousSet = selectedSet;
    setSelectedSet(setId);

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ avatar_set: setId })
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "נשמר בהצלחה",
        description: `סט האווטרים עודכן ל${AVATAR_SETS.find(s => s.id === setId)?.nameHe || setId}`,
      });
    } catch (error) {
      console.error('Error updating avatar set:', error);
      setSelectedSet(previousSet);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את סט האווטרים",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smile className="h-5 w-5 text-primary" />
          <CardTitle>אווטרים למשפחה</CardTitle>
        </div>
        <CardDescription>
          בחרו סט אווטרים שייצג את בני המשפחה באפליקציה
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAdmin && (
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            רק מנהל החשבון יכול לשנות הגדרה זו
          </p>
        )}

        <div className="grid gap-4">
          {AVATAR_SETS.map((avatarSet) => (
            <AvatarSetOption
              key={avatarSet.id}
              avatarSet={avatarSet}
              isSelected={selectedSet === avatarSet.id}
              isDisabled={!isAdmin || isUpdating}
              onSelect={() => handleSelectSet(avatarSet.id)}
            />
          ))}
        </div>

        {AVATAR_SETS.length === 1 && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">בקרוב עוד סטים!</p>
            <p className="text-blue-800 dark:text-blue-200">
              סטים נוספים של אווטרים יתווספו בעתיד. הישארו מעודכנים!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface AvatarSetOptionProps {
  avatarSet: AvatarSet;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}

const AvatarSetOption = ({ avatarSet, isSelected, isDisabled, onSelect }: AvatarSetOptionProps) => {
  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={cn(
        "relative w-full rounded-xl border-2 p-4 transition-all duration-200 text-right",
        "hover:shadow-md hover:border-primary/50",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-muted",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-muted bg-card hover:bg-accent/30"
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 left-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      {/* Set name */}
      <div className="mb-3">
        <h3 className="font-semibold text-base">{avatarSet.nameHe}</h3>
        <p className="text-sm text-muted-foreground">{avatarSet.descriptionHe}</p>
      </div>

      {/* Avatar preview grid */}
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        {ROLE_ORDER.map((role) => (
          <div key={role} className="flex flex-col items-center gap-1.5">
            <div className={cn(
              "w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-muted/50 p-1",
              "transition-transform duration-200",
              isSelected && "ring-2 ring-primary/20"
            )}>
              <img
                src={avatarSet.avatars[role]}
                alt={FAMILY_ROLE_LABELS[role]}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {FAMILY_ROLE_LABELS[role]}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
};

export default AvatarSetCard;
