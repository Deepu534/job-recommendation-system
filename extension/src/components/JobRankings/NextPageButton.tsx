import React from 'react';
import { 
  Button,
  CircularProgress,
  Tooltip,
  Box
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

export interface NextPageProps {
  params: {
    onLoadNextPage: (() => void) | undefined;
    isLoading: boolean;
  }
}

function NextPageButton({ params }: NextPageProps) {
  const { onLoadNextPage, isLoading } = params;
  
  if (!onLoadNextPage) return null;
  
  return (
    <Tooltip 
      title="Navigate to and automatically analyze the next page of LinkedIn job results" 
      placement="top"
      arrow
    >
      <Button
        variant="contained"
        color="secondary"
        onClick={onLoadNextPage}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <MoreHorizIcon />}
        size="large"
        sx={{ 
          width: '100%',
          py: 2,
          fontWeight: 'bold',
          fontSize: '0.95rem'
        }}
      >
        {isLoading ? 
          <Box sx={{ 
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
            <span>Analyzing Next Page...</span>
          </Box> 
          : 'Load & Analyze Next Page'}
      </Button>
    </Tooltip>
  );
}

export default NextPageButton; 