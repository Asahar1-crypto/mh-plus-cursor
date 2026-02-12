import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useExpense } from '@/contexts/ExpenseContext';
import { categoryService } from '@/integrations/supabase/categoryService';
import { toast } from 'sonner';

interface CategoriesCardProps {
  isAdmin?: boolean;
}

export const CategoriesCard: React.FC<CategoriesCardProps> = ({ isAdmin = false }) => {
  const { account } = useAuth();
  const { categoriesList, refreshData } = useExpense();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async () => {
    if (!account || !newName.trim()) return;
    try {
      await categoryService.addCategory(account, newName.trim());
      setNewName('');
      await refreshData();
      toast.success('הקטגוריה נוספה בהצלחה');
    } catch (error) {
      toast.error('שגיאה בהוספת הקטגוריה');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!account || !editingName.trim()) return;
    try {
      await categoryService.updateCategory(account, id, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      await refreshData();
      toast.success('הקטגוריה עודכנה בהצלחה');
    } catch (error) {
      toast.error('שגיאה בעדכון הקטגוריה');
    }
  };

  const handleDelete = async (id: string) => {
    if (!account) return;
    if (!confirm('האם למחוק קטגוריה זו? הוצאות עם קטגוריה זו ישארו עם אותה קטגוריה.')) return;
    try {
      await categoryService.deleteCategory(account, id);
      await refreshData();
      toast.success('הקטגוריה נמחקה');
    } catch (error) {
      toast.error('שגיאה במחיקת הקטגוריה');
    }
  };

  const categories = categoriesList.length > 0 ? categoriesList : [];

  return (
    <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          קטגוריות הוצאות
        </CardTitle>
        <CardDescription>
          ניהול קטגוריות מותאמות אישית להוצאות החשבון
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="flex gap-2">
            <Input
              placeholder="שם קטגוריה חדשה"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newName.trim()}>
              <Plus className="h-4 w-4 ml-1" />
              הוסף
            </Button>
          </div>
        )}
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
              {editingId === cat.id && isAdmin ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleUpdate(cat.id)}>שמור</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingName(''); }}>ביטול</Button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 font-medium">{cat.name}</span>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">אין קטגוריות מותאמות. השתמש בקטגוריות ברירת המחדל או הוסף חדשות.</p>
        )}
      </CardContent>
    </Card>
  );
};
