import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, MenuItem, Select, InputLabel, 
  FormControl, CircularProgress, Alert, Grid,
  Box, Typography
} from '@mui/material';
import { Loan } from '../types';
import { addLoan } from '../services/loans';
import { getBorrowers } from '../services/borrowers';
import { formatFirestoreDate } from '../utils/dateUtils';
import { getDayWithSuffix, calculateMonthlyDue } from '../utils/calculations';

interface AddLoanDialogProps {
  open: boolean;
  onClose: () => void;
  onLoanAdded: () => void;
}

export default function AddLoanDialog({ open, onClose, onLoanAdded }: AddLoanDialogProps) {
  const [formData, setFormData] = useState<Omit<Loan, 'id'>>({
    borrowerId: '',
    borrowerName: '',
    itemName: '',
    totalPrice: 0,
    downpayment: 0,
    terms: 0,
    monthlyInterestPct: 0,
    startDate: new Date(),
    dueDate: new Date(),
    monthlyDue: 0,
    status: 'Active',
    totalPaid: 0,
    penalty: 0,
    penaltyApplied: false,
    outstandingBalances: []
  });
  
  const [endDate, setEndDate] = useState<string>('');
  const [dueDaySuffix, setDueDaySuffix] = useState<string>('');
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBorrowers = async () => {
      try {
        const data = await getBorrowers();
        setBorrowers(data);
      } catch (err) {
        setError('Failed to load borrowers');
      } finally {
        setLoading(false);
      }
    };
    fetchBorrowers();
  }, []);

  useEffect(() => {
    if (formData.terms > 0 && formData.startDate) {
      const endDate = new Date(formData.startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(formData.terms.toString()));
      setEndDate(formatFirestoreDate(endDate));
    }
    
    // Calculate due day suffix
    if (formData.dueDate) {
      setDueDaySuffix(getDayWithSuffix(new Date(formData.dueDate)));
    }

    // Calculate monthly due if relevant fields change
    if (formData.totalPrice > 0 && formData.terms > 0 && formData.monthlyInterestPct > 0) {
      const monthlyDue = calculateMonthlyDue(
        Number(formData.totalPrice),
        Number(formData.downpayment),
        Number(formData.terms),
        Number(formData.monthlyInterestPct)
      );
      setFormData(prev => ({
        ...prev,
        monthlyDue: monthlyDue
      }));
    }
  }, [formData.terms, formData.startDate, formData.dueDate, formData.totalPrice, formData.downpayment, formData.monthlyInterestPct]);

  const handleSubmit = async () => {
    try {
      setError(null);
      
      // Ensure numeric fields are numbers
      const loanData = {
        ...formData,
        totalPrice: Number(formData.totalPrice),
        downpayment: Number(formData.downpayment),
        terms: Number(formData.terms),
        monthlyInterestPct: Number(formData.monthlyInterestPct),
        monthlyDue: Number(formData.monthlyDue),
        outstandingBalances: []
      };
      
      await addLoan(loanData);
      onLoanAdded();
      onClose();
    } catch (err) {
      setError('Failed to create loan');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Convert numeric fields to numbers
    const numericFields = ['totalPrice', 'downpayment', 'terms', 'monthlyInterestPct'];
    let newValue: any = value;
    
    if (name.includes('Date')) {
      newValue = new Date(value);
    } else if (numericFields.includes(name)) {
      newValue = value === '' ? 0 : Number(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSelectChange = (e: any) => {
    const borrowerId = e.target.value;
    const borrower = borrowers.find(b => b.id === borrowerId);
    setFormData(prev => ({
      ...prev,
      borrowerId,
      borrowerName: borrower?.fullName || ''
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Add New Loan</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Borrower</InputLabel>
                <Select
                  value={formData.borrowerId}
                  onChange={handleSelectChange}
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
            
            <Grid item xs={12} md={6}>
              <TextField
                name="itemName"
                label="Item Name"
                fullWidth
                margin="dense"
                value={formData.itemName}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                name="totalPrice"
                label="Total Price (₱)"
                type="number"
                fullWidth
                margin="dense"
                value={formData.totalPrice}
                onChange={handleChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                name="downpayment"
                label="Downpayment (₱)"
                type="number"
                fullWidth
                margin="dense"
                value={formData.downpayment}
                onChange={handleChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                name="terms"
                label="Terms (Months)"
                type="number"
                fullWidth
                margin="dense"
                value={formData.terms}
                onChange={handleChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                name="monthlyInterestPct"
                label="Monthly Interest (%)"
                type="number"
                fullWidth
                margin="dense"
                value={formData.monthlyInterestPct}
                onChange={handleChange}
                required
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                name="startDate"
                label="Start Date"
                type="date"
                fullWidth
                margin="dense"
                InputLabelProps={{ shrink: true }}
                value={formData.startDate.toISOString().split('T')[0]}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                name="dueDate"
                label="First Due Date"
                type="date"
                fullWidth
                margin="dense"
                InputLabelProps={{ shrink: true }}
                value={formData.dueDate.toISOString().split('T')[0]}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                name="monthlyDue"
                label="Monthly Due (₱)"
                type="number"
                fullWidth
                margin="dense"
                value={formData.monthlyDue.toFixed(2)}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1, mt: 2 }}>
                <Typography variant="h6" gutterBottom>Loan Summary</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography>Loan Term: {formData.terms} months</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography>Start Date: {formatFirestoreDate(formData.startDate)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography>End Date: {endDate || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography>Payment Day: {dueDaySuffix || 'Not set'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography>Monthly Due: ₱{formData.monthlyDue.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!formData.borrowerId || !formData.itemName}
        >
          Add Loan
        </Button>
      </DialogActions>
    </Dialog>
  );
}