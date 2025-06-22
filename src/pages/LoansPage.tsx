import React, { useEffect, useState } from 'react';
import { 
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Chip, Tooltip 
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Event, Money, Warning } from '@mui/icons-material';
import { getLoans, deleteLoan } from '../services/loans';
import { Loan } from '../types';
import { formatFirestoreDate, toDate } from '../utils/dateUtils';
import AddLoanDialog from '../components/AddLoanDialog';

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  const fetchLoans = async () => {
    const data = await getLoans();
    // Convert Firestore Timestamps to Dates
    const processedLoans = data.map(loan => ({
      ...loan,
      startDate: toDate(loan.startDate),
      dueDate: loan.dueDate ? toDate(loan.dueDate) : undefined
    }));
    setLoans(processedLoans);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLoan(id);
      fetchLoans();
    } catch (error) {
      console.error('Error deleting loan:', error);
    }
  };

  // Calculate end date based on start date and terms
  const calculateEndDate = (startDate: Date, terms: number) => {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + terms);
    return endDate;
  };

  // Calculate days late
  const calculateDaysLate = (dueDate?: Date) => {
    if (!dueDate) return 0;
    const today = new Date();
    const diffTime = Math.max(0, today.getTime() - dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate amount due with penalties
  const calculateAmountDue = (loan: Loan) => {
    if (!loan.dueDate) return loan.monthlyDue || 0;
    
    const daysLate = calculateDaysLate(loan.dueDate);
    const penaltyRate = 0.05; // 5% penalty
    const penalty = daysLate > 5 ? loan.monthlyDue * penaltyRate * Math.floor(daysLate / 30) : 0;
    
    return (loan.monthlyDue || 0) + penalty;
  };

  useEffect(() => {
    fetchLoans();
  }, []);

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
              <TableCell>Amount Due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Late/Penalty</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loans.map((loan) => {
              const endDate = calculateEndDate(loan.startDate, loan.terms);
              const daysLate = calculateDaysLate(loan.dueDate);
              const amountDue = calculateAmountDue(loan);
              
              return (
                <TableRow key={loan.id}>
                  <TableCell>{loan.borrowerName}</TableCell>
                  <TableCell>{loan.itemName}</TableCell>
                  <TableCell>{formatFirestoreDate(loan.startDate)}</TableCell>
                  <TableCell>{formatFirestoreDate(endDate)}</TableCell>
                  <TableCell>₱{loan.totalPrice?.toFixed(2)}</TableCell>
                  <TableCell>₱{loan.downpayment?.toFixed(2)}</TableCell>
                  <TableCell>₱{amountDue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={loan.status} 
                      color={
                        loan.status.includes('Delayed') ? 'error' : 
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
                      <IconButton size="small" onClick={() => handleDelete(loan.id!)}>
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
        onLoanAdded={fetchLoans}
      />
    </Box>
  );
}