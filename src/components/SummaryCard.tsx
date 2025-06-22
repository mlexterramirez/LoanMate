import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  minWidth: 200,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  borderRadius: '10px',
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
}));

export default function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <StyledCard>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Box>
          <Box>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </StyledCard>
  );
}