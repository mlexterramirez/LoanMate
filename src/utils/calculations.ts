import { Loan } from "../types";

export const calculateMonthlyDue = (totalPrice: number, downpayment: number, terms: number, interestRate: number): number => {
  const principal = totalPrice - downpayment;
  const monthlyInterest = interestRate / 100;
  return (principal / terms) * (1 + monthlyInterest);
};

export const calculatePenalty = (unpaidAmount: number): number => {
  return unpaidAmount * 0.03;
};

export const isLoanOverdue = (dueDate: Date): boolean => {
  const today = new Date();
  const overdueDate = new Date(dueDate);
  overdueDate.setDate(overdueDate.getDate() + 5);
  return today > overdueDate;
};

export const getDaysOverdue = (dueDate: Date): number => {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - dueDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateLoanStatus = (loan: Loan): 'Active' | 'Delayed' | 'Fully Paid' => {
  if (loan.totalPaid && loan.totalPaid >= loan.totalPrice) return 'Fully Paid';
  
  if (loan.dueDate) {
    const dueDate = loan.dueDate.toDate();
    if (isLoanOverdue(dueDate)) {
      return 'Delayed';
    }
  }
  
  return 'Active';
};