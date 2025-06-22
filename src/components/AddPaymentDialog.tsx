import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { Payment } from '../types';
import { addPayment } from '../services/payments';
import { getLoans } from '../services/loans';
import { Loan } from '../types';
import { toDate } from '../utils/dateUtils';

interface AddPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
}

export default function AddPaymentDialog({ open, onClose, onPaymentAdded }: AddPaymentDialogProps) {
  const [payment, setPayment] = useState<Omit<Payment, 'id'>>({ 
    loanId: '',
    borrowerId: '',
    paymentDate: new Date(),
    amountPaid: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Full'
  });
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    const fetchLoans = async () => {
      const data = await getLoans();
      setLoans(data.filter(loan => loan.status !== 'Fully Paid'));
    };
    fetchLoans();
  }, []);

  const handleSubmit = async () => {
    try {
      const selectedLoan = loans.find(loan => loan.id === payment.loanId);
      if (!selectedLoan) return;
      
      await addPayment({
        ...payment,
        borrowerId: selectedLoan.borrowerId,
        paymentDate: new Date()
      });
      onPaymentAdded();
      onClose();
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Record New Payment</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>Loan</InputLabel>
          <Select
            value={payment.loanId}
            onChange={(e) => setPayment({...payment, loanId: e.target.value as string})}
          >
            {loans.map((loan) => (
              <MenuItem key={loan.id} value={loan.id}>
                {loan.itemName} - {loan.borrowerName} (₱{loan.monthlyDue.toFixed(2)})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          label="Amount Paid"
          type="number"
          fullWidth
          value={payment.amountPaid}
          onChange={(e) => setPayment({...payment, amountPaid: Number(e.target.value)})}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Payment Method</InputLabel>
          <Select
            value={payment.paymentMethod}
            onChange={(e) => setPayment({...payment, paymentMethod: e.target.value as 'Cash' | 'Bank Transfer' | 'Check'})}
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
            <MenuItem value="Check">Check</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>Payment Status</InputLabel>
          <Select
            value={payment.paymentStatus}
            onChange={(e) => setPayment({...payment, paymentStatus: e.target.value as 'Full' | 'Partial'})}
          >
            <MenuItem value="Full">Full</MenuItem>
            <MenuItem value="Partial">Partial</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Record Payment</Button>
      </DialogActions>
    </Dialog>
  );
}