import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, query, where, deleteDoc, Timestamp } from "firebase/firestore";
import { Loan } from "../types";
import { calculateMonthlyDue, calculatePenalty, getDaysOverdue } from "../utils/calculations";
import { getBorrower, updateBorrowerStats } from "./borrowers";
import { toDate } from "../utils/dateUtils";

const loansRef = collection(db, "loans");

export const addLoan = async (loan: Omit<Loan, 'id' | 'status' | 'totalPaid' | 'penalty' | 'penaltyApplied'>) => {
  const borrower = await getBorrower(loan.borrowerId);
  if (!borrower) throw new Error("Borrower not found");
  
  // Convert Date objects to Firestore Timestamps
  const loanWithTimestamp: any = {
    ...loan,
    borrowerName: borrower.fullName,
    monthlyDue: calculateMonthlyDue(
      loan.totalPrice,
      loan.downpayment,
      loan.terms,
      loan.monthlyInterestPct
    ),
    status: "Active",
    totalPaid: 0,
    paymentProgress: `0 of ${loan.terms} payments made`,
    penalty: 0,
    penaltyApplied: false
  };
  
  // Convert dates to Timestamps
  if (loan.startDate instanceof Date) {
    loanWithTimestamp.startDate = Timestamp.fromDate(loan.startDate);
  }
  if (loan.dueDate instanceof Date) {
    loanWithTimestamp.dueDate = Timestamp.fromDate(loan.dueDate);
  }
  
  const newLoan = await addDoc(loansRef, loanWithTimestamp);
  
  // Update borrower stats
  await updateBorrowerStats(loan.borrowerId, {
    totalLoans: (borrower.loanStats?.totalLoans || 0) + 1
  });
  
  return newLoan.id;
};

export const getLoans = async (): Promise<Loan[]> => {
  const snapshot = await getDocs(loansRef);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return { 
      id: doc.id, 
      ...data,
      startDate: toDate(data.startDate),
      dueDate: data.dueDate ? toDate(data.dueDate) : undefined
    } as Loan;
  });
};

export const getLoan = async (id: string): Promise<Loan | null> => {
  const docRef = doc(db, "loans", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      startDate: toDate(data.startDate),
      dueDate: data.dueDate ? toDate(data.dueDate) : undefined
    } as Loan;
  }
  return null;
};

export const updateLoan = async (id: string, updates: Partial<Loan>) => {
  const loanRef = doc(db, "loans", id);
  
  // If updatedData contains Date objects for startDate or dueDate, convert to Timestamp
  const dataToUpdate: any = { ...updates };
  
  if (updates.startDate instanceof Date) {
    dataToUpdate.startDate = Timestamp.fromDate(updates.startDate);
  }
  if (updates.dueDate instanceof Date) {
    dataToUpdate.dueDate = Timestamp.fromDate(updates.dueDate);
  }
  
  await updateDoc(loanRef, dataToUpdate);
};

export const deleteLoan = async (id: string) => {
  const loanRef = doc(db, "loans", id);
  await deleteDoc(loanRef);
};

export const getLoansByBorrower = async (borrowerId: string): Promise<Loan[]> => {
  const q = query(loansRef, where("borrowerId", "==", borrowerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: toDate(data.startDate),
      dueDate: data.dueDate ? toDate(data.dueDate) : undefined
    } as Loan;
  });
};

export const checkAndUpdateOverdueLoans = async () => {
  const loans = await getLoans();
  const today = new Date();
  
  for (const loan of loans) {
    if (loan.status === 'Fully Paid' || !loan.dueDate) continue;
    
    const dueDate = toDate(loan.dueDate);
    const overdueDate = new Date(dueDate);
    overdueDate.setDate(overdueDate.getDate() + 5);
    
    if (today > overdueDate && !loan.penaltyApplied) {
      const daysOverdue = getDaysOverdue(dueDate);
      const penalty = calculatePenalty(loan.monthlyDue || 0, daysOverdue); // Fixed: pass 2 arguments
      
      // Update borrower stats
      const borrower = await getBorrower(loan.borrowerId);
      if (borrower) {
        await updateBorrowerStats(loan.borrowerId, {
          latePayments: (borrower.loanStats?.latePayments || 0) + 1
        });
      }
      
      await updateLoan(loan.id!, {
        status: `Delayed (${daysOverdue} days)`,
        penalty: (loan.penalty || 0) + penalty,
        penaltyApplied: true
      });
    }
  }
};