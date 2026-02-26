import React, { useState, useMemo } from 'react';
import { Trash2, MessageSquare, Check, Users, ChevronDown, ChevronLeft, Calendar, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ParentSelector from './ParentSelector';
import { CustodyAssignment } from '@/integrations/supabase/custodyService';
import { AccountMember } from '@/contexts/auth/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface CustodyTableProps {
  assignments: CustodyAssignment[];
  members: AccountMember[];
  onAssignParent: (id: string, parentId: string | null) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
  onBulkAssign: (ids: string[], parentId: string | null) => void;
}

const educationLevelLabels: Record<string, string> = {
  kindergarten: 'גנים',
  elementary: 'יסודי',
  middle_school: 'חטיבה',
  high_school: 'תיכון',
};

function formatDateHebrew(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDateHebrew(start);
  return `${formatDateHebrew(start)} - ${formatDateHebrew(end)}`;
}

function getParentColor(parentId: string | null, members: AccountMember[]): string {
  if (!parentId) return '';
  const idx = members.findIndex((m) => m.user_id === parentId);
  if (idx === 0) return 'border-r-4 border-r-blue-400 bg-blue-50 dark:bg-blue-950/30';
  if (idx === 1) return 'border-r-4 border-r-emerald-400 bg-emerald-50 dark:bg-emerald-950/30';
  return 'border-r-4 border-r-purple-400 bg-purple-50 dark:bg-purple-950/30';
}

interface GroupedRow {
  type: 'standalone' | 'group-header';
  assignment?: CustodyAssignment;
  groupName?: string;
  children?: CustodyAssignment[];
}

function groupAssignments(assignments: CustodyAssignment[]): GroupedRow[] {
  const groups = new Map<string, CustodyAssignment[]>();

  for (const a of assignments) {
    if (a.parent_event) {
      const key = a.parent_event;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
  }

  const rows: GroupedRow[] = [];
  const processedParents = new Set<string>();

  for (const a of assignments) {
    if (a.parent_event) {
      const key = a.parent_event;
      if (!processedParents.has(key)) {
        processedParents.add(key);
        const children = groups.get(key) || [];
        rows.push({
          type: 'group-header',
          groupName: a.parent_event,
          children: children.sort((x, y) => x.start_date.localeCompare(y.start_date)),
        });
      }
    } else {
      rows.push({ type: 'standalone', assignment: a });
    }
  }

  rows.sort((a, b) => {
    const dateA = a.type === 'standalone' ? a.assignment!.start_date : a.children![0]?.start_date || '';
    const dateB = b.type === 'standalone' ? b.assignment!.start_date : b.children![0]?.start_date || '';
    return dateA.localeCompare(dateB);
  });

  return rows;
}

const CustodyTable: React.FC<CustodyTableProps> = ({
  assignments,
  members,
  onAssignParent,
  onUpdateNotes,
  onDelete,
  onBulkAssign,
}) => {
  const isMobile = useIsMobile();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedRows = useMemo(() => groupAssignments(assignments), [assignments]);

  const toggleExpand = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === assignments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assignments.map((a) => a.id)));
    }
  };

  const toggleSelectGroup = (children: CustodyAssignment[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = children.every((c) => next.has(c.id));
      if (allSelected) {
        children.forEach((c) => next.delete(c.id));
      } else {
        children.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const startEditNote = (a: CustodyAssignment) => {
    setEditingNoteId(a.id);
    setNoteText(a.notes || '');
  };

  const saveNote = () => {
    if (editingNoteId) {
      onUpdateNotes(editingNoteId, noteText);
      setEditingNoteId(null);
      setNoteText('');
    }
  };

  const handleBulkAssign = (parentId: string | null) => {
    onBulkAssign(Array.from(selectedIds), parentId);
    setSelectedIds(new Set());
  };

  if (assignments.length === 0) return null;

  const renderTypeBadge = (a: CustodyAssignment) => (
    <Badge
      variant={a.event_type === 'holiday' ? 'default' : 'secondary'}
      className={`text-[10px] px-1.5 py-0 ${
        a.event_type === 'holiday'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      }`}
    >
      {a.event_type === 'holiday' ? 'חג' : 'חופשה'}
    </Badge>
  );

  const renderGroupBadges = (children: CustodyAssignment[]) => {
    const hasHolidays = children.some((c) => c.event_type === 'holiday');
    const hasVacations = children.some((c) => c.event_type === 'vacation');
    return (
      <div className="flex items-center gap-1">
        {hasHolidays && (
          <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200">
            <Calendar className="h-2.5 w-2.5 ml-0.5" />
            חגים
          </Badge>
        )}
        {hasVacations && (
          <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200">
            <GraduationCap className="h-2.5 w-2.5 ml-0.5" />
            חופשה
          </Badge>
        )}
      </div>
    );
  };

  // ===== MOBILE CARD VIEW =====
  const renderMobileCard = (a: CustodyAssignment, isChild = false) => (
    <div
      key={a.id}
      className={`rounded-lg border p-3 space-y-2 transition-colors ${getParentColor(a.assigned_parent_id, members)} ${isChild ? 'mr-4 border-dashed' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Checkbox
            checked={selectedIds.has(a.id)}
            onCheckedChange={() => toggleSelect(a.id)}
          />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {isChild && <span className="text-muted-foreground ml-1">┗ </span>}
              {a.event_name}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDateRange(a.start_date, a.end_date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {renderTypeBadge(a)}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>מחיקת אירוע</AlertDialogTitle>
                <AlertDialogDescription>
                  האם למחוק את "{a.event_name}"?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ביטול</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(a.id)}>מחק</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground flex-shrink-0">הורה:</span>
        <ParentSelector
          value={a.assigned_parent_id}
          members={members}
          onChange={(pid) => onAssignParent(a.id, pid)}
          compact
        />
      </div>
      {editingNoteId === a.id ? (
        <div className="flex items-center gap-1">
          <Input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => e.key === 'Enter' && saveNote()}
            autoFocus
            placeholder="הערה..."
          />
          <Button variant="ghost" size="sm" onClick={saveNote} className="h-7 w-7 p-0">
            <Check className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => startEditNote(a)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 w-full"
        >
          <MessageSquare className="h-3 w-3 flex-shrink-0" />
          {a.notes ? (
            <span className="truncate">{a.notes}</span>
          ) : (
            <span className="opacity-50">הוסף הערה</span>
          )}
        </button>
      )}
    </div>
  );

  const renderMobileGroupHeader = (row: GroupedRow) => {
    const children = row.children || [];
    const isExpanded = expandedGroups.has(row.groupName!);
    const allChildrenSelected = children.length > 0 && children.every((c) => selectedIds.has(c.id));
    const firstDate = children[0]?.start_date || '';
    const lastDate = children[children.length - 1]?.end_date || '';

    return (
      <div key={`group-${row.groupName}`} className="space-y-2">
        <div
          className="rounded-lg border p-3 bg-gradient-to-l from-violet-50/80 to-card dark:from-violet-950/20 cursor-pointer active:bg-violet-50/60"
          onClick={() => toggleExpand(row.groupName!)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={allChildrenSelected}
                  onCheckedChange={() => toggleSelectGroup(children)}
                />
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-violet-600" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-violet-600" />
              )}
              <div>
                <p className="font-semibold text-sm">תקופת {row.groupName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatDateRange(firstDate, lastDate)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {renderGroupBadges(children)}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-300 text-violet-700 dark:text-violet-400">
                {children.length} פריטים
              </Badge>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="space-y-2">
            {children.map((child) => renderMobileCard(child, true))}
          </div>
        )}
      </div>
    );
  };

  // ===== DESKTOP TABLE VIEW =====
  const renderDesktopRow = (a: CustodyAssignment, isChild = false) => (
    <TableRow
      key={a.id}
      className={`transition-colors ${getParentColor(a.assigned_parent_id, members)} ${isChild ? 'bg-opacity-60' : ''}`}
    >
      <TableCell className="text-center">
        <Checkbox
          checked={selectedIds.has(a.id)}
          onCheckedChange={() => toggleSelect(a.id)}
        />
      </TableCell>
      <TableCell className="font-mono text-sm whitespace-nowrap">
        {formatDateRange(a.start_date, a.end_date)}
      </TableCell>
      <TableCell className={`font-medium ${isChild ? 'pr-8' : ''}`}>
        {isChild && <span className="text-muted-foreground ml-1">┗</span>}
        {a.event_name}
      </TableCell>
      <TableCell>
        {renderTypeBadge(a)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
        {a.education_level ? educationLevelLabels[a.education_level] || a.education_level : '—'}
      </TableCell>
      <TableCell>
        <ParentSelector
          value={a.assigned_parent_id}
          members={members}
          onChange={(pid) => onAssignParent(a.id, pid)}
          compact
        />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {editingNoteId === a.id ? (
          <div className="flex items-center gap-1">
            <Input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="h-7 text-xs w-[120px]"
              onKeyDown={(e) => e.key === 'Enter' && saveNote()}
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={saveNote} className="h-7 w-7 p-0">
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => startEditNote(a)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <MessageSquare className="h-3 w-3" />
                {a.notes ? (
                  <span className="max-w-[100px] truncate">{a.notes}</span>
                ) : (
                  <span className="opacity-50">הוסף הערה</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{a.notes || 'לחץ להוספת הערה'}</TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת אירוע</AlertDialogTitle>
              <AlertDialogDescription>
                האם למחוק את "{a.event_name}"? פעולה זו אינה ניתנת לביטול.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(a.id)}>מחק</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );

  const renderDesktopGroupHeader = (row: GroupedRow) => {
    const children = row.children || [];
    const isExpanded = expandedGroups.has(row.groupName!);
    const allChildrenSelected = children.length > 0 && children.every((c) => selectedIds.has(c.id));
    const firstDate = children[0]?.start_date || '';
    const lastDate = children[children.length - 1]?.end_date || '';

    return (
      <React.Fragment key={`group-${row.groupName}`}>
        <TableRow
          className="bg-gradient-to-l from-violet-50/80 to-transparent dark:from-violet-950/20 cursor-pointer hover:bg-violet-50/60 dark:hover:bg-violet-950/30 transition-colors"
          onClick={() => toggleExpand(row.groupName!)}
        >
          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={allChildrenSelected}
              onCheckedChange={() => toggleSelectGroup(children)}
            />
          </TableCell>
          <TableCell className="font-mono text-sm whitespace-nowrap text-muted-foreground">
            {formatDateRange(firstDate, lastDate)}
          </TableCell>
          <TableCell className="font-semibold">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-violet-600 transition-transform" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-violet-600 transition-transform" />
              )}
              <span>תקופת {row.groupName}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-300 text-violet-700 dark:text-violet-400">
                {children.length} פריטים
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            {renderGroupBadges(children)}
          </TableCell>
          <TableCell className="hidden lg:table-cell"></TableCell>
          <TableCell></TableCell>
          <TableCell className="hidden md:table-cell"></TableCell>
          <TableCell></TableCell>
        </TableRow>
        {isExpanded && children.map((child) => renderDesktopRow(child, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-3">
      {/* Bulk assign bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-primary/5 rounded-lg border border-primary/20 animate-fade-in">
          <Users className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{selectedIds.size} נבחרו</span>
          <ParentSelector
            value={null}
            members={members}
            onChange={handleBulkAssign}
            compact
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs h-8"
          >
            בטל
          </Button>
        </div>
      )}

      {/* MOBILE: Card layout */}
      {isMobile ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={toggleSelectAll}
              className="text-xs text-primary font-medium"
            >
              {selectedIds.size === assignments.length ? 'בטל הכל' : 'בחר הכל'}
            </button>
          </div>
          {groupedRows.map((row) => {
            if (row.type === 'group-header') {
              return renderMobileGroupHeader(row);
            }
            return renderMobileCard(row.assignment!);
          })}
        </div>
      ) : (
        /* DESKTOP: Table layout */
        <div className="rounded-xl border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={selectedIds.size === assignments.length && assignments.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-right font-semibold">תאריכים</TableHead>
                <TableHead className="text-right font-semibold">אירוע</TableHead>
                <TableHead className="text-right font-semibold">סוג</TableHead>
                <TableHead className="text-right font-semibold hidden lg:table-cell">מסגרת</TableHead>
                <TableHead className="text-right font-semibold">הורה משובץ</TableHead>
                <TableHead className="text-right font-semibold hidden md:table-cell">הערות</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedRows.map((row) => {
                if (row.type === 'group-header') {
                  return renderDesktopGroupHeader(row);
                }
                return renderDesktopRow(row.assignment!);
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CustodyTable;
