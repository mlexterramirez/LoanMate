import React, { useEffect, useState } from 'react';
import { 
  Box, Grid, Typography, Tab, Tabs, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Chip, CircularProgress, Alert 
} from '@mui/material';
import { AttachMoney, MoneyOff, Schedule, Warning } from '@mui/icons-material';
import SummaryCard from '../components/SummaryCard';
import { getLoans } from '../services/loans';
import { getPayments } from '../services/payments';
import { getBorrowers } from '../services/borrowers';
import { Loan, Borrower } from '../types';
import { formatFirestoreDate } from '../utils/dateUtils';
import { calculateNextDueDate } from '../utils/calculations';

interface DashboardSummary {
  totalCollected: number;
  totalOutstanding: number;
  upcomingDue: number;
  lateLoans: number;
}

interface UpcomingPayment {
  borrowerId: string;
  borrowerName: string;
  dueDate: Date | null;
  amount: number;
  status: string;
  loanStats: string;
  itemName: string;
}

export default function DashboardPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalCollected: 0,
    totalOutstanding: 0,
    upcomingDue: 0,
    lateLoans: 0,
  });
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [allLoans, allBorrowers, allPayments] = await Promise.all([
          getLoans(),
          getBorrowers(),
          getPayments()
        ]);

        const collected = allPayments.reduce((sum: number, payment: any) => 
          sum + (payment.amountPaid || 0), 0);
        
        const outstanding = allLoans
          .filter(loan => loan.status !== 'Fully Paid')
          .reduce((sum: number, loan: Loan) => 
            sum + (loan.totalPrice || 0) - (loan.totalPaid || 0), 0);
        
        const today = new Date();
        
        // Calculate upcoming payments with next unpaid due date
        const upcomingPaymentsData = allLoans
          .filter(loan => loan.status !== 'Fully Paid' && loan.dueDate)
          .map(loan => {
            const borrower = allBorrowers.find(b => b.id === loan.borrowerId);
            const loanPayments = allPayments
              .filter(p => p.loanId === loan.id && p.paymentDate)
              .sort((a, b) => {
                const aDate = a.paymentDate ? new Date(a.paymentDate) : new Date(0);
                const bDate = b.paymentDate ? new Date(b.paymentDate) : new Date(0);
                return bDate.getTime() - aDate.getTime();
              });
            
            // Find the next unpaid due date
            let nextDueDate = loan.dueDate ? new Date(loan.dueDate) : null;
            if (loanPayments.length > 0 && loanPayments[0].paymentDate) {
              const lastPaymentDate = new Date(loanPayments[0].paymentDate);
              nextDueDate = calculateNextDueDate(lastPaymentDate);
            }
            
            // Only show if next due date is in the future
            if (!nextDueDate || nextDueDate < today) return null;

            return {
              borrowerId: loan.borrowerId || '',
              borrowerName: loan.borrowerName || '',
              dueDate: nextDueDate,
              amount: loan.monthlyDue || 0,
              status: loan.status?.includes?.('Delayed') ? 'Late' : 'Active',
              loanStats: borrower ? 
                `${borrower.loanStats?.totalLoans || 0} Loans, ${borrower.loanStats?.latePayments || 0} Late, ₱${(borrower.loanStats?.totalPaid || 0).toLocaleString()} Paid` : 
                '',
              itemName: loan.itemName || ''
            };
          })
          .filter(payment => payment !== null)
          .sort((a, b) => (a!.dueDate?.getTime() || 0) - (b!.dueDate?.getTime() || 0)) as UpcomingPayment[];
        
        setSummary({
          totalCollected: collected,
          totalOutstanding: outstanding,
          upcomingDue: upcomingPaymentsData.length,
          lateLoans: upcomingPaymentsData.filter(p => p.status === 'Late').length,
        });
        
        setLoans(allLoans);
        setBorrowers(allBorrowers);
        setPayments(allPayments);
        setUpcomingPayments(upcomingPaymentsData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const filteredPayments = tabValue === 0 
    ? upcomingPayments 
    : upcomingPayments.filter(payment => payment.status === 'Late');

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Dashboard Overview</Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <SummaryCard 
            title="Total Collected" 
            value={`₱${summary.totalCollected.toLocaleString()}`} 
            icon={<AttachMoney fontSize="large" />} 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard 
            title="Total Outstanding" 
            value={`₱${summary.totalOutstanding.toLocaleString()}`} 
            icon={<MoneyOff fontSize="large" />} 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard 
            title="Upcoming Due" 
            value={summary.upcomingDue.toString()} 
            icon={<Schedule fontSize="large" />} 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard 
            title="Late Loans" 
            value={summary.lateLoans.toString()} 
            icon={<Warning fontSize="large" />} 
          />
        </Grid>
      </Grid>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="payment tabs">
          <Tab label="All Upcoming Payments" />
          <Tab label="Late Payments" />
        </Tabs>
      </Box>
      
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {tabValue === 0 ? 'All Upcoming Payments' : 'Late Payments'}
        <Typography variant="body2" component="span">
          {filteredPayments.length} records
        </Typography>
      </Typography>
      
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Borrower</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Home Address</TableCell>
              <TableCell>Loan Stats</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.map((payment, index) => {
              const borrower = borrowers.find(b => b.id === payment.borrowerId);
              return (
                <React.Fragment key={index}>
                  <TableRow>
                    <TableCell>{payment.borrowerName}</TableCell>
                    <TableCell>
                      {payment.dueDate ? formatFirestoreDate(payment.dueDate) : 'N/A'}
                      {payment.status === 'Late' && (
                        <Chip label="Late" color="error" size="small" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{borrower?.fullName || ''}</TableCell>
                    <TableCell>{borrower?.homeAddress || ''}</TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.status === 'Late' ? 'Overdue' : 'Active'} 
                        color={payment.status === 'Late' ? 'error' : 'success'} 
                        size="small" 
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 1, borderTop: 'none' }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        backgroundColor: '#f5f5f5',
                        borderRadius: 1,
                        p: 1
                      }}>
                        <Typography variant="body2">
                          <strong>Item:</strong> {payment.itemName}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Amount Due:</strong> ₱{payment.amount.toFixed(2)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Borrower Stats:</strong> {payment.loanStats}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Typography variant="h6" gutterBottom>Borrower Summary</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Borrower</TableCell>
              <TableCell>Total Loans</TableCell>
              <TableCell>Late Payments</TableCell>
              <TableCell>Total Paid</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {borrowers.map(borrower => (
              <TableRow key={borrower.id}>
                <TableCell>{borrower.fullName}</TableCell>
                <TableCell>{borrower.loanStats?.totalLoans || 0}</TableCell>
                <TableCell>{borrower.loanStats?.latePayments || 0}</TableCell>
                <TableCell>₱{(borrower.loanStats?.totalPaid || 0).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={(borrower.loanStats?.latePayments || 0) > 0 ? 'Has Late Payments' : 'Good Standing'} 
                    color={(borrower.loanStats?.latePayments || 0) > 0 ? 'warning' : 'success'} 
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}