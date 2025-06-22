import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, query, where, deleteDoc, Timestamp } from "firebase/firestore";
import { Payment } from "../types";
import { getLoan, updateLoan } from "./loans";
import { getBorrower, updateBorrowerStats } from "./borrowers";
import { toDate } from "../utils/dateUtils";

const paymentsRef = collection(db, "payments");

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
  // Convert paymentDate to Firestore Timestamp if it's a Date
  const paymentData = {
    ...payment,
    paymentDate: payment.paymentDate instanceof Date ? 
      Timestamp.fromDate(payment.paymentDate) : payment.paymentDate
  };
  
  const paymentRef = await addDoc(paymentsRef, paymentData);
  
  // Update loan total paid
  const loan = await getLoan(payment.loanId);
  if (loan) {
    const newTotalPaid = (loan.totalPaid || 0) + payment.amountPaid;
    await updateLoan(loan.id!, {
      totalPaid: newTotalPaid,
      status: newTotalPaid >= loan.totalPrice ? 'Fully Paid' : loan.status
    });
  }
  
  // Update borrower stats
  const borrower = await getBorrower(payment.borrowerId);
  if (borrower) {
    await updateBorrowerStats(payment.borrowerId, {
      totalPaid: (borrower.loanStats?.totalPaid || 0) + payment.amountPaid
    });
  }
  
  return paymentRef;
};

export const getPayments = async (): Promise<Payment[]> => {
  const snapshot = await getDocs(paymentsRef);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      paymentDate: toDate(data.paymentDate)
    } as Payment;
  });
};

export const deletePayment = async (id: string) => {
  const docRef = doc(db, "payments", id);
  await deleteDoc(docRef);
};

export const getPaymentsByLoan = async (loanId: string): Promise<Payment[]> => {
  const q = query(paymentsRef, where("loanId", "==", loanId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      paymentDate: toDate(data.paymentDate)
    } as Payment;
  });
};

export const getTotalPaidByLoan = async (loanId: string): Promise<number> => {
  const payments = await getPaymentsByLoan(loanId);
  return payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
};