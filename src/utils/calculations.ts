import { Loan, OutstandingBalance, Installment } from '../types';

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
  today.setHours(0, 0, 0, 0);
  const normalizedDueDate = new Date(dueDate);
  normalizedDueDate.setHours(0, 0, 0, 0);
  const timeDiff = today.getTime() - normalizedDueDate.getTime();
  return Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
};

export const calculateTotalAmountDue = (loan: Loan): number => {
  if (!loan.outstandingBalances || loan.outstandingBalances.length === 0) {
    return loan.monthlyDue || 0;
  }
  return loan.outstandingBalances.reduce((total, balance) => {
    return total + (balance.baseAmount || 0) + (balance.penaltyAmount || 0);
  }, 0);
};

export const calculatePenaltyForBalance = (baseAmount: number, daysLate: number): number => {
  const penaltyRate = 0.03;
  const penaltyPerDay = (baseAmount * penaltyRate) / 30;
  return penaltyPerDay * daysLate;
};

export const generateInstallments = (
  startDate: Date,
  terms: number,
  monthlyDue: number
): Installment[] => {
  const installments: Installment[] = [];
  const dueDate = new Date(startDate);

  for (let i = 0; i < terms; i++) {
    const installmentDueDate = new Date(dueDate);
    installmentDueDate.setMonth(dueDate.getMonth() + i + 1);
    
    installments.push({
      id: `installment_${i+1}`,
      dueDate: installmentDueDate,
      principalAmount: monthlyDue,
      penaltyAmount: 0,
      paidAmount: 0,
      status: 'pending'
    });
  }
  return installments;
};

export const calculatePaidInstallments = (loan: Loan): number => {
  if (!loan.installments) return 0;
  return loan.installments.filter(inst => inst.status === 'paid').length;
};

export const getNextUnpaidDueDate = (loan: Loan): Date | null => {
  if (!loan.installments) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextInstallment = loan.installments
    .filter(inst => inst.status === 'pending')
    .sort((a, b) => {
      const aDate = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
      const bDate = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate);
      return aDate.getTime() - bDate.getTime();
    })
    .find(inst => {
      const dueDate = inst.dueDate instanceof Date ? inst.dueDate : new Date(inst.dueDate);
      return dueDate >= today;
    });
  
  return nextInstallment ? 
    (nextInstallment.dueDate instanceof Date ? 
      nextInstallment.dueDate : 
      new Date(nextInstallment.dueDate)) : 
    null;
};

export const updateLoanStatus = (loan: Loan): Loan => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if ((loan.totalPaid || 0) >= (loan.totalPrice || 0)) {
    return {
      ...loan,
      status: 'Fully Paid',
      outstandingBalances: [],
      penalty: 0
    };
  }
  
  let outstandingBalances = [...(loan.outstandingBalances || [])];
  
  if (loan.dueDate) {
    const loanDueDate = new Date(loan.dueDate);
    loanDueDate.setHours(0, 0, 0, 0);
    
    if (loanDueDate < today) {
      const daysLate = calculateDaysLate(loanDueDate);
      
      if (daysLate >= 30) {
        const monthsPassed = Math.floor(daysLate / 30);
        
        for (let i = 0; i < monthsPassed; i++) {
          const newDueDate = new Date(loanDueDate);
          newDueDate.setMonth(newDueDate.getMonth() + i + 1);
          
          if (!outstandingBalances.some(b => 
            b.dueDate && new Date(b.dueDate).getTime() === newDueDate.getTime()
          )) {
            outstandingBalances.push({
              dueDate: newDueDate,
              baseAmount: loan.monthlyDue || 0,
              penaltyAmount: 0
            });
          }
        }
      }
    }
  }
  
  let totalPenalty = 0;
  const updatedBalances = outstandingBalances.map(balance => {
    if (!balance.dueDate) return balance;
    
    const dueDate = new Date(balance.dueDate);
    const daysLate = calculateDaysLate(dueDate);
    const penalty = daysLate > 0 ? calculatePenaltyForBalance(balance.baseAmount || 0, daysLate) : 0;
    totalPenalty += penalty;
    
    return {
      ...balance,
      penaltyAmount: penalty
    };
  });
  
  let status = 'Active';
  if (updatedBalances.length > 0) {
    const firstBalance = updatedBalances[0];
    if (firstBalance.dueDate) {
      const daysLate = calculateDaysLate(firstBalance.dueDate);
      if (daysLate > 30) {
        status = 'Severely Delayed';
      } else if (daysLate > 0) {
        status = `Delayed (${daysLate} days)`;
      }
    }
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
  nextDueDate.setDate(1);
  nextDueDate.setHours(0, 0, 0, 0);
  return nextDueDate;
};

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