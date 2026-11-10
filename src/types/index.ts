export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  role: Role;
  name: string;
  gender?: 'L' | 'P'; // Jenis Kelamin: L = Laki-laki, P = Perempuan
  username?: string; // For Admin/Teacher
  nik?: string; // For Admin/Teacher
  nisn?: string; // For Student
  email?: string;
  avatar?: string;
  classId?: string; // For Student
  status?: 'ACTIVE' | 'GRADUATED'; // Status siswa: ACTIVE atau GRADUATED (Lulus)
  assignedClasses?: string[]; // For Teacher (e.g. ['7A', '7B', '8C'])
  subject?: string; // For Teacher: Mata Pelajaran yang Diampu (e.g. 'Matematika', 'IPA')
  assignedSubjects?: string[]; // Optional for teachers with multiple subjects
  password?: string;
}

export interface ClassRoom {
  id: string;
  name: string; // e.g., "7A", "8B"
  grade: number; // 7, 8, 9
}

export interface Subject {
  id: string;
  name: string;
}

export interface Material {
  id: string;
  classId: string; // e.g. "7A, 7B" or "7A"
  targetClasses?: string[]; // Daftar kelas yang ditugaskan (multi-class)
  subjectId: string;
  teacherId: string;
  teacherName?: string; // Nama guru pengampu
  teacherNik?: string; // NIK guru
  teacherUsername?: string; // Username guru
  title: string;
  content: string; // Rich text / markdown
  type: 'PDF' | 'VIDEO' | 'LINK' | 'HTML';
  youtubeUrl?: string;
  pdfUrl?: string;
  linkUrl?: string;
  createdAt: string;
  semester: number;
  chapter: string;
  order: number; // For sequential learning
  hasAssignment?: boolean; // Apakah ada tugas untuk materi ini
  assignmentTitle?: string; // Judul penugasan
  assignmentInstructions?: string; // Petunjuk / instruksi tugas
  assignmentDueDate?: string; // Batas akhir pengumpulan (YYYY-MM-DDTHH:mm)
}

export interface AssignmentSubmission {
  id?: string;
  studentId: string;
  studentName?: string; // Nama lengkap siswa
  studentNisn?: string; // NISN siswa
  studentClass?: string; // Kelas siswa (e.g. "7A", "9B")
  materialId: string;
  materialTitle?: string; // Judul materi / penugasan
  subject?: string; // Mata pelajaran
  link: string;
  fileName?: string;
  fileSize?: number;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
}

export interface OfflineQueueItem {
  id: string;
  type: 'ADD_MATERIAL' | 'UPDATE_MATERIAL' | 'DELETE_MATERIAL' | 'SUBMIT_ASSIGNMENT' | 'GRADE_ASSIGNMENT' | 'SUBMIT_QUIZ';
  payload: any;
  createdAt: string;
  retries: number;
}

export interface Quiz {
  id: string;
  materialId: string;
  classId: string; // e.g. "7A, 7B" or "7A"
  targetClasses?: string[]; // Daftar kelas yang ditugaskan (multi-class)
  subjectId: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
  createdAt: string;
  startTime?: string; // Jadwal mulai pengerjaan kuis (ISO string / YYYY-MM-DDTHH:mm)
  endTime?: string; // Batas akhir pengerjaan kuis (opsional)
  isScheduled?: boolean; // Indikator apakah kuis dijadwalkan
}

export type QuestionType = 'SINGLE' | 'MCMA' | 'ESSAY';

export interface Question {
  id: string;
  text: string;
  type?: QuestionType; // 'SINGLE' (default), 'MCMA' (multiple correct answers), 'ESSAY' (uraian)
  options?: string[]; // Pilihan A, B, C, D, E (untuk SINGLE & MCMA)
  optionImages?: string[]; // Link URL / Gambar untuk setiap opsi [A, B, C, D, E]
  correctOptionIndex?: number; // Kunci jawaban untuk SINGLE (0, 1, 2, ...)
  correctOptionIndices?: number[]; // Kunci jawaban untuk MCMA (e.g. [0, 2])
  sampleAnswer?: string; // Pedoman / Kunci / Rubrik Jawaban untuk ESSAY
  points: number;
  explanation?: string;
  imageUrl?: string; // Link media gambar soal
  videoUrl?: string; // Link media video (YouTube / MP4)
  audioUrl?: string; // Link media audio (MP3 / WAV)
}

export interface ViolationLog {
  id: string;
  timestamp: string;
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'RIGHT_CLICK' | 'COPY_PASTE';
  description: string;
  durationSeconds?: number;
  questionIndex?: number;
  snapshotImage?: string; // Data URL of screenshot taken at moment of violation
  webcamImage?: string; // Data URL of webcam taken at moment of violation
}

export interface QuizResult {
  id: string;
  quizId: string;
  quizTitle?: string;
  subject?: string;
  studentId: string;
  studentName?: string;
  studentNisn?: string;
  studentClass?: string;
  score: number;
  finalScore?: number; // Score after penalties and essay grading
  answers: Record<string, any>; // questionId -> number (SINGLE) | number[] (MCMA) | string (ESSAY)
  essayScores?: Record<string, number>; // questionId -> nilai manual yang diberikan guru untuk soal essai
  submittedAt: string;
  violationsCount?: number;
  violationLogs?: ViolationLog[];
  penaltyDeduction?: number;
  disqualified?: boolean;
  teacherNote?: string;
}

export interface Attendance {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  date: string;
  records: AttendanceRecord[];
}

export interface AttendanceRecord {
  studentId: string;
  status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA';
}

export interface ForumPost {
  id: string;
  materialId: string;
  authorId: string;
  content: string;
  createdAt: string;
  replies: ForumReply[];
}

export interface ForumReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export type DatabaseCleanTarget = 
  | 'ALL' 
  | 'STUDENTS' 
  | 'TEACHERS' 
  | 'MATERIALS' 
  | 'QUIZZES' 
  | 'QUIZ_RESULTS';

export interface DatabaseCleanOptions {
  targets: DatabaseCleanTarget[];
  preserveAdmins?: boolean; // Always true to protect admin/superadmin
}

export interface DatabaseCleanSummary {
  students: number;
  teachers: number;
  materials: number;
  quizzes: number;
  quizResults: number;
}

export interface PromotionOptions {
  grade9Action: 'DELETE' | 'GRADUATE'; // 'DELETE': Hapus siswa kelas 9 dari database; 'GRADUATE': Ubah status ke LULUS / Alumni
  grade8LTarget?: string; // Target kelas untuk 8L (default: '9K' atau '9L')
}

export interface PromotionSummary {
  promotedGrade7To8: number;
  promotedGrade8To9: number;
  grade9Handled: number;
  grade9Action: 'DELETE' | 'GRADUATE';
  totalAffected: number;
}

export interface DeduplicationSummary {
  duplicatesRemoved: number;
  studentsDeduplicated: number;
  teachersDeduplicated: number;
  totalRemaining: number;
}

