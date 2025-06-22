import { Loan } from "../types";

export const calculateMonthlyDue = (
  totalPrice: number,
  downpayment: number,
  terms: number,
  monthlyInterestPct: number
): number => {
  const principal = totalPrice - downpayment;
  const monthlyInterest = monthlyInterestPct / 100;
  
  // Fixed formula for monthly payment with compound interest
  return (principal * monthlyInterest) / 
    (1 - Math.pow(1 + monthlyInterest, -terms));
};

export const calculatePenalty = (
  monthlyDue: number,
  daysOverdue: number
): number => {
  const penaltyRate = 0.05; // 5% penalty per month
  const monthsOverdue = Math.floor(daysOverdue / 30);
  return monthlyDue * penaltyRate * monthsOverdue;
};

export const isLoanOverdue = (dueDate: Date): boolean => {
  const today = new Date();
  return today > dueDate;
};

export const getDaysOverdue = (dueDate: Date): number => {
  const today = new Date();
  const diffTime = Math.max(0, today.getTime() - dueDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateAmountDue = (loan: Loan): number => {
  if (!loan.dueDate) return loan.monthlyDue || 0;
  
  const daysLate = getDaysOverdue(loan.dueDate);
  const penalty = daysLate > 5 ? calculatePenalty(loan.monthlyDue || 0, daysLate) : 0;
  
  return (loan.monthlyDue || 0) + penalty;
};

export const calculateEndDate = (startDate: Date, terms: number): Date => {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + terms);
  return endDate;
};

export const calculateTotalInterest = (
  totalPrice: number,
  downpayment: number,
  terms: number,
  monthlyInterestPct: number
): number => {
  const principal = totalPrice - downpayment;
  const monthlyDue = calculateMonthlyDue(totalPrice, downpayment, terms, monthlyInterestPct);
  return monthlyDue * terms - principal;
};

export const calculateTotalAmountPayable = (
  totalPrice: number,
  downpayment: number,
  terms: number,
  monthlyInterestPct: number
): number => {
  const monthlyDue = calculateMonthlyDue(totalPrice, downpayment, terms, monthlyInterestPct);
  return monthlyDue * terms + downpayment;
};

export const calculatePaymentStatus = (loan: Loan): string => {
  if (loan.totalPaid && loan.totalPaid >= loan.totalPrice) return 'Fully Paid';
  
  if (loan.dueDate && isLoanOverdue(loan.dueDate)) {
    const daysLate = getDaysOverdue(loan.dueDate);
    return daysLate > 30 ? 'Severely Delayed' : `Delayed (${daysLate} days)`;
  }
  
  return 'Active';
};