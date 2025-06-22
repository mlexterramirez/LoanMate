import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import { Add, Receipt } from '@mui/icons-material';
import { getLoans } from '../services/loans';
import { getPayments, deletePayment } from '../services/payments';
import { Loan, Payment } from '../types';
import { formatFirestoreDate } from '../utils/dateUtils';
import AddPaymentDialog from '../components/AddPaymentDialog';

export default function PaymentsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  const fetchData = async () => {
    const loansData = await getLoans();
    const paymentsData = await getPayments();
    setLoans(loansData);
    setPayments(paymentsData);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePayment(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeLoans = loans.filter(loan => loan.status !== 'Fully Paid');

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
      
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Active Loans for Payment</Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Borrower</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Amount Due</TableCell>
              <TableCell>Penalty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeLoans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell>{loan.borrowerName}</TableCell>
                <TableCell>{loan.itemName}</TableCell>
                <TableCell>{loan.dueDate ? formatFirestoreDate(loan.dueDate) : '-'}</TableCell>
                <TableCell>₱{loan.monthlyDue?.toFixed(2)}</TableCell>
                <TableCell>₱{loan.penalty?.toFixed(2) || '0.00'}</TableCell>
                <TableCell>
                  <Box 
                    component="span" 
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: loan.status.includes('Delayed') ? 'error.light' : 'primary.light',
                      color: 'white',
                      fontSize: '0.75rem'
                    }}
                  >
                    {loan.status}
                  </Box>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Receipt />}
                    onClick={() => setOpenDialog(true)}
                  >
                    Pay
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Typography variant="h6" gutterBottom>Payment History</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Borrower</TableCell>
              <TableCell>Loan</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{formatFirestoreDate(payment.paymentDate)}</TableCell>
                <TableCell>{payment.borrowerId}</TableCell>
                <TableCell>{payment.loanId}</TableCell>
                <TableCell>₱{payment.amountPaid.toFixed(2)}</TableCell>
                <TableCell>{payment.paymentMethod}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(payment.id!)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AddPaymentDialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        onPaymentAdded={fetchData}
      />
    </Box>
  );
}