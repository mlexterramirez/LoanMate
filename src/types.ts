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

export interface Installment {
  id: string;
  dueDate: Date | string;
  principalAmount: number;
  penaltyAmount?: number;
  paidAmount?: number;
  status: 'pending' | 'partial' | 'paid';
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
  loanCreatedDate: Date | string;  // Changed from startDate
  firstDueDate: Date | string;     // Changed from dueDate
  monthlyDue: number;
  totalPaid?: number;
  paymentProgress?: string;
  penalty?: number;
  status: 'Active' | 'Delayed' | 'Fully Paid' | string;
  notes?: string;
  penaltyApplied?: boolean;
  outstandingBalances?: {
    dueDate: any;
    baseAmount: number;
    penaltyAmount: number;
  }[];
  lastPaymentDate?: any;
  installments?: Installment[];
}

export interface Payment {
  id?: string;
  loanId: string;
  borrowerId: string;
  amountPaid: number;
  penaltyPaid: number;
  paymentMethod: string;
  paymentStatus: 'Full' | 'Partial';
  paymentDate: Date | null;
  notes: string;
  installmentId?: string;
}

export interface OutstandingBalance {
  dueDate: any;
  baseAmount: number;
  penaltyAmount: number;
}