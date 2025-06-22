import { Loan, OutstandingBalance } from '../types';

export const calculateMonthlyDue = (
  totalPrice: number,
  downpayment: number,
  terms: number,
  monthlyInterestPct: number
): number => {
  const financedAmount = totalPrice - downpayment;
  const monthlyInterest = monthlyInterestPct / 100;
  const numerator = financedAmount * monthlyInterest * Math.pow(1 + monthlyInterest, terms);
  const denominator = Math.pow(1 + monthlyInterest, terms) - 1;
  
  return numerator / denominator;
};

export const calculateDaysLate = (dueDate?: Date | null): number => {
  if (!dueDate) return 0;
  
  const today = new Date();
  const timeDiff = today.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
};

export const calculateTotalAmountDue = (loan: Loan): number => {
  if (!loan.outstandingBalances || loan.outstandingBalances.length === 0) {
    return 0;
  }
  
  return loan.outstandingBalances.reduce((total, balance) => {
    return total + balance.baseAmount + balance.penaltyAmount;
  }, 0);
};

export const calculatePenaltyForBalance = (baseAmount: number, daysLate: number): number => {
  const monthsLate = Math.ceil(daysLate / 30);
  const penaltyRate = 0.03; // 3% per month
  return baseAmount * penaltyRate * monthsLate;
};

export const updateLoanStatus = (loan: Loan): Loan => {
  const today = new Date();
  
  // Check if fully paid
  if ((loan.totalPaid || 0) >= loan.totalPrice) {
    return {
      ...loan,
      status: 'Fully Paid',
      outstandingBalances: [],
      penalty: 0
    };
  }
  
  let outstandingBalances = [...(loan.outstandingBalances || [])];
  
  // Add new outstanding balance if due date has passed and no payment has been made
  if (loan.dueDate && loan.dueDate < today) {
    const lastDueDate = new Date(loan.dueDate);
    const daysSinceLastDue = Math.floor((today.getTime() - lastDueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only add new balance if it's been more than 30 days since last addition
    if (daysSinceLastDue >= 30) {
      const monthsPassed = Math.floor(daysSinceLastDue / 30);
      
      for (let i = 0; i < monthsPassed; i++) {
        const newDueDate = new Date(lastDueDate);
        newDueDate.setMonth(newDueDate.getMonth() + i + 1);
        
        // Only add if not already in outstandingBalances
        if (!outstandingBalances.some(b => 
          b.dueDate?.getTime() === newDueDate.getTime() && 
          b.baseAmount === loan.monthlyDue
        )) {
          outstandingBalances.push({
            dueDate: newDueDate,
            baseAmount: loan.monthlyDue,
            penaltyAmount: 0
          });
        }
      }
    }
  }
  
  // Calculate penalties for each outstanding balance
  let totalPenalty = 0;
  const updatedBalances = outstandingBalances.map(balance => {
    const daysLate = Math.max(0, calculateDaysLate(balance.dueDate) - 5);
    const penalty = daysLate > 0 ? calculatePenaltyForBalance(balance.baseAmount, daysLate) : 0;
    totalPenalty += penalty;
    return {
      ...balance,
      penaltyAmount: penalty
    };
  });
  
  // Update loan status based on oldest balance
  let status = 'Active';
  if (updatedBalances.length > 0) {
    const daysLate = Math.max(0, calculateDaysLate(updatedBalances[0].dueDate) - 5);
    status = daysLate > 30 ? 'Severely Delayed' : `Delayed (${daysLate} days)`;
  }
  
  return {
    ...loan,
    status,
    penalty: totalPenalty,
    outstandingBalances: updatedBalances
  };
};

export const calculateNextDueDate = (lastPaymentDate?: Date | null): Date => {
  const nextDueDate = lastPaymentDate ? new Date(lastPaymentDate) : new Date();
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  return nextDueDate;
};

// Add the missing function
export const getDayWithSuffix = (date: Date): string => {
  const day = date.getDate();
  if (day > 3 && day < 21) return day + 'th';
  switch (day % 10) {
    case 1: return day + 'st';
    case 2: return day + 'nd';
    case 3: return day + 'rd';
    default: return day + 'th';
  }
};