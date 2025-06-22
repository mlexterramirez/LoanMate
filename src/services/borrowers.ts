import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { Borrower } from "../types";
import { toDate } from "../utils/dateUtils";

const borrowersRef = collection(db, "borrowers");

export const addBorrower = async (borrower: Omit<Borrower, 'id' | 'loanStats'>) => {
  const borrowerData = {
    ...borrower,
    loanStats: {
      totalLoans: 0,
      latePayments: 0,
      totalPaid: 0
    }
  };
  
  const newBorrower = await addDoc(borrowersRef, borrowerData);
  return newBorrower.id;
};

export const getBorrowers = async (): Promise<Borrower[]> => {
  const snapshot = await getDocs(borrowersRef);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      fullName: data.fullName || '',
      homeAddress: data.homeAddress || '',
      primaryContact: data.primaryContact || '',
      contactEmail: data.contactEmail || '',
      workAddress: data.workAddress || '',
      referenceContact1: data.referenceContact1 || { name: '', contact: '' },
      referenceContact2: data.referenceContact2 || { name: '', contact: '' },
      photoURL: data.photoURL || '',
      loanStats: {
        totalLoans: data.loanStats?.totalLoans || 0,
        latePayments: data.loanStats?.latePayments || 0,
        totalPaid: data.loanStats?.totalPaid || 0
      }
    } as Borrower;
  });
};

export const getBorrower = async (id: string): Promise<Borrower | null> => {
  const docRef = doc(db, "borrowers", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      fullName: data.fullName || '',
      homeAddress: data.homeAddress || '',
      primaryContact: data.primaryContact || '',
      contactEmail: data.contactEmail || '',
      workAddress: data.workAddress || '',
      referenceContact1: data.referenceContact1 || { name: '', contact: '' },
      referenceContact2: data.referenceContact2 || { name: '', contact: '' },
      photoURL: data.photoURL || '',
      loanStats: {
        totalLoans: data.loanStats?.totalLoans || 0,
        latePayments: data.loanStats?.latePayments || 0,
        totalPaid: data.loanStats?.totalPaid || 0
      }
    } as Borrower;
  }
  return null;
};

export const updateBorrower = async (id: string, updates: Partial<Borrower>) => {
  const borrowerRef = doc(db, "borrowers", id);
  await updateDoc(borrowerRef, updates);
};

export const deleteBorrower = async (id: string) => {
  const docRef = doc(db, "borrowers", id);
  await deleteDoc(docRef);
};

export const updateBorrowerStats = async (borrowerId: string, updates: Partial<Borrower['loanStats']>) => {
  const borrower = await getBorrower(borrowerId);
  if (!borrower) return;
  
  const updatedStats = {
    ...borrower.loanStats,
    ...updates
  };
  
  await updateDoc(doc(db, "borrowers", borrowerId), {
    loanStats: updatedStats
  });
};