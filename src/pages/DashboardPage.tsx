import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import SummaryCard from '../components/SummaryCard';
import { getLoans, checkAndUpdateOverdueLoans } from '../services/loans';
import { getPayments } from '../services/payments';
import { getBorrowers } from '../services/borrowers';
import { Loan, Borrower } from '../types';
import { AttachMoney, MoneyOff, Schedule, Warning } from '@mui/icons-material';
import { formatFirestoreDate, formatDate } from '../utils/dateUtils';

interface DashboardSummary {
  totalCollected: number;
  totalOutstanding: number;
  upcomingDue: number;
  lateLoans: number;
}

interface UpcomingPayment {
  borrowerId: string;
  borrowerName: string;
  dueDate: Date;
  amount: number;
  status: string;
  loanStats: string;
  itemName: string;
}

export default function DashboardPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalCollected: 0,
    totalOutstanding: 0,
    upcomingDue: 0,
    lateLoans: 0,
  });
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      await checkAndUpdateOverdueLoans();
      const allLoans = await getLoans();
      const allBorrowers = await getBorrowers();
      const allPayments = await getPayments();
      
      const collected = allPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
      const outstanding = allLoans
        .filter(loan => loan.status !== 'Fully Paid')
        .reduce((sum, loan) => sum + loan.totalPrice - (loan.totalPaid || 0), 0);
      
      const today = new Date();
      const upcoming = allLoans.filter(loan => 
        loan.dueDate && 
        loan.dueDate.toDate() > today && 
        loan.status !== 'Fully Paid'
      ).length;
      
      const late = allLoans.filter(loan => loan.status.includes('Delayed')).length;
      
      // Prepare upcoming payments data with borrower stats
      const paymentsData = allLoans
        .filter(loan => loan.status !== 'Fully Paid' && loan.dueDate)
        .map(loan => {
          const borrower = allBorrowers.find(b => b.id === loan.borrowerId);
          return {
            borrowerId: loan.borrowerId,
            borrowerName: loan.borrowerName,
            dueDate: loan.dueDate.toDate(),
            amount: loan.monthlyDue,
            status: loan.status.includes('Delayed') ? 'Late' : 'Active',
            loanStats: borrower ? 
              `${borrower.loanStats.totalLoans} Loans, ${borrower.loanStats.latePayments} Late, ₱${borrower.loanStats.totalPaid.toLocaleString()} Paid` : 
              '',
            itemName: loan.itemName
          };
        })
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      
      setSummary({
        totalCollected: collected,
        totalOutstanding: outstanding,
        upcomingDue: upcoming,
        lateLoans: late,
      });
      
      setLoans(allLoans);
      setBorrowers(allBorrowers);
      setUpcomingPayments(paymentsData);
    };
    
    fetchData();
    
    // Check for overdue loans every hour
    const interval = setInterval(checkAndUpdateOverdueLoans, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Filter payments based on selected tab
  const filteredPayments = tabValue === 0 
    ? upcomingPayments 
    : upcomingPayments.filter(payment => payment.status === 'Late');

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
                      {formatDate(payment.dueDate)}
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
                <TableCell>{borrower.loanStats.totalLoans}</TableCell>
                <TableCell>{borrower.loanStats.latePayments}</TableCell>
                <TableCell>₱{borrower.loanStats.totalPaid.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip 
                    label={borrower.loanStats.latePayments > 0 ? 'Has Late Payments' : 'Good Standing'} 
                    color={borrower.loanStats.latePayments > 0 ? 'warning' : 'success'} 
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