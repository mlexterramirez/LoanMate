export interface Borrower {
  id?: string;
  fullName: string;
  homeAddress: string;
  workAddress?: string;
  primaryContact: string;
  contactEmail?: string;
  referenceContact1?: { name: string; contact: string };
  referenceContact2?: { name: string; contact: string };
  photoURL?: string;
  loanStats: {
    totalLoans: number;
    latePayments: number;
    totalPaid: number;
  };
}

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
}

export interface Payment {
  id?: string;
  loanId: string;
  borrowerId: string;
  paymentDate: any;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Check';
  paymentStatus: 'Full' | 'Partial';
}