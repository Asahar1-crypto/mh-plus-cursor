import { describe, it, expect } from 'vitest';
import { educationLevelForGrade, suggestGradeFromBirthDate } from '../education';

describe('educationLevelForGrade', () => {
  it('null/undefined -> null', () => {
    expect(educationLevelForGrade(null)).toBeNull();
    expect(educationLevelForGrade(undefined)).toBeNull();
    expect(educationLevelForGrade(Number.NaN)).toBeNull();
  });

  it('grade 0 and below -> kindergarten', () => {
    expect(educationLevelForGrade(0)).toBe('kindergarten');
    expect(educationLevelForGrade(-1)).toBe('kindergarten');
  });

  it('grades 1-6 -> elementary', () => {
    for (const g of [1, 2, 3, 4, 5, 6]) {
      expect(educationLevelForGrade(g)).toBe('elementary');
    }
  });

  it('grades 7-9 -> middle_school', () => {
    for (const g of [7, 8, 9]) {
      expect(educationLevelForGrade(g)).toBe('middle_school');
    }
  });

  it('grades 10-12 -> high_school', () => {
    for (const g of [10, 11, 12]) {
      expect(educationLevelForGrade(g)).toBe('high_school');
    }
  });

  it('out-of-range -> null', () => {
    expect(educationLevelForGrade(13)).toBeNull();
  });
});

describe('suggestGradeFromBirthDate', () => {
  const sep2026 = new Date(2026, 8, 1); // school year 2026-2027 starts

  it('child under 3 -> null (no school)', () => {
    expect(suggestGradeFromBirthDate(new Date(2025, 0, 1), sep2026)).toBeNull();
  });

  it('3-5 year old -> 0 (גן)', () => {
    expect(suggestGradeFromBirthDate(new Date(2022, 0, 1), sep2026)).toBe(0); // age 4
    expect(suggestGradeFromBirthDate(new Date(2021, 0, 1), sep2026)).toBe(0); // age 5
  });

  it('6 year old -> grade 1', () => {
    expect(suggestGradeFromBirthDate(new Date(2020, 0, 1), sep2026)).toBe(1);
  });

  it('10 year old -> grade 5', () => {
    expect(suggestGradeFromBirthDate(new Date(2016, 0, 1), sep2026)).toBe(5);
  });

  it('15 year old -> grade 10 (תיכון)', () => {
    expect(suggestGradeFromBirthDate(new Date(2011, 0, 1), sep2026)).toBe(10);
  });

  it('caps at grade 12 for adults', () => {
    expect(suggestGradeFromBirthDate(new Date(1990, 0, 1), sep2026)).toBe(12);
  });

  it('uses previous Sep-start when today is before September', () => {
    // In April 2026, "current school year" is 2025-2026 which started Sep 2025.
    const apr2026 = new Date(2026, 3, 21);
    // Child born 2020 -> age 5 on Sep 1 2025 -> גן (0)
    expect(suggestGradeFromBirthDate(new Date(2020, 0, 1), apr2026)).toBe(0);
    // Child born 2019 -> age 6 on Sep 1 2025 -> 1st grade
    expect(suggestGradeFromBirthDate(new Date(2019, 0, 1), apr2026)).toBe(1);
  });
});
