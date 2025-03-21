import React from 'react';
import { 
  Box, 
  Typography, 
} from '@mui/material';

interface JobRankingsHeaderProps { 
  rankingsCount: number; 
  hasMoreJobs: boolean;
}

function JobRankingsHeader({ 
  rankingsCount, 
  hasMoreJobs 
}: JobRankingsHeaderProps) {
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