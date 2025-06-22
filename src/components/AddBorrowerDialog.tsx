import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { addBorrower, updateBorrower } from '../services/borrowers';
import { Borrower } from '../types';

interface AddBorrowerDialogProps {
  open: boolean;
  onClose: () => void;
  onBorrowerAdded: () => void;
  borrower?: Borrower | null;
}

export default function AddBorrowerDialog({ 
  open, 
  onClose, 
  onBorrowerAdded,
  borrower: editBorrower
}: AddBorrowerDialogProps) {
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

  useEffect(() => {
    if (editBorrower) {
      setBorrower({
        fullName: editBorrower.fullName || '',
        homeAddress: editBorrower.homeAddress || '',
        primaryContact: editBorrower.primaryContact || '',
        contactEmail: editBorrower.contactEmail || '',
        workAddress: editBorrower.workAddress || '',
        referenceContact1: editBorrower.referenceContact1 || { name: '', contact: '' },
        referenceContact2: editBorrower.referenceContact2 || { name: '', contact: '' },
        photoURL: editBorrower.photoURL || ''
      });
    } else {
      setBorrower({ 
        fullName: '',
        homeAddress: '',
        primaryContact: '',
        contactEmail: '',
        workAddress: '',
        referenceContact1: { name: '', contact: '' },
        referenceContact2: { name: '', contact: '' },
        photoURL: ''
      });
    }
  }, [editBorrower]);

  const handleSubmit = async () => {
    try {
      if (editBorrower && editBorrower.id) {
        await updateBorrower(editBorrower.id, borrower);
      } else {
        await addBorrower(borrower);
      }
      onBorrowerAdded();
      onClose();
    } catch (error) {
      console.error('Error saving borrower:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBorrower({
      ...borrower,
      [name]: value
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editBorrower ? "Edit Borrower" : "Add New Borrower"}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Full Name"
          name="fullName"
          fullWidth
          value={borrower.fullName}
          onChange={handleChange}
          required
        />
        <TextField
          margin="dense"
          label="Home Address"
          name="homeAddress"
          fullWidth
          value={borrower.homeAddress}
          onChange={handleChange}
          required
        />
        <TextField
          margin="dense"
          label="Primary Contact"
          name="primaryContact"
          fullWidth
          value={borrower.primaryContact}
          onChange={handleChange}
          required
        />
        <TextField
          margin="dense"
          label="Email"
          name="contactEmail"
          fullWidth
          value={borrower.contactEmail}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Work Address"
          name="workAddress"
          fullWidth
          value={borrower.workAddress}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Reference 1 Name"
          fullWidth
          value={borrower.referenceContact1.name}
          onChange={(e) => setBorrower({
            ...borrower,
            referenceContact1: {
              ...borrower.referenceContact1,
              name: e.target.value
            }
          })}
        />
        <TextField
          margin="dense"
          label="Reference 1 Contact"
          fullWidth
          value={borrower.referenceContact1.contact}
          onChange={(e) => setBorrower({
            ...borrower,
            referenceContact1: {
              ...borrower.referenceContact1,
              contact: e.target.value
            }
          })}
        />
        <TextField
          margin="dense"
          label="Reference 2 Name"
          fullWidth
          value={borrower.referenceContact2.name}
          onChange={(e) => setBorrower({
            ...borrower,
            referenceContact2: {
              ...borrower.referenceContact2,
              name: e.target.value
            }
          })}
        />
        <TextField
          margin="dense"
          label="Reference 2 Contact"
          fullWidth
          value={borrower.referenceContact2.contact}
          onChange={(e) => setBorrower({
            ...borrower,
            referenceContact2: {
              ...borrower.referenceContact2,
              contact: e.target.value
            }
          })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {editBorrower ? "Update" : "Add"} Borrower
        </Button>
      </DialogActions>
    </Dialog>
  );
}