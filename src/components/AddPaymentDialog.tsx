import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, Select, InputLabel,
  FormControl, CircularProgress, Alert, Grid
} from '@mui/material';
import { Loan } from '../types';
import { getLoans } from '../services/loans';
import { addPayment } from '../services/payments';
import { formatFirestoreDate } from '../utils/dateUtils';

interface AddPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
}

export default function AddPaymentDialog({ open, onClose, onPaymentAdded }: AddPaymentDialogProps) {
  const [paymentData, setPaymentData] = useState({
    loanId: '',
    paymentDate: new Date(),
    amountPaid: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Full' as 'Full' | 'Partial',
    penaltyPaid: 0
  });
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const data = await getLoans();
        setLoans(data.filter(loan => loan.status !== 'Fully Paid'));
      } catch (err) {
        setError('Failed to load loans');
      } finally {
        setLoading(false);
      }
    };
    if (open) fetchLoans();
  }, [open]);

  useEffect(() => {
    if (paymentData.loanId) {
      const loan = loans.find(l => l.id === paymentData.loanId);
      setSelectedLoan(loan || null);
      if (loan) {
        setPaymentData(prev => ({
          ...prev,
          penaltyPaid: loan.penalty
        }));
      }
    }
  }, [paymentData.loanId, loans]);

  const handleSubmit = async () => {
    try {
      setError(null);
      await addPayment(paymentData);
      onPaymentAdded();
      onClose();
    } catch (err) {
      setError('Failed to record payment');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: name === 'amountPaid' || name === 'penaltyPaid' ? Number(value) : value
    }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Record New Payment</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Loan</InputLabel>
                <Select
                  name="loanId"
                  value={paymentData.loanId}
                  onChange={handleSelectChange}
                  required
                >
                  {loans.map(loan => (
                    <MenuItem key={loan.id} value={loan.id}>
                      {loan.borrowerName} - {loan.itemName} (Due: {formatFirestoreDate(loan.dueDate)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="paymentDate"
                label="Payment Date"
                type="date"
                fullWidth
                margin="dense"
                InputLabelProps={{ shrink: true }}
                value={paymentData.paymentDate.toISOString().split('T')[0]}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="paymentMethod"
                label="Payment Method"
                fullWidth
                margin="dense"
                value={paymentData.paymentMethod}
                onChange={handleChange}
                required
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="Check">Check</MenuItem>
                <MenuItem value="Online Payment">Online Payment</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="amountPaid"
                label="Amount Paid (₱)"
                type="number"
                fullWidth
                margin="dense"
                value={paymentData.amountPaid}
                onChange={handleChange}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="penaltyPaid"
                label="Penalty Paid (₱)"
                type="number"
                fullWidth
                margin="dense"
                value={paymentData.penaltyPaid}
                onChange={handleChange}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Payment Status</InputLabel>
                <Select
                  name="paymentStatus"
                  value={paymentData.paymentStatus}
                  onChange={handleSelectChange}
                  required
                >
                  <MenuItem value="Full">Full Payment</MenuItem>
                  <MenuItem value="Partial">Partial Payment</MenuItem>
                </Select>
              </FormControl>
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
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!paymentData.loanId || paymentData.amountPaid <= 0}
        >
          Record Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}