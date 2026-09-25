import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a quiz or material targets a given class.
 * Supports comma-separated strings (e.g. "7A, 7B") or array of targetClasses.
 */
export function isItemForClass(classIdField?: string, targetClassesField?: string[], targetClass?: string): boolean {
  if (!targetClass) return false;
  const cleanTarget = targetClass.trim().toUpperCase();

  if (Array.isArray(targetClassesField) && targetClassesField.length > 0) {
    if (targetClassesField.map(c => c.trim().toUpperCase()).includes(cleanTarget)) {
      return true;
    }
  }

  if (!classIdField) return false;
  const classes = classIdField.split(',').map(s => s.trim().toUpperCase());
  return classes.includes(cleanTarget);
}

/**
 * Parses target classes into an array of trimmed class names.
 */
export function parseItemClasses(classIdField?: string, targetClassesField?: string[]): string[] {
  if (Array.isArray(targetClassesField) && targetClassesField.length > 0) {
    return targetClassesField.map(s => s.trim()).filter(Boolean);
  }
  if (!classIdField) return [];
  return classIdField.split(',').map(s => s.trim()).filter(Boolean);
}

