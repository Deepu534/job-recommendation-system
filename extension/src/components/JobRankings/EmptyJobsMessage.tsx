import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import AnalysisIcon from '@mui/icons-material/InsightsOutlined';

interface EmptyJobsMessageProps {
  params: {
    onRefresh: () => void;
  }
}

function EmptyJobsMessage({ params }: EmptyJobsMessageProps) {
  const { onRefresh } = params;
  
  return (
    <Box sx={{ 
      my: 2, 
      p: 2, 
      textAlign: 'center',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
      backgroundColor: 'background.paper'
    }}>
      <AnalysisIcon 
        color="primary" 
        sx={{ 
          fontSize: 42, 
          mb: 1.5,
          opacity: 0.8 
        }} 
      />
      <Typography 
        variant="body1" 
        gutterBottom
        color="text.secondary"
      >
        Click the "Scroll & Analyze Jobs" button to analyze job listings on this page
      </Typography>
    </Box>
  );
}

export default EmptyJobsMessage; 