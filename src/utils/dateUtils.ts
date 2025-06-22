import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";

export const formatDate = (date: Date | null): string => {
  if (!date) return "";
  return format(date, "MMM dd, yyyy");
};

export const formatFirestoreDate = (timestamp: any): string => {
  if (!timestamp) return "";
  
  // Handle Firestore Timestamp
  if (timestamp instanceof Timestamp) {
    return format(timestamp.toDate(), "MMM dd, yyyy");
  }
  
  // Handle JavaScript Date
  if (timestamp instanceof Date) {
    return format(timestamp, "MMM dd, yyyy");
  }
  
  // Handle string representation
  if (typeof timestamp === 'string') {
    return format(new Date(timestamp), "MMM dd, yyyy");
  }
  
  return "";
};

export const toDate = (input: any): Date => {
  if (input instanceof Date) return input;
  if (input instanceof Timestamp) return input.toDate();
  if (typeof input === 'string') return new Date(input);
  return new Date(); // Fallback to current date
};