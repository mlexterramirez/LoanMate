import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { Loan } from '../types';
import { addLoan } from '../services/loans';
import { getBorrowers } from '../services/borrowers';
import { Borrower } from '../types';

interface AddLoanDialogProps {
  open: boolean;
  onClose: () => void;
  onLoanAdded: () => void;
}

export default function AddLoanDialog({ open, onClose, onLoanAdded }: AddLoanDialogProps) {
  const [loan, setLoan] = useState<Omit<Loan, 'id' | 'status' | 'borrowerName' | 'totalPaid' | 'paymentProgress' | 'penalty' | 'penaltyApplied'>>({ 
    borrowerId: '',
    itemName: '',
    totalPrice: 0,
    downpayment: 0,
    terms: 3,
    monthlyInterestPct: 5,
    startDate: new Date(),
    dueDate: new Date(),
    monthlyDue: 0,
    notes: ''
  });
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);

  useEffect(() => {
    const fetchBorrowers = async () => {
      const data = await getBorrowers();
      setBorrowers(data);
    };
    fetchBorrowers();
  }, []);

  const calculateMonthlyPayment = () => {
    const principal = loan.totalPrice - loan.downpayment;
    const monthlyInterest = loan.monthlyInterestPct / 100;
    return (principal / loan.terms) * (1 + monthlyInterest);
  };

  const handleSubmit = async () => {
    try {
      const monthlyDue = calculateMonthlyPayment();
      await addLoan({
        ...loan,
        monthlyDue,
        status: 'Active',
        totalPaid: 0,
        penalty: 0,
        penaltyApplied: false
      });
      onLoanAdded();
      onClose();
    } catch (error) {
      console.error('Error adding loan:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add New Loan</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>Borrower</InputLabel>
          <Select
            value={loan.borrowerId}
            onChange={(e) => setLoan({...loan, borrowerId: e.target.value as string})}
          >
            {borrowers.map((borrower) => (
              <MenuItem key={borrower.id} value={borrower.id}>
                {borrower.fullName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          label="Item Name"
          fullWidth
          value={loan.itemName}
          onChange={(e) => setLoan({...loan, itemName: e.target.value})}
        />
        <TextField
          margin="dense"
          label="Total Price"
          type="number"
          fullWidth
          value={loan.totalPrice}
          onChange={(e) => setLoan({...loan, totalPrice: Number(e.target.value)})}
        />
        <TextField
          margin="dense"
          label="Downpayment"
          type="number"
          fullWidth
          value={loan.downpayment}
          onChange={(e) => setLoan({...loan, downpayment: Number(e.target.value)})}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Terms (months)</InputLabel>
          <Select
            value={loan.terms}
            onChange={(e) => setLoan({...loan, terms: Number(e.target.value)})}
          >
            <MenuItem value={3}>3 months</MenuItem>
            <MenuItem value={6}>6 months</MenuItem>
            <MenuItem value={9}>9 months</MenuItem>
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          label="Monthly Interest (%)"
          type="number"
          fullWidth
          value={loan.monthlyInterestPct}
          onChange={(e) => setLoan({...loan, monthlyInterestPct: Number(e.target.value)})}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Add Loan</Button>
      </DialogActions>
    </Dialog>
  );
}