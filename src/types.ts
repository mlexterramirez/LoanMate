// Updated Borrower remains the same
export interface Borrower {
  id?: string;
  fullName: string;
  homeAddress: string;
  primaryContact: string;
  contactEmail?: string;
  workAddress?: string;
  referenceContact1: { name: string; contact: string };
  referenceContact2: { name: string; contact: string };
  photoURL?: string;
  loanStats: {
    totalLoans: number;
    latePayments: number;
    totalPaid: number;
  };
}

// Updated Loan interface with new fields
export interface Loan {
  id?: string;
  borrowerId: string;
  borrowerName: string;
  itemName: string;
  totalPrice: number;
  downpayment: number;
  terms: number;
  monthlyInterestPct: number;
  startDate: any;
  dueDate?: any;
  monthlyDue: number;
  totalPaid?: number;
  paymentProgress?: string;
  penalty?: number;
  status: 'Active' | 'Delayed' | 'Fully Paid' | string;
  notes?: string;
  penaltyApplied?: boolean;
  
  // New fields for penalty system
  outstandingBalances?: {
    dueDate: any; // Keep as any for Firebase compatibility
    baseAmount: number;
    penaltyAmount: number;
  }[];
  lastPaymentDate?: any; // Keep as any for Firebase compatibility
}

// Updated Payment interface
export interface Payment {
  id?: string;
  loanId: string;
  borrowerId: string;
  paymentDate: any; 
  amountPaid: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Check';
  paymentStatus: 'Full' | 'Partial';
  
  // New field for penalty tracking
  penaltyPaid: number;
}

// New type for outstanding balances
export interface OutstandingBalance {
  dueDate: any;
  baseAmount: number;
  penaltyAmount: number;
}