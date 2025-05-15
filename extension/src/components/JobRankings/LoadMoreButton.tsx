import React from 'react';
import { 
  Button,
  CircularProgress,
  Box
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export interface LoadMoreProps {
  params: {
    onLoadMore: (() => void) | undefined;
    isLoading: boolean;
    remainingJobs: number;
    totalJobs: number;
  }
}

function LoadMoreButton({ params }: LoadMoreProps) {
  const { onLoadMore, isLoading, remainingJobs, totalJobs } = params;
  
  if (!onLoadMore) return null;
  
  // Calculate shown jobs
  const shownJobs = totalJobs - remainingJobs;
  
  return (
    <Button 
      variant="contained"
      color="primary"
      onClick={onLoadMore}
      disabled={isLoading}
      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <KeyboardArrowDownIcon />}
      fullWidth
      sx={{ 
        py: 2,
        fontSize: '0.95rem',
        fontWeight: 'bold',
        boxShadow: 3,
        '&:hover': {
          boxShadow: 5
        }
      }}
    >
      {isLoading ? 
        "Loading More Jobs..." : 
        `Load More Jobs (${shownJobs}/${totalJobs})`
      }
    </Button>
  );
}

export default LoadMoreButton; 