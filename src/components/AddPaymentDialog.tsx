import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, Grid, Typography, Box, CircularProgress, Alert,
  MenuItem
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

  useEffect(() => {
    if (open) {
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
    }
  }, [open, loan]);

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
      setPaymentData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0,
        paymentStatus: parseFloat(value) >= (selectedLoan?.monthlyDue || 0) ? 'Full' : 'Partial'
      }));
    } else {
      setPaymentData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setPaymentData(prev => ({
        ...prev,
        paymentDate: date
      }));
    }
  };

  const handleSubmit = async () => {
    if (!paymentData.loanId) {
      setError('Please select a loan');
      return;
    }
    
    if (paymentData.amountPaid <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
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
                <Typography>Total Outstanding: ₱{calculateTotalAmountDue(selectedLoan).toFixed(2)}</Typography>
                <Typography>Penalty: ₱{selectedLoan.penalty?.toFixed(2)}</Typography>
              </Box>
            </Grid>
          )}
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount Paid"
              name="amountPaid"
              type="number"
              value={paymentData.amountPaid}
              onChange={handleChange}
              required
              InputProps={{
                startAdornment: <span>₱</span>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Penalty Paid"
              name="penaltyPaid"
              type="number"
              value={paymentData.penaltyPaid}
              onChange={handleChange}
              InputProps={{
                startAdornment: <span>₱</span>,
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
              onChange={(e) => handleDateChange(new Date(e.target.value))}
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