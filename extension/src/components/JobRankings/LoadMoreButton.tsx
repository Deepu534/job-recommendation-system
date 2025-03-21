import React from 'react';
import { 
  Box, 
  Button,
  CircularProgress,
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
  
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      width: '100%',
      backgroundColor: 'background.paper',
      pt: 2,
      pb: 2,
      borderTop: '2px solid',
      borderColor: 'primary.main',
      zIndex: 2,
      boxShadow: '0px -4px 12px rgba(0,0,0,0.15)'
    }}>
      <Button 
        variant="contained"
        color="primary"
        onClick={onLoadMore}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <KeyboardArrowDownIcon />}
        fullWidth
        sx={{ 
          maxWidth: '90%', 
          py: 1.5,
          fontSize: '1rem',
          fontWeight: 'bold',
          boxShadow: 3,
          '&:hover': {
            boxShadow: 5
          }
        }}
      >
        {isLoading 
          ? <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              '& > span': {
                fontWeight: 'bold',
                animation: 'pulse 1.5s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 0.7 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.7 },
                }
              }
            }}>
              <span>Loading More Jobs...</span>
            </Box>
          : `Load More Jobs (${remainingJobs} remaining of ${totalJobs} total)`}
      </Button>
    </Box>
  );
}

export default LoadMoreButton; 