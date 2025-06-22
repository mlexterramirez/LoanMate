import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, MenuItem, Select, InputLabel, FormControl, Box, Typography, Grid
} from '@mui/material';
import { Loan } from '../types';
import { addLoan } from '../services/loans';
import { getBorrowers } from '../services/borrowers';
import { Borrower } from '../types';
import { Timestamp } from "firebase/firestore";
import { 
  calculateMonthlyDue, 
  calculateTotalInterest, 
  calculateTotalAmountPayable 
} from '../utils/calculations';

interface AddLoanDialogProps {
  open: boolean;
  onClose: () => void;
  onLoanAdded: () => void;
}

export default function AddLoanDialog({ open, onClose, onLoanAdded }: AddLoanDialogProps) {
  const [loan, setLoan] = useState<Omit<Loan, 'id' | 'status' | 'totalPaid' | 'penalty' | 'penaltyApplied'>>({ 
    borrowerId: '',
    borrowerName: '',
    itemName: '',
    totalPrice: 0,
    downpayment: 0,
    terms: 3,
    monthlyInterestPct: 5,
    startDate: new Date(),
    dueDate: new Date(),
    monthlyDue: 0,
    paymentProgress: '0 of 0 payments made',
    notes: ''
  });
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const fetchBorrowers = async () => {
      const data = await getBorrowers();
      setBorrowers(data);
    };
    fetchBorrowers();
  }, []);

  useEffect(() => {
    const calculate = () => {
      const monthly = calculateMonthlyDue(
        loan.totalPrice,
        loan.downpayment,
        loan.terms,
        loan.monthlyInterestPct
      );
      const interest = calculateTotalInterest(
        loan.totalPrice,
        loan.downpayment,
        loan.terms,
        loan.monthlyInterestPct
      );
      const amount = calculateTotalAmountPayable(
        loan.totalPrice,
        loan.downpayment,
        loan.terms,
        loan.monthlyInterestPct
      );
      
      setMonthlyPayment(monthly);
      setTotalInterest(interest);
      setTotalAmount(amount);
    };
    
    calculate();
  }, [loan]);

  const handleSubmit = async () => {
    try {
      const selectedBorrower = borrowers.find(b => b.id === loan.borrowerId);
      
      await addLoan({
        ...loan,
        borrowerName: selectedBorrower?.fullName || '',
        monthlyDue: monthlyPayment,
        paymentProgress: `0 of ${loan.terms} payments made`
      });
      onLoanAdded();
      onClose();
    } catch (error) {
      console.error('Error adding loan:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoan({
      ...loan,
      [name]: name === 'totalPrice' || name === 'downpayment' || name === 'terms' || name === 'monthlyInterestPct' 
        ? Number(value) 
        : value
    });
  };

  const handleDateChange = (name: string, date: Date | null) => {
    if (date) {
      setLoan({
        ...loan,
        [name]: date
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add New Loan</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel id="borrower-label">Borrower</InputLabel>
          <Select
            labelId="borrower-label"
            name="borrowerId"
            value={loan.borrowerId}
            onChange={(e) => setLoan({...loan, borrowerId: e.target.value as string})}
            required
          >
            {borrowers.map((borrower) => (
              <MenuItem key={borrower.id} value={borrower.id}>
                {borrower.fullName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          margin="normal"
          label="Item Name"
          name="itemName"
          value={loan.itemName}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          label="Total Price (₱)"
          name="totalPrice"
          type="number"
          value={loan.totalPrice}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          label="Downpayment (₱)"
          name="downpayment"
          type="number"
          value={loan.downpayment}
          onChange={handleChange}
          required
        />
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              margin="normal"
              label="Terms (months)"
              name="terms"
              type="number"
              value={loan.terms}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              margin="normal"
              label="Monthly Interest (%)"
              name="monthlyInterestPct"
              type="number"
              value={loan.monthlyInterestPct}
              onChange={handleChange}
              required
            />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              margin="normal"
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={loan.startDate.toISOString().split('T')[0]}
              onChange={(e) => 
                handleDateChange('startDate', e.target.value ? new Date(e.target.value) : new Date())
              }
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              margin="normal"
              label="Due Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={loan.dueDate.toISOString().split('T')[0]}
              onChange={(e) => 
                handleDateChange('dueDate', e.target.value ? new Date(e.target.value) : new Date())
              }
              required
            />
          </Grid>
        </Grid>
        <TextField
          fullWidth
          margin="normal"
          label="Notes"
          name="notes"
          value={loan.notes}
          onChange={handleChange}
          multiline
          rows={3}
        />
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>Loan Calculation</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography>Principal Amount:</Typography>
              <Typography>Monthly Interest:</Typography>
              <Typography>Loan Term:</Typography>
              <Typography variant="subtitle1">Monthly Payment:</Typography>
              <Typography>Total Interest:</Typography>
              <Typography variant="subtitle1">Total Amount Payable:</Typography>
            </Grid>
            <Grid item xs={6} sx={{ textAlign: 'right' }}>
              <Typography>₱{(loan.totalPrice - loan.downpayment).toFixed(2)}</Typography>
              <Typography>{loan.monthlyInterestPct}%</Typography>
              <Typography>{loan.terms} months</Typography>
              <Typography variant="subtitle1">₱{monthlyPayment.toFixed(2)}</Typography>
              <Typography>₱{totalInterest.toFixed(2)}</Typography>
              <Typography variant="subtitle1">₱{totalAmount.toFixed(2)}</Typography>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Add Loan
        </Button>
      </DialogActions>
    </Dialog>
  );
}