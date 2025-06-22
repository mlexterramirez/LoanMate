import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { getBorrowers, deleteBorrower } from '../services/borrowers';
import { Borrower } from '../types';
import AddBorrowerDialog from '../components/AddBorrowerDialog';

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  const fetchBorrowers = async () => {
    const data = await getBorrowers();
    setBorrowers(data);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBorrower(id);
      fetchBorrowers();
    } catch (error) {
      console.error('Error deleting borrower:', error);
    }
  };

  useEffect(() => {
    fetchBorrowers();
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Borrowers Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Add Borrower
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Total Loans</TableCell>
              <TableCell>Late Payments</TableCell>
              <TableCell>Total Paid</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {borrowers.map((borrower) => (
              <TableRow key={borrower.id}>
                <TableCell>{borrower.fullName}</TableCell>
                <TableCell>{borrower.primaryContact}</TableCell>
                <TableCell>{borrower.homeAddress}</TableCell>
                <TableCell>{borrower.loanStats.totalLoans}</TableCell>
                <TableCell>{borrower.loanStats.latePayments}</TableCell>
                <TableCell>₱{borrower.loanStats.totalPaid.toLocaleString()}</TableCell>
                <TableCell>
                  <Box 
                    component="span" 
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: borrower.loanStats.latePayments ? 'error.light' : 'success.light',
                      color: 'white',
                      fontSize: '0.75rem'
                    }}
                  >
                    {borrower.loanStats.latePayments ? 'Late' : 'Good'}
                  </Box>
                </TableCell>
                <TableCell>
                  <IconButton size="small"><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleDelete(borrower.id!)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AddBorrowerDialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        onBorrowerAdded={fetchBorrowers}
      />
    </Box>
  );
}