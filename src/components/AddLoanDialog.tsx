import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, Typography, Box, CircularProgress, Alert,
  InputAdornment, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent
} from '@mui/material';
import { calculateMonthlyDue, getDayWithSuffix } from '../utils/calculations';
import { Loan } from '../types';
import { useLoanService } from '../services/loans';

interface AddLoanDialogProps {
  open: boolean;
  onClose: () => void;
  onLoanAdded: () => void;
}

const AddLoanDialog: React.FC<AddLoanDialogProps> = ({ open, onClose, onLoanAdded }) => {
  const { addLoan } = useLoanService();
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [loanData, setLoanData] = useState<Omit<Loan, 'id' | 'status' | 'totalPaid' | 'penalty' | 'penaltyApplied' | 'outstandingBalances' | 'lastPaymentDate' | 'installments'>>({
    borrowerId: '',
    borrowerName: '',
    itemName: '',
    totalPrice: 0,
    downpayment: 0,
    terms: 0,
    monthlyInterestPct: 0,
    loanCreatedDate: new Date(),
    firstDueDate: new Date(),
    monthlyDue: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endDueDate, setEndDueDate] = useState<Date | null>(null);

  useEffect(() => {
    if (open) {
      // Load borrowers and reset form
      const savedBorrowers = JSON.parse(localStorage.getItem('borrowers') || '[]');
      setBorrowers(savedBorrowers);
      setLoanData({
        borrowerId: '',
        borrowerName: '',
        itemName: '',
        totalPrice: 0,
        downpayment: 0,
        terms: 0,
        monthlyInterestPct: 0,
        loanCreatedDate: new Date(),
        firstDueDate: new Date(),
        monthlyDue: 0,
        notes: ''
      });
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    // Calculate monthly due whenever relevant fields change
    if (loanData.totalPrice > 0 && loanData.terms > 0 && loanData.monthlyInterestPct > 0) {
      const monthlyDue = calculateMonthlyDue(
        loanData.totalPrice,
        loanData.downpayment,
        loanData.terms,
        loanData.monthlyInterestPct
      );
      setLoanData(prev => ({ ...prev, monthlyDue }));
    }
  }, [loanData.totalPrice, loanData.downpayment, loanData.terms, loanData.monthlyInterestPct]);

  useEffect(() => {
    // Calculate end due date based on first due date and terms
    if (loanData.firstDueDate && loanData.terms > 0) {
      const firstDue = new Date(loanData.firstDueDate);
      const endDate = new Date(firstDue);
      endDate.setMonth(firstDue.getMonth() + loanData.terms - 1);
      setEndDueDate(endDate);
    }
  }, [loanData.firstDueDate, loanData.terms]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'borrowerId') {
      const borrower = borrowers.find(b => b.id === value);
      setLoanData(prev => ({
        ...prev,
        borrowerId: value,
        borrowerName: borrower?.fullName || ''
      }));
    } else if (['totalPrice', 'downpayment', 'terms', 'monthlyInterestPct'].includes(name)) {
      const numericValue = parseFloat(value) || 0;
      setLoanData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setLoanData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setLoanData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: 'loanCreatedDate' | 'firstDueDate', date: Date | null) => {
    if (date) {
      setLoanData(prev => ({ ...prev, [name]: date }));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    // Validate form
    if (!loanData.borrowerId) {
      setError('Please select a borrower');
      return;
    }
    
    if (!loanData.itemName) {
      setError('Please enter an item name');
      return;
    }
    
    if (loanData.totalPrice <= 0) {
      setError('Total price must be greater than 0');
      return;
    }
    
    if (loanData.terms <= 0) {
      setError('Terms must be greater than 0');
      return;
    }
    
    if (loanData.monthlyInterestPct < 0) {
      setError('Monthly interest cannot be negative');
      return;
    }
    
    try {
      setLoading(true);
      await addLoan(loanData);
      onLoanAdded();
      onClose();
    } catch (err) {
      console.error('Error adding loan:', err);
      setError('Failed to add loan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Add New Loan</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Borrower</InputLabel>
              <Select
                value={loanData.borrowerId}
                onChange={handleSelectChange}
                label="Borrower"
                name="borrowerId"
                required
              >
                {borrowers.map(borrower => (
                  <MenuItem key={borrower.id} value={borrower.id}>
                    {borrower.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Item Name"
              name="itemName"
              value={loanData.itemName}
              onChange={handleChange}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Total Price (₱)"
              name="totalPrice"
              value={loanData.totalPrice}
              onChange={handleChange}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { min: 0 }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Downpayment (₱)"
              name="downpayment"
              value={loanData.downpayment}
              onChange={handleChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { min: 0 }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Terms (Months)"
              name="terms"
              value={loanData.terms}
              onChange={handleChange}
              required
              inputProps={{ min: 1 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Monthly Interest (%)"
              name="monthlyInterestPct"
              value={loanData.monthlyInterestPct}
              onChange={handleChange}
              inputProps={{ min: 0 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Loan Created Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={loanData.loanCreatedDate instanceof Date ? loanData.loanCreatedDate.toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateChange('loanCreatedDate', e.target.value ? new Date(e.target.value) : null)}
              disabled
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="First Due Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={loanData.firstDueDate instanceof Date ? loanData.firstDueDate.toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateChange('firstDueDate', e.target.value ? new Date(e.target.value) : null)}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Monthly Due (₱)"
              name="monthlyDue"
              value={loanData.monthlyDue.toFixed(2)}
              InputProps={{
                readOnly: true,
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Loan Summary</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography><strong>Loan Term:</strong> {loanData.terms} months</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography><strong>Loan Created Date:</strong> {new Date(loanData.loanCreatedDate).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography><strong>First Due Date:</strong> {new Date(loanData.firstDueDate).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography><strong>End Due Date:</strong> {endDueDate ? endDueDate.toLocaleDateString() : 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography><strong>Payment Day:</strong> {getDayWithSuffix(new Date(loanData.firstDueDate))}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography><strong>Monthly Due:</strong> ₱{loanData.monthlyDue.toFixed(2)}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={loanData.notes}
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
          {loading ? <CircularProgress size={24} /> : 'Add Loan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddLoanDialog;