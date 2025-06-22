import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, Grid, IconButton, 
  Tooltip, Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  InputAdornment, useTheme
} from '@mui/material';
import { Add, Search, Edit, Delete, Payment, Visibility } from '@mui/icons-material';
import { useLoanService } from '../services/loans';
import { Loan } from '../types';
import { usePaymentService } from '../services/payments';
import AddLoanDialog from '../components/AddLoanDialog';
import AddPaymentDialog from '../components/AddPaymentDialog';
import { calculateDaysLate, calculateTotalAmountDue } from '../utils/calculations';

const LoansPage: React.FC = () => {
  const { getLoans, deleteLoan } = useLoanService();
  const { getPaymentsByLoan } = usePaymentService();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [openLoanDialog, setOpenLoanDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    const filtered = loans.filter(loan => 
      loan.borrowerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLoans(filtered);
  }, [searchTerm, loans]);

  const loadLoans = async () => {
    try {
      const allLoans = await getLoans();
      setLoans(allLoans);
      setFilteredLoans(allLoans);
    } catch (error) {
      console.error('Error loading loans:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddLoan = () => {
    setOpenLoanDialog(true);
  };

  const handleLoanAdded = () => {
    setOpenLoanDialog(false);
    loadLoans();
  };

  const handleAddPayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setOpenPaymentDialog(true);
  };

  const handlePaymentAdded = () => {
    setOpenPaymentDialog(false);
    loadLoans();
  };

  const handleViewDetails = (loanId: string) => {
    navigate(`/loans/${loanId}`);
  };

  const handleEditLoan = (loan: Loan) => {
    navigate(`/loans/edit/${loan.id}`);
  };

  const handleDeleteLoan = (loanId: string) => {
    setLoanToDelete(loanId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (loanToDelete) {
      try {
        await deleteLoan(loanToDelete);
        loadLoans();
      } catch (error) {
        console.error('Error deleting loan:', error);
      }
      setDeleteConfirmOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Fully Paid':
        return theme.palette.success.main;
      case 'Active':
        return theme.palette.info.main;
      case 'Severely Delayed':
        return theme.palette.error.main;
      case 'Delayed':
        return theme.palette.warning.main;
      default:
        return theme.palette.text.primary;
    }
  };

  const getLoanDetails = (loan: Loan) => {
    if (!loan.outstandingBalances || loan.outstandingBalances.length === 0) {
      return { daysLate: 0, penaltyAmount: 0 };
    }
    
    const oldestBalance = loan.outstandingBalances[0];
    const daysLate = Math.max(0, calculateDaysLate(oldestBalance.dueDate) - 5);
    const penaltyAmount = oldestBalance.penaltyAmount;
    
    return { daysLate, penaltyAmount };
  };

  // Convert values to numbers safely
  const safeToNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  };

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Loan Management</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={handleAddLoan}
        >
          Add New Loan
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search Loans"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Borrower</TableCell>
              <TableCell>Item</TableCell>
              <TableCell align="right">Loan Amount</TableCell>
              <TableCell align="right">Paid</TableCell>
              <TableCell align="right">Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLoans.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((loan) => {
              const { daysLate, penaltyAmount } = getLoanDetails(loan);
              const totalPrice = safeToNumber(loan.totalPrice);
              const totalPaid = safeToNumber(loan.totalPaid);
              
              return (
                <TableRow key={loan.id}>
                  <TableCell>{loan.borrowerName}</TableCell>
                  <TableCell>{loan.itemName}</TableCell>
                  <TableCell align="right">₱{totalPrice.toFixed(2)}</TableCell>
                  <TableCell align="right">₱{totalPaid.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    {loan.dueDate?.toLocaleDateString() || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Box 
                      display="inline-block" 
                      px={1.5} 
                      py={0.5} 
                      borderRadius={1}
                      bgcolor={getStatusColor(loan.status)}
                      color="white"
                    >
                      {loan.status}
                      {daysLate > 0 && ` (${daysLate} days)`}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton onClick={() => handleViewDetails(loan.id!)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleEditLoan(loan)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add Payment">
                      <IconButton 
                        onClick={() => handleAddPayment(loan)}
                        disabled={loan.status === 'Fully Paid'}
                      >
                        <Payment />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        onClick={() => handleDeleteLoan(loan.id!)}
                        disabled={loan.status !== 'Fully Paid'}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredLoans.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      <AddLoanDialog 
        open={openLoanDialog} 
        onClose={() => setOpenLoanDialog(false)} 
        onLoanAdded={handleLoanAdded} 
      />

      {selectedLoan && (
        <AddPaymentDialog 
          open={openPaymentDialog} 
          onClose={() => setOpenPaymentDialog(false)} 
          onPaymentAdded={handlePaymentAdded}
          loan={selectedLoan}
          loans={loans}
        />
      )}

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this loan? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LoansPage;