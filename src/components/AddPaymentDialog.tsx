import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, Grid, Typography, Box, CircularProgress, Alert,
  MenuItem, InputAdornment, Chip, FormControl, InputLabel, Select, 
  SelectChangeEvent
} from '@mui/material';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { Loan, Payment, Installment } from '../types';
import { usePaymentService } from '../services/payments';
import { calculateTotalAmountDue } from '../utils/calculations';
import { formatFirestoreDate } from '../utils/dateUtils';

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
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [selectedInstallment, setSelectedInstallment] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<Omit<Payment, 'id'>>({
    loanId: loan.id || '',
    borrowerId: loan.borrowerId || '',
    amountPaid: 0,
    penaltyPaid: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Full',
    paymentDate: new Date(),
    notes: '',
    installmentId: ''
  });
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(loan);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [principalDue, setPrincipalDue] = useState<number>(0);
  const [penaltyDue, setPenaltyDue] = useState<number>(0);

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date === 'string') return new Date(date);
    return null;
  };

  useEffect(() => {
    if (open) {
      let loanInstallments = loan.installments || [];
      if (loanInstallments.length === 0) {
        loanInstallments = generateInstallments(
          loan.startDate ? new Date(loan.startDate) : new Date(),
          loan.terms || 0,
          loan.monthlyDue || 0
        );
      }
      
      loanInstallments = loanInstallments.map(inst => ({
        ...inst,
        dueDate: parseDate(inst.dueDate) || new Date()
      }));
      
      setInstallments(loanInstallments);
      
      const totalDue = calculateTotalAmountDue(loan);
      const principal = loan.outstandingBalances?.reduce(
        (sum, balance) => sum + (balance.baseAmount || 0), 0) || 0;
      const penalty = loan.outstandingBalances?.reduce(
        (sum, balance) => sum + (balance.penaltyAmount || 0), 0) || 0;
      
      setDueAmount(totalDue);
      setPrincipalDue(principal);
      setPenaltyDue(penalty);
      
      const firstPendingInstallment = loanInstallments.find(inst => inst.status === 'pending');
      const initialInstallmentId = firstPendingInstallment?.id || '';
      
      setPaymentData({
        loanId: loan.id || '',
        borrowerId: loan.borrowerId || '',
        amountPaid: firstPendingInstallment?.principalAmount || 0,
        penaltyPaid: firstPendingInstallment?.penaltyAmount || 0,
        paymentMethod: 'Cash',
        paymentStatus: 'Full',
        paymentDate: new Date(),
        notes: '',
        installmentId: initialInstallmentId
      });
      
      setSelectedInstallment(initialInstallmentId);
      setSelectedLoan(loan);
      setError(null);
    }
  }, [open, loan]);

  const generateInstallments = (startDate: Date, terms: number, monthlyDue: number): Installment[] => {
    const installments: Installment[] = [];
    const dueDate = new Date(startDate);

    for (let i = 0; i < terms; i++) {
      const installmentDueDate = new Date(dueDate);
      installmentDueDate.setMonth(dueDate.getMonth() + i + 1);
      
      installments.push({
        id: `installment_${i+1}`,
        dueDate: installmentDueDate,
        principalAmount: monthlyDue,
        penaltyAmount: 0,
        paidAmount: 0,
        status: 'pending'
      });
    }
    return installments;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'loanId') {
      const newLoan = loans.find(l => l.id === value) || null;
      setSelectedLoan(newLoan);
      
      const newInstallments = newLoan?.installments || [];
      setInstallments(newInstallments);
      
      const firstPending = newInstallments.find(inst => inst.status === 'pending');
      const newInstallmentId = firstPending?.id || '';
      
      setPaymentData(prev => ({
        ...prev,
        [name]: value,
        borrowerId: newLoan?.borrowerId || '',
        amountPaid: firstPending?.principalAmount || 0,
        penaltyPaid: firstPending?.penaltyAmount || 0,
        installmentId: newInstallmentId
      }));
      
      setSelectedInstallment(newInstallmentId);
    } else if (name === 'amountPaid' || name === 'penaltyPaid') {
      const numericValue = parseFloat(value) || 0;
      
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

  const handleInstallmentChange = (e: SelectChangeEvent<string>) => {
    const installmentId = e.target.value as string;
    const installment = installments.find(inst => inst.id === installmentId);
    
    if (installment) {
      setSelectedInstallment(installmentId);
      setPaymentData(prev => ({
        ...prev,
        installmentId,
        amountPaid: installment.principalAmount - (installment.paidAmount || 0),
        penaltyPaid: installment.penaltyAmount || 0
      }));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!paymentData.loanId) {
      setError('Please select a loan');
      return;
    }
    
    if (!paymentData.installmentId) {
      setError('Please select an installment');
      return;
    }
    
    if (paymentData.amountPaid <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }
    
    const totalPayment = paymentData.amountPaid + paymentData.penaltyPaid;
    
    if (totalPayment > dueAmount) {
      setError(`Total payment (₱${totalPayment.toFixed(2)}) cannot exceed total due of ₱${dueAmount.toFixed(2)}`);
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
                <Typography>Term: {selectedLoan.terms} months</Typography>
                
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
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Select Installment</InputLabel>
              <Select
                value={selectedInstallment || ''}
                onChange={handleInstallmentChange}
                label="Select Installment"
              >
                {installments.map(installment => {
                  const dueDate = parseDate(installment.dueDate);
                  return (
                    <MenuItem 
                      key={installment.id} 
                      value={installment.id}
                      disabled={installment.status === 'paid'}
                    >
                      <Box display="flex" alignItems="center">
                        {installment.status === 'paid' ? (
                          <CheckCircle color="success" sx={{ mr: 1 }} />
                        ) : (
                          <RadioButtonUnchecked sx={{ mr: 1 }} />
                        )}
                        <Typography>
                          {dueDate ? formatFirestoreDate(dueDate) : 'N/A'} - 
                          ₱{installment.principalAmount.toFixed(2)}
                          {(installment.penaltyAmount || 0) > 0 && ` + ₱${(installment.penaltyAmount || 0).toFixed(2)} penalty`}
                        </Typography>
                        {installment.status === 'paid' && (
                          <Chip 
                            label="Paid" 
                            size="small" 
                            color="success" 
                            sx={{ ml: 1 }} 
                          />
                        )}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount Paid"
              name="amountPaid"
              value={paymentData.amountPaid.toFixed(2)}
              onChange={handleChange}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { min: 0 }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Penalty Paid"
              name="penaltyPaid"
              value={paymentData.penaltyPaid.toFixed(2)}
              onChange={handleChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { min: 0 }
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const date = new Date(e.target.value);
                if (date.toString() !== 'Invalid Date') {
                  setPaymentData(prev => ({
                    ...prev,
                    paymentDate: date
                  }));
                }
              }}
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
              placeholder={`The borrower is paying a ${paymentData.paymentStatus.toLowerCase()} amount of ₱${(paymentData.amountPaid + paymentData.penaltyPaid).toFixed(2)} (₱${paymentData.amountPaid.toFixed(2)} principal + ₱${paymentData.penaltyPaid.toFixed(2)} penalty) via ${paymentData.paymentMethod}`}
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