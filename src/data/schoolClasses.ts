/**
 * Daftar Resmi Kelas SMP (Sesuai Penugasan Kurikulum Sekolah)
 * Tingkat 7: 7A - 7L (12 Rombel)
 * Tingkat 8: 8A - 8L (12 Rombel)
 * Tingkat 9: 9A - 9K (11 Rombel)
 */

export const GRADE_7_CLASSES: string[] = [
  '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '7J', '7K', '7L'
];

export const GRADE_8_CLASSES: string[] = [
  '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '8J', '8K', '8L'
];

export const GRADE_9_CLASSES: string[] = [
  '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H', '9I', '9J', '9K'
];

export const ALL_SCHOOL_CLASSES: string[] = [
  ...GRADE_7_CLASSES,
  ...GRADE_8_CLASSES,
  ...GRADE_9_CLASSES,
];

export interface GradeGroup {
  grade: number;
  label: string;
  classes: string[];
  color: {
    bg: string;
    text: string;
    border: string;
    accent: string;
  };
}

export const SCHOOL_CLASSES_BY_GRADE: GradeGroup[] = [
  {
    grade: 7,
    label: 'Kelas 7 (Tingkat VII • 7A - 7L)',
    classes: GRADE_7_CLASSES,
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      accent: 'bg-blue-600',
    },
  },
  {
    grade: 8,
    label: 'Kelas 8 (Tingkat VIII • 8A - 8L)',
    classes: GRADE_8_CLASSES,
    color: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      accent: 'bg-emerald-600',
    },
  },
  {
    grade: 9,
    label: 'Kelas 9 (Tingkat IX • 9A - 9K)',
    classes: GRADE_9_CLASSES,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      accent: 'bg-purple-600',
    },
  },
];

export function getGradeFromClass(className: string): number {
  if (className.startsWith('7')) return 7;
  if (className.startsWith('8')) return 8;
  if (className.startsWith('9')) return 9;
  return 0;
}
