import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, query, where, deleteDoc } from "firebase/firestore";
import { Loan } from "../types";
import { calculateMonthlyDue, calculatePenalty, getDaysOverdue } from "../utils/calculations";
import { getBorrower, updateBorrowerStats } from "./borrowers";

const loansRef = collection(db, "loans");

export const addLoan = async (loan: Omit<Loan, 'id'>) => {
  const borrower = await getBorrower(loan.borrowerId);
  if (!borrower) throw new Error("Borrower not found");
  
  const loanWithName = {
    ...loan,
    borrowerName: borrower.fullName
  };
  
  const newLoan = await addDoc(loansRef, loanWithName);
  
  // Update borrower stats
  await updateBorrowerStats(loan.borrowerId, {
    totalLoans: (borrower.loanStats?.totalLoans || 0) + 1
  });
  
  return newLoan;
};

export const getLoans = async (): Promise<Loan[]> => {
  const snapshot = await getDocs(loansRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
};

export const getLoan = async (id: string): Promise<Loan | null> => {
  const docRef = doc(db, "loans", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Loan : null;
};

export const updateLoan = async (id: string, updates: Partial<Loan>) => {
  const docRef = doc(db, "loans", id);
  await updateDoc(docRef, updates);
};

export const deleteLoan = async (id: string) => {
  const docRef = doc(db, "loans", id);
  await deleteDoc(docRef);
};

export const getLoansByBorrower = async (borrowerId: string): Promise<Loan[]> => {
  const q = query(loansRef, where("borrowerId", "==", borrowerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
};

export const checkAndUpdateOverdueLoans = async () => {
  const loans = await getLoans();
  const today = new Date();
  
  for (const loan of loans) {
    if (loan.status === 'Fully Paid') continue;
    
    if (loan.dueDate) {
      const dueDate = loan.dueDate.toDate();
      const overdueDate = new Date(dueDate);
      overdueDate.setDate(overdueDate.getDate() + 5);
      
      if (today > overdueDate && !loan.penaltyApplied) {
        const daysOverdue = getDaysOverdue(dueDate);
        const penalty = calculatePenalty(loan.monthlyDue);
        
        // Update borrower stats
        const borrower = await getBorrower(loan.borrowerId);
        if (borrower) {
          await updateBorrowerStats(loan.borrowerId, {
            latePayments: (borrower.loanStats?.latePayments || 0) + 1
          });
        }
        
        await updateLoan(loan.id!, {
          penalty: (loan.penalty || 0) + penalty,
          status: `Delayed (${daysOverdue} days)`,
          penaltyApplied: true
        });
      }
    }
  }
};