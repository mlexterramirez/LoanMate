import { db } from "../firebase";
import { 
  collection, addDoc, getDocs, doc, updateDoc, 
  query, where, deleteDoc, Timestamp 
} from "firebase/firestore";
import { Payment, Loan } from "../types";
import { getLoan, updateLoan } from "./loans";
import { getBorrower, updateBorrowerStats } from "./borrowers";
import { toDate } from "../utils/dateUtils";
import { updateLoanStatus } from "../utils/calculations";

const paymentsRef = collection(db, "payments");

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
  try {
    const loan = await getLoan(payment.loanId);
    if (!loan) throw new Error("Loan not found");
    
    // Apply payment to outstanding balances
    let remainingPayment = payment.amountPaid;
    const updatedBalances = [...(loan.outstandingBalances || [])];
    let penaltyPaid = 0;
    
    // Pay oldest balances first
    updatedBalances.sort((a, b) => 
      (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)
    );
    
    for (let i = 0; i < updatedBalances.length && remainingPayment > 0; i++) {
      const balance = updatedBalances[i];
      const totalDue = balance.baseAmount + balance.penaltyAmount;
      
      if (remainingPayment >= totalDue) {
        // Pay off this balance completely
        remainingPayment -= totalDue;
        penaltyPaid += balance.penaltyAmount;
        updatedBalances.splice(i, 1);
        i--; // Adjust index after removal
      } else {
        // Partially pay this balance
        const baseRatio = balance.baseAmount / totalDue;
        const penaltyRatio = balance.penaltyAmount / totalDue;
        const basePaid = remainingPayment * baseRatio;
        const penaltyPaidThis = remainingPayment * penaltyRatio;
        
        updatedBalances[i] = {
          ...balance,
          baseAmount: balance.baseAmount - basePaid,
          penaltyAmount: balance.penaltyAmount - penaltyPaidThis
        };
        penaltyPaid += penaltyPaidThis;
        remainingPayment = 0;
      }
    }
    
    // Update loan totals
    const newTotalPaid = (loan.totalPaid || 0) + payment.amountPaid;
    const updatedLoanData: Partial<Loan> = {
      totalPaid: newTotalPaid,
      outstandingBalances: updatedBalances,
      lastPaymentDate: new Date()
    };
    
    // Check if loan is fully paid
    if (newTotalPaid >= loan.totalPrice) {
      updatedLoanData.status = 'Fully Paid';
    } else {
      // Update the loan status (which may recalculate penalties and status)
      const updatedLoan = updateLoanStatus({
        ...loan,
        ...updatedLoanData
      });
      updatedLoanData.status = updatedLoan.status;
      updatedLoanData.penalty = updatedLoan.penalty;
      updatedLoanData.outstandingBalances = updatedLoan.outstandingBalances;
    }
    
    // Update loan in database
    await updateLoan(loan.id!, updatedLoanData);
    
    // Create payment record
    const paymentData = {
      ...payment,
      amountPaid: payment.amountPaid,
      penaltyPaid: penaltyPaid,
      paymentMethod: payment.paymentMethod || 'Cash',
      paymentStatus: payment.paymentStatus || 'Full',
      paymentDate: payment.paymentDate instanceof Date ? 
        Timestamp.fromDate(payment.paymentDate) : payment.paymentDate
    };
    
    const paymentRef = await addDoc(paymentsRef, paymentData);
    
    // Update borrower stats
    const borrower = await getBorrower(payment.borrowerId);
    if (borrower) {
      await updateBorrowerStats(payment.borrowerId, {
        totalPaid: (borrower.loanStats?.totalPaid || 0) + payment.amountPaid
      });
    }
    
    return paymentRef;
  } catch (error) {
    console.error('Error adding payment:', error);
    throw error;
  }
};

export const getPayments = async (): Promise<Payment[]> => {
  try {
    const snapshot = await getDocs(paymentsRef);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        loanId: data.loanId || '',
        borrowerId: data.borrowerId || '',
        amountPaid: data.amountPaid || 0,
        penaltyPaid: data.penaltyPaid || 0, // Added penaltyPaid field
        paymentMethod: data.paymentMethod || 'Cash',
        paymentStatus: data.paymentStatus || 'Full',
        paymentDate: data.paymentDate ? toDate(data.paymentDate) : null,
        notes: data.notes || ''
      };
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
};

export const deletePayment = async (id: string) => {
  try {
    const docRef = doc(db, "payments", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

export const getPaymentsByLoan = async (loanId: string): Promise<Payment[]> => {
  try {
    const q = query(paymentsRef, where("loanId", "==", loanId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        loanId: data.loanId || '',
        borrowerId: data.borrowerId || '',
        amountPaid: data.amountPaid || 0,
        penaltyPaid: data.penaltyPaid || 0,
        paymentMethod: data.paymentMethod || 'Cash',
        paymentStatus: data.paymentStatus || 'Full',
        paymentDate: data.paymentDate ? toDate(data.paymentDate) : null,
        notes: data.notes || ''
      };
    });
  } catch (error) {
    console.error('Error getting payments by loan:', error);
    return [];
  }
};

export const getTotalPaidByLoan = async (loanId: string): Promise<number> => {
  try {
    const payments = await getPaymentsByLoan(loanId);
    return payments.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
  } catch (error) {
    console.error('Error getting total paid by loan:', error);
    return 0;
  }
};