/**
 * Client-side mirror of the `public.education_level_for_grade` Postgres
 * function. Kept in sync manually; also used by onboarding to preview the
 * derived level before the child row is saved.
 */

import type { EducationLevel } from '@/integrations/supabase/custodyTypes';

export function educationLevelForGrade(grade: number | null | undefined): EducationLevel | null {
  if (grade == null || Number.isNaN(grade)) return null;
  if (grade <= 0) return 'kindergarten';
  if (grade >= 1 && grade <= 6) return 'elementary';
  if (grade >= 7 && grade <= 9) return 'middle_school';
  if (grade >= 10 && grade <= 12) return 'high_school';
  return null;
}

/**
 * Suggest a grade based on birth date and the current school year start.
 * Israeli rule of thumb: child starts 1st grade in Sep of the year they
 * turn 6. So: grade = (today.year or previous Sep-year) - birth.year - 5.
 * Capped to 0..12. Returns null when the child is younger than 3 (no school).
 */
export function suggestGradeFromBirthDate(
  birthDate: Date,
  today: Date = new Date(),
): number | null {
  const schoolYearStart =
    today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  // Age at the start of the current school year.
  const ageAtSept = schoolYearStart - birthDate.getFullYear();
  if (ageAtSept < 3) return null;
  if (ageAtSept < 6) return 0; // גן
  const grade = ageAtSept - 5;
  if (grade > 12) return 12;
  return grade;
}
