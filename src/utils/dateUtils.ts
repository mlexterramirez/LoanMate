export const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  try {
    return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  } catch (error) {
    console.error('Error converting to date:', error);
    return null;
  }
};

export const formatFirestoreDate = (date: Date | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};