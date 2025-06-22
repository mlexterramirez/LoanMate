import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, query, where, deleteDoc, Timestamp } from "firebase/firestore";
import { Payment } from "../types";
import { getLoan, updateLoan } from "./loans";
import { getBorrower, updateBorrowerStats } from "./borrowers";
import { toDate } from "../utils/dateUtils";

const paymentsRef = collection(db, "payments");

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
  try {
    const paymentData = {
      ...payment,
      amountPaid: payment.amountPaid || 0,
      paymentMethod: payment.paymentMethod || 'Cash',
      paymentStatus: payment.paymentStatus || 'Full',
      paymentDate: payment.paymentDate instanceof Date ? 
        Timestamp.fromDate(payment.paymentDate) : payment.paymentDate
    };
    
    const paymentRef = await addDoc(paymentsRef, paymentData);
    
    const loan = await getLoan(payment.loanId);
    if (loan) {
      const newTotalPaid = (loan.totalPaid || 0) + payment.amountPaid;
      await updateLoan(loan.id!, {
        totalPaid: newTotalPaid,
        status: newTotalPaid >= (loan.totalPrice || 0) ? 'Fully Paid' : loan.status
      });
    }
    
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