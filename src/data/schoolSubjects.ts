/**
 * Daftar Resmi Mata Pelajaran Sekolah Menengah Pertama (SMP)
 * Kurikulum Nasional / Kurikulum Merdeka & K13
 */

export interface SchoolSubject {
  id: string;
  name: string;
  category: 'Wajib' | 'Muatan Lokal' | 'Pilihan' | 'Bimbingan';
  color: {
    bg: string;
    text: string;
    border: string;
  };
}

export const STANDARD_SCHOOL_SUBJECTS: SchoolSubject[] = [
  {
    id: 'Pendidikan Agama & Budi Pekerti',
    name: 'Pendidikan Agama & Budi Pekerti',
    category: 'Wajib',
    color: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  },
  {
    id: 'Pendidikan Pancasila',
    name: 'Pendidikan Pancasila / PPKn',
    category: 'Wajib',
    color: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  },
  {
    id: 'Bahasa Indonesia',
    name: 'Bahasa Indonesia',
    category: 'Wajib',
    color: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  },
  {
    id: 'Matematika',
    name: 'Matematika',
    category: 'Wajib',
    color: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  },
  {
    id: 'Ilmu Pengetahuan Alam (IPA)',
    name: 'Ilmu Pengetahuan Alam (IPA)',
    category: 'Wajib',
    color: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  },
  {
    id: 'Ilmu Pengetahuan Sosial (IPS)',
    name: 'Ilmu Pengetahuan Sosial (IPS)',
    category: 'Wajib',
    color: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  },
  {
    id: 'Bahasa Inggris',
    name: 'Bahasa Inggris',
    category: 'Wajib',
    color: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  },
  {
    id: 'PJOK',
    name: 'Pendidikan Jasmani, Olahraga, & Kesehatan (PJOK)',
    category: 'Wajib',
    color: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  },
  {
    id: 'Informatika',
    name: 'Informatika / TIK',
    category: 'Wajib',
    color: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  },
  {
    id: 'Seni Budaya',
    name: 'Seni Budaya (Musik, Rupa, Tari, Teater)',
    category: 'Wajib',
    color: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  },
  {
    id: 'Prakarya',
    name: 'Prakarya',
    category: 'Pilihan',
    color: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  },
  {
    id: 'Bahasa Daerah / Sunda / Jawa',
    name: 'Bahasa Daerah (Muatan Lokal)',
    category: 'Muatan Lokal',
    color: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  },
  {
    id: 'Bimbingan Konseling (BK)',
    name: 'Bimbingan dan Konseling (BK)',
    category: 'Bimbingan',
    color: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  },
];

export const SUBJECT_NAMES: string[] = STANDARD_SCHOOL_SUBJECTS.map(s => s.name);
