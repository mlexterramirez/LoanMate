import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Chip } from '@mui/material';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import { getLoans, deleteLoan } from '../services/loans';
import { Loan } from '../types';
import { formatFirestoreDate } from '../utils/dateUtils';
import AddLoanDialog from '../components/AddLoanDialog';

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  const fetchLoans = async () => {
    const data = await getLoans();
    setLoans(data);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLoan(id);
      fetchLoans();
    } catch (error) {
      console.error('Error deleting loan:', error);
    }
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
              <TableCell>Due Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell>{loan.borrowerName}</TableCell>
                <TableCell>{loan.itemName}</TableCell>
                <TableCell>{formatFirestoreDate(loan.startDate)}</TableCell>
                <TableCell>{loan.dueDate ? formatFirestoreDate(loan.dueDate) : '-'}</TableCell>
                <TableCell>₱{loan.totalPrice?.toFixed(2)}</TableCell>
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
                  <IconButton size="small"><Visibility fontSize="small" /></IconButton>
                  <IconButton size="small"><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleDelete(loan.id!)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
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