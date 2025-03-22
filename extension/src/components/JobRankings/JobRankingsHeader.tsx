import React from 'react';
import { 
  Box, 
  Typography, 
  Button
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

export interface JobRankingsHeaderProps { 
  params: {
    rankingsCount: number; 
    hasMoreJobs: boolean;
    onClearResults?: () => void;
  }
}

function JobRankingsHeader({ params }: JobRankingsHeaderProps) {
  const { rankingsCount, hasMoreJobs, onClearResults } = params;
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: 1,
      mb: 2
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography variant="h6">
          AI Job Rankings
        </Typography>
        
        {/* Clear Results Button */}
        {rankingsCount > 0 && onClearResults && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<ClearIcon />}
            onClick={onClearResults}
            sx={{
              fontWeight: 'bold',
              fontSize: '0.8rem',
              py: 0.5,
              px: 1.5
            }}
          >
            Clear Results
          </Button>
        )}
      </Box>
      
      {/* Job count indicator */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}>
        <Typography variant="body2" color="text.secondary">
          {rankingsCount > 0 
            ? `Showing ${rankingsCount} job matches${hasMoreJobs ? ' (more available)' : ''}` 
            : 'No jobs analyzed yet. Click "Analyze Jobs" to begin.'
          }
        </Typography>
      </Box>
    </Box>
  );
}

export default JobRankingsHeader; 