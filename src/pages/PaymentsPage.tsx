import React, { useEffect, useState } from 'react';
import { 
  Box, Button, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, 
  CircularProgress, Alert, Tabs, Tab, Chip
} from '@mui/material';
import { Add, Payment } from '@mui/icons-material';
import { getLoans } from '../services/loans';
import { getPayments } from '../services/payments';
import { Loan, Payment as PaymentType } from '../types';
import { formatFirestoreDate } from '../utils/dateUtils';
import AddPaymentDialog from '../components/AddPaymentDialog';
import { calculateNextDueDate, getDayWithSuffix } from '../utils/calculations';

export default function PaymentsPage() {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentType[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [allLoans, allPayments] = await Promise.all([
        getLoans(),
        getPayments()
      ]);

      // Filter active loans with next unpaid due date
      const filteredActiveLoans = allLoans
        .filter(loan => loan.status !== 'Fully Paid' && loan.dueDate)
        .map(loan => {
          const loanPayments = allPayments
            .filter(p => p.loanId === loan.id && p.paymentDate)
            .sort((a, b) => 
              new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
            );
          
          // Calculate next unpaid due date
          let nextDueDate = new Date(loan.dueDate);
          if (loanPayments.length > 0) {
            const lastPaymentDate = new Date(loanPayments[0].paymentDate);
            nextDueDate = calculateNextDueDate(lastPaymentDate, new Date(loan.dueDate));
          }
          
          return {
            ...loan,
            dueDate: nextDueDate
          };
        })
        .filter(loan => loan.dueDate > new Date()); // Only show future due dates

      setActiveLoans(filteredActiveLoans);
      setPaymentHistory(allPayments);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePaymentAdded = () => {
    fetchData();
    setOpenDialog(false);
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Payment Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Record Payment
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="payment tabs">
          <Tab label="Active Loans for Payment" />
          <Tab label="Payment History" />
        </Tabs>
      </Box>

      {tabValue === 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Borrower</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Amount Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeLoans.map(loan => (
                <TableRow key={loan.id}>
                  <TableCell>{loan.borrowerName}</TableCell>
                  <TableCell>{loan.itemName}</TableCell>
                  <TableCell>
                    {loan.dueDate ? 
                      `${getDayWithSuffix(loan.dueDate)} of the month` : 
                      'N/A'}
                  </TableCell>
                  <TableCell>₱{loan.monthlyDue?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>
                    {loan.status?.includes?.('Delayed') ? (
                      <Chip label="Late" color="error" size="small" />
                    ) : (
                      <Chip label="Active" color="primary" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Payment />}
                      onClick={() => setOpenDialog(true)}
                    >
                      Pay Now
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Borrower</TableCell>
                <TableCell>Loan Item</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Penalty Paid</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentHistory.map(payment => {
                const loan = activeLoans.find(l => l.id === payment.loanId);
                
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.paymentDate ? formatFirestoreDate(payment.paymentDate) : 'N/A'}
                    </TableCell>
                    <TableCell>{loan?.borrowerName || 'Unknown'}</TableCell>
                    <TableCell>{loan?.itemName || 'Unknown'}</TableCell>
                    <TableCell>₱{payment.amountPaid?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>₱{payment.penaltyPaid?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{payment.paymentMethod || 'Cash'}</TableCell>
                    <TableCell>
                      {payment.paymentStatus === 'Full' ? (
                        <Chip label="Full" color="success" size="small" />
                      ) : (
                        <Chip label="Partial" color="warning" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AddPaymentDialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        onPaymentAdded={handlePaymentAdded}
      />
    </Box>
  );
}