import React from 'react';
import { 
  Box, 
  Typography, 
  Button,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

export interface EmptyJobsMessageProps {
  params: {
    onRefresh: () => void;
  }
}

function EmptyJobsMessage({ params }: EmptyJobsMessageProps) {
  const { onRefresh } = params;
  
  return (
    <Box sx={{ 
      textAlign: 'center',
      p: 3,
      width: '100%'
    }}>
      <WorkIcon sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
      <Typography variant="h6" align="center" gutterBottom>
        No Jobs Analyzed Yet
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" paragraph>
        Upload your resume (if you haven't already) and click "Analyze Jobs" to rank all LinkedIn job listings by their match with your experience and skills. <br />
        <br />
        Note: Do not close this extension while we are processing your job matches.
      </Typography>
      <Button 
        variant="contained"
        color="primary"
        startIcon={<AutoFixHighIcon />}
        onClick={onRefresh}
        sx={{ mt: 2 }}
      >
        Analyze All Jobs
      </Button>
    </Box>
  );
}

export default EmptyJobsMessage; 