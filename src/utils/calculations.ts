import { Loan, OutstandingBalance } from "../types";

export const calculateMonthlyDue = (
  totalPrice: number,
  downpayment: number,
  terms: number,
  monthlyInterestPct: number
): number => {
  const principal = totalPrice - downpayment;
  const monthlyInterest = monthlyInterestPct / 100;
  
  return (principal * monthlyInterest) / 
    (1 - Math.pow(1 + monthlyInterest, -terms));
};

export const calculatePenaltyForBalance = (balance: number, daysOverdue: number): number => {
  const penaltyRate = 0.03; // 3% penalty
  const penaltyMonths = Math.max(1, Math.floor(daysOverdue / 30));
  return balance * penaltyRate * penaltyMonths;
};

export const calculateTotalAmountDue = (loan: Loan): number => {
  if (!loan.outstandingBalances || loan.outstandingBalances.length === 0) {
    return loan.monthlyDue;
  }
  
  const today = new Date();
  return loan.outstandingBalances.reduce((total, balance) => {
    const daysLate = Math.max(0, Math.floor((today.getTime() - balance.dueDate.getTime()) / (1000 * 60 * 60 * 24)) - 5;
    const penalty = daysLate > 0 ? calculatePenaltyForBalance(balance.baseAmount, daysLate) : 0;
    return total + balance.baseAmount + penalty;
  }, 0);
};

export const updateLoanStatus = (loan: Loan): Loan => {
  const today = new Date();
  
  // Check if fully paid
  if (loan.totalPaid >= loan.totalPrice) {
    return {
      ...loan,
      status: 'Fully Paid',
      outstandingBalances: [],
      penalty: 0
    };
  }
  
  // Initialize outstandingBalances if not exists
  const outstandingBalances = loan.outstandingBalances || [];
  
  // Check if current due date is passed and not paid
  if (loan.dueDate < today) {
    const existingBalance = outstandingBalances.find(b => 
      b.dueDate.getTime() === loan.dueDate.getTime()
    );
    
    if (!existingBalance) {
      // Add new outstanding balance
      outstandingBalances.push({
        dueDate: new Date(loan.dueDate),
        baseAmount: loan.monthlyDue,
        penaltyAmount: 0
      });
    }
  }
  
  // Calculate total penalty
  let totalPenalty = 0;
  const updatedBalances = outstandingBalances.map(balance => {
    const daysLate = Math.max(0, Math.floor((today.getTime() - balance.dueDate.getTime()) / (1000 * 60 * 60 * 24)) - 5;
    const penalty = daysLate > 0 ? calculatePenaltyForBalance(balance.baseAmount, daysLate) : 0;
    totalPenalty += penalty;
    return {
      ...balance,
      penaltyAmount: penalty
    };
  });
  
  // Determine status
  let status = 'Active';
  if (updatedBalances.length > 0) {
    const daysLate = Math.max(0, Math.floor((today.getTime() - updatedBalances[0].dueDate.getTime()) / (1000 * 60 * 60 * 24)) - 5;
    status = daysLate > 30 ? 'Severely Delayed' : `Delayed (${daysLate} days)`;
  }
  
  return {
    ...loan,
    outstandingBalances: updatedBalances,
    penalty: totalPenalty,
    status
  };
};

export const calculateNextDueDate = (lastPaymentDate: Date, originalDueDate: Date): Date => {
  const dueDay = originalDueDate.getDate();
  const nextDue = new Date(lastPaymentDate);
  nextDue.setMonth(nextDue.getMonth() + 1);
  const nextMonth = nextDue.getMonth();
  const nextYear = nextDue.getFullYear();
  const lastDayOfNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  const nextDueDay = Math.min(dueDay, lastDayOfNextMonth);
  return new Date(nextYear, nextMonth, nextDueDay);
};

export const getDayWithSuffix = (date: Date) => {
  const day = date.getDate();
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
};

export const calculateDaysLate = (dueDate?: Date) => {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = Math.max(0, today.getTime() - due.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};