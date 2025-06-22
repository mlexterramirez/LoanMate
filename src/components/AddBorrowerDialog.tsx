import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { Borrower } from '../types';
import { addBorrower } from '../services/borrowers';

interface AddBorrowerDialogProps {
  open: boolean;
  onClose: () => void;
  onBorrowerAdded: () => void;
}

export default function AddBorrowerDialog({ open, onClose, onBorrowerAdded }: AddBorrowerDialogProps) {
  const [borrower, setBorrower] = useState<Omit<Borrower, 'id' | 'loanStats'>>({ 
    fullName: '',
    homeAddress: '',
    primaryContact: '',
    contactEmail: '',
    workAddress: '',
    referenceContact1: { name: '', contact: '' },
    referenceContact2: { name: '', contact: '' },
    photoURL: ''
  });

  const handleSubmit = async () => {
    try {
      await addBorrower({
        ...borrower,
        loanStats: {
          totalLoans: 0,
          latePayments: 0,
          totalPaid: 0
        }
      });
      onBorrowerAdded();
      onClose();
    } catch (error) {
      console.error('Error adding borrower:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add New Borrower</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Full Name"
          fullWidth
          value={borrower.fullName}
          onChange={(e) => setBorrower({...borrower, fullName: e.target.value})}
        />
        <TextField
          margin="dense"
          label="Home Address"
          fullWidth
          value={borrower.homeAddress}
          onChange={(e) => setBorrower({...borrower, homeAddress: e.target.value})}
        />
        <TextField
          margin="dense"
          label="Primary Contact"
          fullWidth
          value={borrower.primaryContact}
          onChange={(e) => setBorrower({...borrower, primaryContact: e.target.value})}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Add Borrower</Button>
      </DialogActions>
    </Dialog>
  );
}