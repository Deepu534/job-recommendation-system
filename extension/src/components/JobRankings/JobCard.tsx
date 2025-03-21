import React from 'react';
import { 
  Box, 
  Typography, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip,
  Paper,
  Link,
} from '@mui/material';
import { JobRanking } from '../JobRankings';
import { formatScore, getScoreColor, getCompanyInitials } from '../../utils/jobFormatters';
import CollapsibleSection from './CollapsibleSection';

interface JobCardProps {
  job: JobRanking;
  onJobClick: (jobId: string) => void;
  expandedSkills: Record<string, boolean>;
  expandedMatching: Record<string, boolean>;
  toggleSkills: (jobId: string, event: React.MouseEvent) => void;
  toggleMatching: (jobId: string, event: React.MouseEvent) => void;
}

function JobCard({ 
  job, 
  onJobClick, 
  expandedSkills, 
  expandedMatching, 
  toggleSkills, 
  toggleMatching 
}: JobCardProps) {
  return (
    <Paper 
      elevation={1}
      sx={{ 
        mb: 1,
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)'
        }
      }}
    >
      <ListItem
        alignItems="flex-start"
        button
        onClick={() => onJobClick(job.id)}
        sx={{ flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          width: '100%'
        }}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {getCompanyInitials(job.company)}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
              }}>
                <Typography 
                  variant="subtitle1"
                  component="span"
                  noWrap
                  sx={{ 
                    maxWidth: '70%',
                    fontWeight: 600
                  }}
                >
                  {job.title}
                </Typography>
                <Chip 
                  label={formatScore(job)}
                  color={getScoreColor(job) as "success" | "primary" | "warning" | "error"}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Box>
            }
            secondary={
              <>
                <Typography
                  variant="body2"
                  color="text.primary"
                  component="span"
                >
                  {job.company}
                </Typography>
                {" — "}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="span"
                >
                  {job.location}
                </Typography>
              </>
            }
          />
        </Box>
        
        {/* Key skills section */}
        <CollapsibleSection 
          sectionTitle="Key Skills Required:"
          isExpanded={!!expandedSkills[job.id]}
          onToggle={(e) => toggleSkills(job.id, e)}
          items={job.keySkills || []}
          chipColor="secondary"
        />
        
        {/* Matching keywords */}
        <CollapsibleSection 
          sectionTitle="Your Matching Skills:"
          isExpanded={!!expandedMatching[job.id]}
          onToggle={(e) => toggleMatching(job.id, e)}
          items={job.matchingKeywords || []}
          chipColor="primary"
        />
        
        {/* LinkedIn URL */}
        <Box sx={{ pl: 9, pt: 1 }}>
          <Link 
            href={job.url}
            target="_blank"
            rel="noopener"
            onClick={(e) => e.stopPropagation()}
            color="primary"
            underline="hover"
            variant="body2"
          >
            View in new tab
          </Link>
        </Box>
      </ListItem>
    </Paper>
  );
}

export default JobCard; 