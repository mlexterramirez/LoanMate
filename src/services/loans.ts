import { db } from "../firebase";
import { 
  collection, addDoc, getDocs, doc, updateDoc, getDoc, 
  query, where, deleteDoc, Timestamp 
} from "firebase/firestore";
import { Loan, OutstandingBalance } from "../types";
import { calculateMonthlyDue, updateLoanStatus } from "../utils/calculations";
import { getBorrower, updateBorrowerStats } from "./borrowers";
import { toDate } from "../utils/dateUtils";

const loansRef = collection(db, "loans");

export const addLoan = async (loan: Omit<Loan, 'id' | 'status' | 'totalPaid' | 'penalty' | 'penaltyApplied' | 'outstandingBalances' | 'lastPaymentDate'>) => {
  try {
    const borrower = await getBorrower(loan.borrowerId);
    if (!borrower) throw new Error("Borrower not found");

    const loanWithDefaults: any = {
      ...loan,
      borrowerName: borrower.fullName || '',
      monthlyDue: calculateMonthlyDue(
        loan.totalPrice || 0,
        loan.downpayment || 0,
        loan.terms || 0,
        loan.monthlyInterestPct || 0
      ),
      status: "Active",
      totalPaid: 0,
      paymentProgress: `0 of ${loan.terms || 0} payments made`,
      penalty: 0,
      penaltyApplied: false,
      outstandingBalances: [],
      lastPaymentDate: null
    };

    if (loan.startDate instanceof Date) {
      loanWithDefaults.startDate = Timestamp.fromDate(loan.startDate);
    }
    if (loan.dueDate instanceof Date) {
      loanWithDefaults.dueDate = Timestamp.fromDate(loan.dueDate);
    }

    const newLoan = await addDoc(loansRef, loanWithDefaults);
    await updateBorrowerStats(loan.borrowerId, {
      totalLoans: (borrower.loanStats?.totalLoans || 0) + 1
    });

    return newLoan.id;
  } catch (error) {
    console.error('Error adding loan:', error);
    throw error;
  }
};

export const getLoans = async (): Promise<Loan[]> => {
  try {
    const snapshot = await getDocs(loansRef);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const loan: Loan = {
        id: doc.id,
        borrowerId: data.borrowerId || '',
        borrowerName: data.borrowerName || '',
        itemName: data.itemName || '',
        totalPrice: data.totalPrice || 0,
        downpayment: data.downpayment || 0,
        terms: data.terms || 0,
        monthlyInterestPct: data.monthlyInterestPct || 0,
        startDate: data.startDate ? toDate(data.startDate) : null,
        dueDate: data.dueDate ? toDate(data.dueDate) : null,
        monthlyDue: data.monthlyDue || 0,
        paymentProgress: data.paymentProgress || '',
        notes: data.notes || '',
        status: data.status || 'Active',
        totalPaid: data.totalPaid || 0,
        penalty: data.penalty || 0,
        penaltyApplied: data.penaltyApplied || false,
        outstandingBalances: (data.outstandingBalances || []).map((b: any) => ({
          dueDate: b.dueDate ? toDate(b.dueDate) : null,
          baseAmount: b.baseAmount || 0,
          penaltyAmount: b.penaltyAmount || 0
        })),
        lastPaymentDate: data.lastPaymentDate ? toDate(data.lastPaymentDate) : null
      };
      
      // Update loan status with new penalty system
      return updateLoanStatus(loan);
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return [];
  }
};

export const getLoan = async (id: string): Promise<Loan | null> => {
  try {
    const docRef = doc(db, "loans", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const loan: Loan = {
        id: docSnap.id,
        borrowerId: data.borrowerId || '',
        borrowerName: data.borrowerName || '',
        itemName: data.itemName || '',
        totalPrice: data.totalPrice || 0,
        downpayment: data.downpayment || 0,
        terms: data.terms || 0,
        monthlyInterestPct: data.monthlyInterestPct || 0,
        startDate: data.startDate ? toDate(data.startDate) : null,
        dueDate: data.dueDate ? toDate(data.dueDate) : null,
        monthlyDue: data.monthlyDue || 0,
        paymentProgress: data.paymentProgress || '',
        notes: data.notes || '',
        status: data.status || 'Active',
        totalPaid: data.totalPaid || 0,
        penalty: data.penalty || 0,
        penaltyApplied: data.penaltyApplied || false,
        outstandingBalances: (data.outstandingBalances || []).map((b: any) => ({
          dueDate: b.dueDate ? toDate(b.dueDate) : null,
          baseAmount: b.baseAmount || 0,
          penaltyAmount: b.penaltyAmount || 0
        })),
        lastPaymentDate: data.lastPaymentDate ? toDate(data.lastPaymentDate) : null
      };
      
      return updateLoanStatus(loan);
    }
    return null;
  } catch (error) {
    console.error('Error getting loan:', error);
    return null;
  }
};

export const updateLoan = async (id: string, updates: Partial<Loan>) => {
  try {
    const loanRef = doc(db, "loans", id);
    const dataToUpdate: any = { ...updates };
    
    // Convert Date objects to Firestore Timestamps
    if (updates.startDate instanceof Date) {
      dataToUpdate.startDate = Timestamp.fromDate(updates.startDate);
    }
    if (updates.dueDate instanceof Date) {
      dataToUpdate.dueDate = Timestamp.fromDate(updates.dueDate);
    }
    if (updates.lastPaymentDate instanceof Date) {
      dataToUpdate.lastPaymentDate = Timestamp.fromDate(updates.lastPaymentDate);
    }
    
    // Convert outstandingBalances dates
    if (updates.outstandingBalances) {
      dataToUpdate.outstandingBalances = updates.outstandingBalances.map(balance => ({
        ...balance,
        dueDate: balance.dueDate instanceof Date ? 
          Timestamp.fromDate(balance.dueDate) : balance.dueDate
      }));
    }
    
    await updateDoc(loanRef, dataToUpdate);
  } catch (error) {
    console.error('Error updating loan:', error);
    throw error;
  }
};

export const deleteLoan = async (id: string) => {
  try {
    const loanRef = doc(db, "loans", id);
    await deleteDoc(loanRef);
  } catch (error) {
    console.error('Error deleting loan:', error);
    throw error;
  }
};

export const getLoansByBorrower = async (borrowerId: string): Promise<Loan[]> => {
  try {
    const q = query(loansRef, where("borrowerId", "==", borrowerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const loan: Loan = {
        id: doc.id,
        borrowerId: data.borrowerId || '',
        borrowerName: data.borrowerName || '',
        itemName: data.itemName || '',
        totalPrice: data.totalPrice || 0,
        downpayment: data.downpayment || 0,
        terms: data.terms || 0,
        monthlyInterestPct: data.monthlyInterestPct || 0,
        startDate: data.startDate ? toDate(data.startDate) : null,
        dueDate: data.dueDate ? toDate(data.dueDate) : null,
        monthlyDue: data.monthlyDue || 0,
        paymentProgress: data.paymentProgress || '',
        notes: data.notes || '',
        status: data.status || 'Active',
        totalPaid: data.totalPaid || 0,
        penalty: data.penalty || 0,
        penaltyApplied: data.penaltyApplied || false,
        outstandingBalances: (data.outstandingBalances || []).map((b: any) => ({
          dueDate: b.dueDate ? toDate(b.dueDate) : null,
          baseAmount: b.baseAmount || 0,
          penaltyAmount: b.penaltyAmount || 0
        })),
        lastPaymentDate: data.lastPaymentDate ? toDate(data.lastPaymentDate) : null
      };
      return updateLoanStatus(loan);
    });
  } catch (error) {
    console.error('Error getting loans by borrower:', error);
    return [];
  }
};

export const checkAndUpdateOverdueLoans = async () => {
  try {
    const loans = await getLoans();
    const today = new Date();
    
    for (const loan of loans) {
      if (loan.status === 'Fully Paid' || !loan.dueDate) continue;
      
      // Use the new penalty system to update loan status
      const updatedLoan = updateLoanStatus(loan);
      
      // Only update if status changed
      if (updatedLoan.status !== loan.status || updatedLoan.penalty !== loan.penalty || JSON.stringify(updatedLoan.outstandingBalances) !== JSON.stringify(loan.outstandingBalances)) {
        await updateLoan(loan.id!, {
          status: updatedLoan.status,
          penalty: updatedLoan.penalty,
          outstandingBalances: updatedLoan.outstandingBalances
        });
        
        // Update borrower stats if loan became late
        if (!loan.status.includes('Delayed') && updatedLoan.status.includes('Delayed')) {
          const borrower = await getBorrower(loan.borrowerId);
          if (borrower) {
            await updateBorrowerStats(loan.borrowerId, {
              latePayments: (borrower.loanStats?.latePayments || 0) + 1
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking overdue loans:', error);
  }
};

export const useLoanService = () => {
  return {
    getLoans,
    getLoan,
    addLoan,
    updateLoan,
    deleteLoan,
    getLoansByBorrower,
    checkAndUpdateOverdueLoans
  };
};