import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes class identifiers for flexible matching.
 * Examples:
 * - "Kelas 9A" -> "9A"
 * - "9 A" -> "9A"
 * - "9-A" -> "9A"
 * - "IX A" -> "9A"
 * - "VII B" -> "7B"
 * - "VIII C" -> "8C"
 */
export function normalizeClass(c: string): string {
  if (!c) return '';
  let s = String(c).toUpperCase().trim();
  // Strip common prefixes
  s = s.replace(/^(KELAS|KLAS|TINGKAT|GRADE|RUANG|ROOM)\s*/gi, '').trim();
  // Map Roman numerals at start
  s = s.replace(/^VIII[\s\-_]*/gi, '8')
       .replace(/^VII[\s\-_]*/gi, '7')
       .replace(/^IX[\s\-_]*/gi, '9')
       .replace(/^VI[\s\-_]*/gi, '6')
       .replace(/^X[\s\-_]*/gi, '10')
       .replace(/^XI[\s\-_]*/gi, '11')
       .replace(/^XII[\s\-_]*/gi, '12');
  // Remove spaces, hyphens, dots
  s = s.replace(/[\s\-_.]/g, '');
  return s;
}

/**
 * Checks if a quiz or material targets a given class.
 * Supports comma-separated strings (e.g. "7A, 7B"), array of targetClasses,
 * grade-level matching (e.g. "9" matches "9A", "9B"),
 * and universal classes ("Semua Kelas", "All", or unrestricted).
 */
export function isItemForClass(classIdField?: string, targetClassesField?: string[] | string, targetClass?: string): boolean {
  const rawTargetUpper = (targetClass || '').trim().toUpperCase();
  const cleanTarget = normalizeClass(targetClass || '');

  // Extract all target classes from both fields
  const targetClassesList: string[] = [];
  
  if (Array.isArray(targetClassesField)) {
    for (const tc of targetClassesField) {
      if (tc && String(tc).trim()) targetClassesList.push(String(tc).trim());
    }
  } else if (typeof targetClassesField === 'string' && targetClassesField.trim()) {
    const parts = targetClassesField.split(',').map(s => s.trim()).filter(Boolean);
    targetClassesList.push(...parts);
  }

  if (classIdField && typeof classIdField === 'string' && classIdField.trim()) {
    const parts = classIdField.split(',').map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (!targetClassesList.includes(p)) {
        targetClassesList.push(p);
      }
    }
  }

  // If item has no class restriction at all (empty), it is open to all students
  if (targetClassesList.length === 0) {
    return true;
  }

  // Check if any specified target is a universal/all-class keyword
  const isUniversal = targetClassesList.some(tc => {
    const u = tc.toUpperCase();
    return u === 'SEMUA' || u === 'SEMUA KELAS' || u === 'ALL' || u === 'UMUM' || u === 'SEMUA SISWA' || u === '*';
  });
  if (isUniversal) {
    return true;
  }

  // If student has no target class specified, but item isn't universal:
  if (!cleanTarget) {
    return false;
  }

  // Check each class target
  for (const tc of targetClassesList) {
    const rawTc = tc.toUpperCase();
    const cleanTc = normalizeClass(tc);

    // 1. Exact string or normalized match (e.g. "9A" === "9A" or "Kelas 9A" === "9A")
    if (rawTc === rawTargetUpper || cleanTc === cleanTarget) {
      return true;
    }

    // 2. Grade-level match:
    // If the material is assigned to a whole grade (e.g. "9", "Kelas 9", "IX", "7", "8")
    // and the student is in a section of that grade (e.g. "9A", "9B", "9C"):
    // "9A".startsWith("9") -> MATCH!
    if (/^\d+$/.test(cleanTc) && cleanTarget.startsWith(cleanTc)) {
      return true;
    }

    // 3. Conversely, if student class is just a grade (e.g. "9") and item is "9A", match
    if (/^\d+$/.test(cleanTarget) && cleanTc.startsWith(cleanTarget)) {
      return true;
    }
  }

  return false;
}

/**
 * Parses target classes into an array of trimmed class names.
 */
export function parseItemClasses(classIdField?: string, targetClassesField?: string[] | string): string[] {
  const result: string[] = [];
  if (Array.isArray(targetClassesField) && targetClassesField.length > 0) {
    result.push(...targetClassesField.map(s => String(s).trim()).filter(Boolean));
  } else if (typeof targetClassesField === 'string' && targetClassesField.trim()) {
    result.push(...targetClassesField.split(',').map(s => s.trim()).filter(Boolean));
  }
  if (classIdField) {
    const parts = classIdField.split(',').map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (!result.includes(p)) result.push(p);
    }
  }
  return result;
}

/**
 * Safely converts any date string (ISO, GMT string, space-separated, DD/MM/YYYY, Date object)
 * into YYYY-MM-DDTHH:mm for HTML datetime-local input fields and CBT schedule comparison.
 */
export function formatDateTimeForInput(val?: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';
  
  // 1. If already YYYY-MM-DDTHH:mm format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) {
    return str;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    return str.substring(0, 16);
  }

  // 2. Space-separated format: YYYY-MM-DD HH:mm
  const spaceMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (spaceMatch) {
    return `${spaceMatch[1]}-${spaceMatch[2]}-${spaceMatch[3]}T${spaceMatch[4]}:${spaceMatch[5]}`;
  }

  // 3. Indonesian / European format: DD/MM/YYYY HH:mm or DD-MM-YYYY HH:mm
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
  if (dmyMatch) {
    const pad = (n: string | number) => String(n).padStart(2, '0');
    return `${dmyMatch[3]}-${pad(dmyMatch[2])}-${pad(dmyMatch[1])}T${pad(dmyMatch[4])}:${pad(dmyMatch[5])}`;
  }

  // 4. Handle format like "Sat Oct 10 2026 08:14:00 GMT+0700..."
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return '';
}

/**
 * Checks if a QuizResult matches a User (Student) by ID, NISN (with or without leading zeroes), or name.
 */
export function isResultMatchStudent(result: any, student: any): boolean {
  if (!result || !student) return false;
  const sId = String(student.id || '').trim();
  const sNisn = String(student.nisn || '').trim();
  const sNisnNoZero = sNisn.replace(/^0+/, '');
  const sName = String(student.name || '').trim().toLowerCase();

  const rSid = String(result.studentId || '').trim();
  const rSidNoZero = rSid.replace(/^0+/, '');
  const rNisn = String(result.studentNisn || '').trim();
  const rNisnNoZero = rNisn.replace(/^0+/, '');
  const rName = String(result.studentName || '').trim().toLowerCase();

  if (sId && (rSid === sId || rNisn === sId)) return true;
  if (sNisn && (rNisn === sNisn || rSid === sNisn)) return true;
  if (sNisnNoZero && (rNisnNoZero === sNisnNoZero || rSidNoZero === sNisnNoZero)) return true;
  if (sName && rName && sName === rName) return true;
  return false;
}

/**
 * Extracts all possible lookup keys for a student (ID, NISN, NISN without leading zero, username, name).
 */
export function getStudentLookupKeys(student: any): string[] {
  if (!student) return [];
  const keys = new Set<string>();
  if (student.id) {
    const sid = String(student.id).trim();
    if (sid) {
      keys.add(sid);
      keys.add(sid.toLowerCase());
      const sidNoZero = sid.replace(/^0+/, '');
      if (sidNoZero) keys.add(sidNoZero);
    }
  }
  if (student.nisn) {
    const raw = String(student.nisn).trim();
    if (raw) {
      keys.add(raw);
      const noZero = raw.replace(/^0+/, '');
      if (noZero) keys.add(noZero);
    }
  }
  if (student.username) {
    const u = String(student.username).trim().toLowerCase();
    if (u) keys.add(u);
  }
  if (student.name) {
    const n = String(student.name).trim().toLowerCase();
    if (n) keys.add(n);
  }
  return Array.from(keys);
}

/**
 * Checks whether a specific quiz was reset by a teacher for this student.
 */
export function isQuizResetForStudent(quizId: string, student: any, resetQuizKeys: string[] = []): boolean {
  if (!quizId || !student || !Array.isArray(resetQuizKeys) || resetQuizKeys.length === 0) return false;
  const qId = String(quizId).trim();
  const lookupKeys = getStudentLookupKeys(student).map(s => s.trim().toLowerCase());
  return resetQuizKeys.some(rawK => {
    if (!rawK) return false;
    const k = String(rawK).trim();
    const parts = k.split('::');
    if (parts.length !== 2) return false;
    const targetQid = parts[0].trim();
    const targetStudent = parts[1].trim().toLowerCase();
    const targetStudentNoZero = targetStudent.replace(/^0+/, '');

    if (targetQid !== qId) return false;
    return lookupKeys.some(sk => 
      sk === targetStudent || 
      sk === targetStudentNoZero ||
      sk.replace(/^0+/, '') === targetStudentNoZero
    );
  });
}
