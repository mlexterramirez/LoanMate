import React, { useEffect, useState } from 'react';
import { 
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Chip, Tooltip
} from '@mui/material';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import { getBorrowers, deleteBorrower } from '../services/borrowers';
import { Borrower } from '../types';
import AddBorrowerDialog from '../components/AddBorrowerDialog';

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editBorrower, setEditBorrower] = useState<Borrower | null>(null);

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

  const handleEdit = (borrower: Borrower) => {
    setEditBorrower(borrower);
    setOpenDialog(true);
  };

  useEffect(() => {
    fetchBorrowers();
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Borrower Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => {
            setEditBorrower(null);
            setOpenDialog(true);
          }}
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
              <TableCell>Email</TableCell>
              <TableCell>Total Loans</TableCell>
              <TableCell>Late Payments</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {borrowers.map((borrower) => (
              <TableRow key={borrower.id}>
                <TableCell>{borrower.fullName}</TableCell>
                <TableCell>{borrower.primaryContact}</TableCell>
                <TableCell>{borrower.contactEmail}</TableCell>
                <TableCell>
                  <Chip label={borrower.loanStats?.totalLoans || 0} color="primary" />
                </TableCell>
                <TableCell>
                  <Chip label={borrower.loanStats?.latePayments || 0} color="secondary" />
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(borrower)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(borrower.id!)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
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
        borrower={editBorrower}
      />
    </Box>
  );
}