import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { Borrower } from "../types";

const borrowersRef = collection(db, "borrowers");

export const addBorrower = async (borrower: Omit<Borrower, 'id'>) => {
  return await addDoc(borrowersRef, borrower);
};

export const getBorrowers = async (): Promise<Borrower[]> => {
  const snapshot = await getDocs(borrowersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Borrower));
};

export const getBorrower = async (id: string): Promise<Borrower | null> => {
  const docRef = doc(db, "borrowers", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Borrower : null;
};

export const updateBorrower = async (id: string, updates: Partial<Borrower>) => {
  const docRef = doc(db, "borrowers", id);
  await updateDoc(docRef, updates);
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