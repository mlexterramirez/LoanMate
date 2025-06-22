import { format } from "date-fns";

export const formatFirestoreDate = (timestamp: any): string => {
  if (!timestamp) return "";
  return format(timestamp.toDate(), "MMM dd, yyyy");
};

export const formatDate = (date: Date): string => {
  return format(date, "MMM dd, yyyy");
};