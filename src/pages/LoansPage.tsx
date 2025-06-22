import React, { useEffect, useState } from 'react';
import { 
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Chip, Tooltip, CircularProgress, Alert 
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Event, Money, Warning } from '@mui/icons-material';
import { getLoans, deleteLoan } from '../services/loans';
import { getPayments } from '../services/payments'; // Import payments service
import { Loan } from '../types';
import { formatFirestoreDate } from '../utils/dateUtils';
import AddLoanDialog from '../components/AddLoanDialog';

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<any[]>([]); // State for payments
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both loans and payments in parallel
      const [loansData, paymentsData] = await Promise.all([
        getLoans(),
        getPayments()
      ]);
      
      setLoans(loansData);
      setPayments(paymentsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLoan(id);
      await fetchData(); // Refresh data after delete
    } catch (error) {
      console.error('Error deleting loan:', error);
      setError('Failed to delete loan');
    }
  };

  const calculateEndDate = (startDate: Date, terms: number) => {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + terms);
    return endDate;
  };

  const calculateDaysLate = (dueDate?: Date) => {
    if (!dueDate) return 0;
    const today = new Date();
    const diffTime = Math.max(0, today.getTime() - dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateAmountDue = (loan: Loan) => {
    if (!loan.dueDate) return loan.monthlyDue || 0;
    
    const daysLate = calculateDaysLate(loan.dueDate);
    const penaltyRate = 0.05;
    const penalty = daysLate > 5 ? (loan.monthlyDue || 0) * penaltyRate * Math.floor(daysLate / 30) : 0;
    
    return (loan.monthlyDue || 0) + penalty;
  };

  // Calculate number of payments for a loan
  const getPaymentCount = (loanId: string) => {
    return payments.filter(payment => payment.loanId === loanId).length;
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Loan Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Add Loan
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Borrower</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Downpayment</TableCell>
              <TableCell>Paid</TableCell> {/* New Paid column */}
              <TableCell>Amount Due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Late/Penalty</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loans.map((loan) => {
              const endDate = calculateEndDate(loan.startDate || new Date(), loan.terms || 0);
              const daysLate = calculateDaysLate(loan.dueDate);
              const amountDue = calculateAmountDue(loan);
              const paymentCount = getPaymentCount(loan.id || '');
              
              return (
                <TableRow key={loan.id}>
                  <TableCell>{loan.borrowerName}</TableCell>
                  <TableCell>{loan.itemName}</TableCell>
                  <TableCell>{formatFirestoreDate(loan.startDate)}</TableCell>
                  <TableCell>{formatFirestoreDate(endDate)}</TableCell>
                  <TableCell>₱{(loan.totalPrice || 0).toFixed(2)}</TableCell>
                  <TableCell>₱{(loan.downpayment || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    {paymentCount}/{loan.terms || 0} {/* Paid status */}
                  </TableCell>
                  <TableCell>₱{amountDue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={loan.status || 'Active'} 
                      color={
                        loan.status?.includes?.('Delayed') ? 'error' : 
                        loan.status === 'Fully Paid' ? 'success' : 'primary'
                      } 
                    />
                  </TableCell>
                  <TableCell>
                    {daysLate > 0 ? (
                      <Tooltip title={`${daysLate} days late`}>
                        <Chip 
                          icon={<Warning />}
                          label={`${daysLate} days`}
                          color="error"
                          size="small"
                        />
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Loan">
                      <IconButton size="small">
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Loan">
                      <IconButton 
                        size="small" 
                        onClick={() => loan.id && handleDelete(loan.id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <AddLoanDialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        onLoanAdded={fetchData}
      />
    </Box>
  );
}