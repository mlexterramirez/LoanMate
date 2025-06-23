import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, Grid, Typography, Box, CircularProgress, Alert,
  MenuItem, InputAdornment
} from '@mui/material';
import { Loan, Payment } from '../types';
import { usePaymentService } from '../services/payments';
import { calculateTotalAmountDue } from '../utils/calculations';

interface AddPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
  loan: Loan;
  loans: Loan[];
}

const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({ 
  open, onClose, onPaymentAdded, loan, loans 
}) => {
  const { addPayment } = usePaymentService();
  const [paymentData, setPaymentData] = useState<Omit<Payment, 'id'>>({
    loanId: loan.id || '',
    borrowerId: loan.borrowerId || '',
    amountPaid: 0,
    penaltyPaid: loan.penalty || 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Full',
    paymentDate: new Date(),
    notes: ''
  });
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(loan);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [principalDue, setPrincipalDue] = useState<number>(0);
  const [penaltyDue, setPenaltyDue] = useState<number>(0);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [penaltyError, setPenaltyError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      calculateDueAmounts(loan);
      
      setPaymentData({
        loanId: loan.id || '',
        borrowerId: loan.borrowerId || '',
        amountPaid: 0,
        penaltyPaid: loan.penalty || 0,
        paymentMethod: 'Cash',
        paymentStatus: 'Full',
        paymentDate: new Date(),
        notes: ''
      });
      setSelectedLoan(loan);
      setError(null);
      setAmountError(null);
      setPenaltyError(null);
    }
  }, [open, loan]);

  const calculateDueAmounts = (loan: Loan) => {
    const totalDue = calculateTotalAmountDue(loan);
    const principal = loan.outstandingBalances?.reduce(
      (sum, balance) => sum + (balance.baseAmount || 0), 0) || 0;
    const penalty = loan.outstandingBalances?.reduce(
      (sum, balance) => sum + (balance.penaltyAmount || 0), 0) || 0;
    
    setDueAmount(totalDue);
    setPrincipalDue(principal);
    setPenaltyDue(penalty);
  };

  useEffect(() => {
    if (selectedLoan) {
      calculateDueAmounts(selectedLoan);
    }
  }, [selectedLoan]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'loanId') {
      const newLoan = loans.find(l => l.id === value) || null;
      setSelectedLoan(newLoan);
      
      setPaymentData(prev => ({
        ...prev,
        [name]: value,
        penaltyPaid: newLoan?.penalty || 0
      }));
    } else if (name === 'amountPaid') {
      let numericValue = parseFloat(value) || 0;
      
      setPaymentData(prev => ({
        ...prev,
        [name]: numericValue,
        paymentStatus: numericValue >= (selectedLoan?.monthlyDue || 0) ? 'Full' : 'Partial'
      }));
    } else if (name === 'penaltyPaid') {
      let numericValue = parseFloat(value) || 0;
      
      setPaymentData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setPaymentData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Remove extra periods
    const parts = numericValue.split('.');
    let sanitizedValue = parts[0] || '0';
    if (parts.length > 1) {
      sanitizedValue += '.' + parts[1].slice(0, 2);
    }
    
    // Remove leading zeros
    sanitizedValue = sanitizedValue.replace(/^0+/, '') || '0';
    if (sanitizedValue.startsWith('.')) {
      sanitizedValue = '0' + sanitizedValue;
    }
    
    // Convert to number and round to two decimals
    let num = parseFloat(sanitizedValue);
    if (!isNaN(num)) {
      num = Math.round(num * 100) / 100;
    } else {
      num = 0;
    }
    
    setPaymentData(prev => ({
      ...prev,
      [field]: num
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (date.toString() !== 'Invalid Date') {
      setPaymentData(prev => ({
        ...prev,
        paymentDate: date
      }));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setAmountError(null);
    setPenaltyError(null);
    
    // Validate form
    if (!paymentData.loanId) {
      setError('Please select a loan');
      return;
    }
    
    if (paymentData.amountPaid <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }
    
    // Convert all amounts to cents to avoid floating point issues
    const principalDueCents = Math.round(principalDue * 100);
    const penaltyDueCents = Math.round(penaltyDue * 100);
    const dueAmountCents = Math.round(dueAmount * 100);
    const amountPaidCents = Math.round(paymentData.amountPaid * 100);
    const penaltyPaidCents = Math.round(paymentData.penaltyPaid * 100);
    const totalPaymentCents = amountPaidCents + penaltyPaidCents;
    
    // Check if principal payment exceeds principal due
    if (amountPaidCents > principalDueCents) {
      setError(`Payment amount cannot exceed principal due of ₱${principalDue.toFixed(2)}`);
      return;
    }
    
    // Check if penalty payment exceeds penalty due
    if (penaltyPaidCents > penaltyDueCents) {
      setError(`Penalty paid cannot exceed penalty due of ₱${penaltyDue.toFixed(2)}`);
      return;
    }
    
    // Check if total payment exceeds total due
    if (totalPaymentCents > dueAmountCents) {
      setError(`Total payment cannot exceed total due of ₱${dueAmount.toFixed(2)}`);
      return;
    }
    
    try {
      setLoading(true);
      await addPayment(paymentData);
      onPaymentAdded();
      onClose();
    } catch (err) {
      console.error('Error adding payment:', err);
      setError('Failed to add payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add New Payment</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Loan"
              name="loanId"
              value={paymentData.loanId}
              onChange={handleChange}
              required
            >
              {loans.map(loan => (
                <MenuItem key={loan.id} value={loan.id || ''}>
                  {loan.borrowerName} - {loan.itemName} (₱{loan.totalPrice?.toFixed(2)})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {selectedLoan && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle1">Loan Details</Typography>
                <Typography>Borrower: {selectedLoan.borrowerName}</Typography>
                <Typography>Item: {selectedLoan.itemName}</Typography>
                <Typography>Monthly Due: ₱{selectedLoan.monthlyDue?.toFixed(2)}</Typography>
                
                <Box mt={1}>
                  <Typography>Principal Due: ₱{principalDue.toFixed(2)}</Typography>
                  <Typography>Penalty Due: ₱{penaltyDue.toFixed(2)}</Typography>
                  <Typography fontWeight="bold">
                    Total Due: ₱{dueAmount.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount Paid"
              name="amountPaid"
              value={paymentData.amountPaid === 0 ? '' : paymentData.amountPaid.toFixed(2)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleNumberInput(e, 'amountPaid')
              }
              required
              error={!!amountError}
              helperText={amountError}
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { 
                  min: 0,
                  step: 0.01
                }
              }}
              onFocus={(e) => {
                if (e.target.value === '0.00') {
                  e.target.value = '';
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setPaymentData(prev => ({ ...prev, amountPaid: 0 }));
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Penalty Paid"
              name="penaltyPaid"
              value={paymentData.penaltyPaid === 0 ? '' : paymentData.penaltyPaid.toFixed(2)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleNumberInput(e, 'penaltyPaid')
              }
              error={!!penaltyError}
              helperText={penaltyError}
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { 
                  min: 0,
                  step: 0.01
                }
              }}
              onFocus={(e) => {
                if (e.target.value === '0.00') {
                  e.target.value = '';
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setPaymentData(prev => ({ ...prev, penaltyPaid: 0 }));
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Payment Method"
              name="paymentMethod"
              select
              value={paymentData.paymentMethod}
              onChange={handleChange}
            >
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              <MenuItem value="Check">Check</MenuItem>
              <MenuItem value="Online">Online Payment</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Payment Status"
              name="paymentStatus"
              select
              value={paymentData.paymentStatus}
              onChange={handleChange}
            >
              <MenuItem value="Full">Full</MenuItem>
              <MenuItem value="Partial">Partial</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={paymentData.paymentDate ? paymentData.paymentDate.toISOString().split('T')[0] : ''}
              onChange={handleDateChange}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={paymentData.notes}
              onChange={handleChange}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Add Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPaymentDialog;