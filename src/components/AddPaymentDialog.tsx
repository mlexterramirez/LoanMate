import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, MenuItem, Select, InputLabel, 
  FormControl, CircularProgress, Alert 
} from '@mui/material';
import { Payment } from '../types';
import { addPayment } from '../services/payments';
import { getLoans } from '../services/loans';
import { Loan } from '../types';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const data = await getLoans();
        setLoans(data.filter(loan => loan.status !== 'Fully Paid'));
      } catch (err) {
        console.error('Error fetching loans:', err);
        setError('Failed to load loans');
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, []);

  const handleSubmit = async () => {
    try {
      setError(null);
      const selectedLoan = loans.find(loan => loan.id === payment.loanId);
      if (!selectedLoan) {
        setError('Please select a valid loan');
        return;
      }
      
      await addPayment({
        ...payment,
        borrowerId: selectedLoan.borrowerId || '',
        paymentDate: new Date()
      });
      onPaymentAdded();
      onClose();
    } catch (err) {
      console.error('Error adding payment:', err);
      setError('Failed to record payment');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Record New Payment</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
        ) : (
          <>
            <FormControl fullWidth margin="dense">
              <InputLabel>Loan</InputLabel>
              <Select
                value={payment.loanId}
                onChange={(e) => setPayment({...payment, loanId: e.target.value as string})}
                required
              >
                {loans.map((loan) => (
                  <MenuItem key={loan.id} value={loan.id}>
                    {loan.itemName || 'No Item'} - {loan.borrowerName || 'No Borrower'} (₱{(loan.monthlyDue || 0).toFixed(2)})
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
              onChange={(e) => setPayment({
                ...payment, 
                amountPaid: parseFloat(e.target.value) || 0
              })}
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={payment.paymentMethod}
                onChange={(e) => setPayment({
                  ...payment, 
                  paymentMethod: e.target.value as 'Cash' | 'Bank Transfer' | 'Check'
                })}
                required
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
                onChange={(e) => setPayment({
                  ...payment, 
                  paymentStatus: e.target.value as 'Full' | 'Partial'
                })}
                required
              >
                <MenuItem value="Full">Full</MenuItem>
                <MenuItem value="Partial">Partial</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !payment.loanId}
        >
          Record Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}