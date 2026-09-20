export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  role: Role;
  name: string;
  username?: string; // For Admin/Teacher
  nik?: string; // For Admin/Teacher
  nisn?: string; // For Student
  email?: string;
  avatar?: string;
  classId?: string; // For Student
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
  classId: string;
  subjectId: string;
  teacherId: string;
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
}

export interface Quiz {
  id: string;
  materialId: string;
  classId: string;
  subjectId: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
  explanation?: string;
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
  studentId: string;
  score: number;
  finalScore?: number; // Score after penalties
  answers: Record<string, number>; // questionId -> optionIndex
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
