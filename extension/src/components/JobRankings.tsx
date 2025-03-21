import React from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip,
  Divider,
  Button,
  Paper,
  Link,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useJobRankingsState } from '../hooks/useJobRankingsState';
import { formatScore, getScoreColor, getCompanyInitials } from '../utils/jobFormatters';

export interface JobRanking {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  score: number;
  matchPercentage?: string;
  matchingKeywords?: string[];
  keySkills?: string[];
}

interface JobRankingsProps {
  rankings: JobRanking[];
  onJobClick: (jobId: string) => void;
  onRefresh: () => void;
  onLoadMore?: () => void;
  onLoadNextPage?: () => void;
  hasMoreJobs?: boolean;
  isLoadingMore?: boolean;
  isLoadingNextPage?: boolean;
}

// Header component for the job rankings
function JobRankingsHeader({ 
  rankingsCount, 
  hasMoreJobs 
}: { 
  rankingsCount: number; 
  hasMoreJobs: boolean;
}) {
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

// Component for displaying empty state
function EmptyJobsMessage({ onRefresh }: { onRefresh: () => void }) {
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
        Upload your resume (if you haven't already) and click "Analyze Jobs" to rank all LinkedIn job listings by their match with your experience and skills.
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

// Collapsible section component for skills or keywords
interface CollapsibleSectionProps {
  sectionTitle: string;
  isExpanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
  items: string[];
  chipColor: "primary" | "secondary" | "default" | "error" | "info" | "success" | "warning";
  chipIcon?: React.ReactElement;
}

function CollapsibleSection({ 
  sectionTitle, 
  isExpanded, 
  onToggle, 
  items, 
  chipColor, 
  chipIcon 
}: CollapsibleSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }
  
  return (
    <Box sx={{ 
      pl: 9,
      pt: 1,
      width: '100%'
    }}>
      <Box 
        onClick={onToggle} 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {sectionTitle}
        </Typography>
        <IconButton 
          size="small" 
          onClick={onToggle}
          sx={{ ml: 1, p: 0 }}
        >
          {isExpanded ? 
            <KeyboardArrowUpIcon fontSize="small" /> : 
            <KeyboardArrowDownIcon fontSize="small" />
          }
        </IconButton>
      </Box>
      
      {isExpanded && (
        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          mt: 0.5
        }}>
          {items.map((item, i) => (
            <Chip 
              key={i}
              label={item}
              size="small"
              variant="outlined"
              color={chipColor}
              icon={chipIcon}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// LoadMoreButton component
interface LoadMoreProps {
  onLoadMore: (() => void) | undefined;
  isLoading: boolean;
  remainingJobs: number;
  totalJobs: number;
}

function LoadMoreButton({ onLoadMore, isLoading, remainingJobs, totalJobs }: LoadMoreProps) {
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

// NextPageButton component
interface NextPageProps {
  onLoadNextPage: (() => void) | undefined;
  isLoading: boolean;
}

function NextPageButton({ onLoadNextPage, isLoading }: NextPageProps) {
  if (!onLoadNextPage) return null;
  
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      width: '100%',
      pt: 1,
      pb: 1,
      position: 'sticky',
      bottom: 0,
      backgroundColor: 'background.paper',
      zIndex: 1,
      borderTop: '1px solid',
      borderColor: 'divider'
    }}>
      <Stack spacing={1} width="90%">
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
              py: 1.5,
              fontWeight: 'bold'
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
        <Typography variant="caption" color="text.secondary" align="center">
          This will navigate to the next page and automatically analyze those jobs
        </Typography>
      </Stack>
    </Box>
  );
}

// JobCard component
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
          chipIcon={<AssignmentIcon />}
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

// Main JobRankings component
function JobRankings({ 
  rankings, 
  onJobClick, 
  onRefresh, 
  onLoadMore, 
  onLoadNextPage,
  hasMoreJobs = false, 
  isLoadingMore = false,
  isLoadingNextPage = false
}: JobRankingsProps) {
  // Use custom hook for state management
  const {
    expandedSkills,
    expandedMatching,
    totalJobs,
    remainingJobs,
    localHasMoreJobs,
    scrollContainerRef,
    toggleSkills,
    toggleMatching
  } = useJobRankingsState(rankings, hasMoreJobs);

  return (
    <Box sx={{ 
      width: '100%',
      overflow: 'visible'
    }}>
      {/* Header */}
      <JobRankingsHeader 
        rankingsCount={rankings.length} 
        hasMoreJobs={localHasMoreJobs}
      />
      
      {/* No jobs message */}
      {rankings.length === 0 && (
        <EmptyJobsMessage onRefresh={onRefresh} />
      )}
      
      {/* Job list */}
      {rankings.length > 0 && (
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          height: '100%'
        }}>
          <Box 
            ref={scrollContainerRef}
            sx={{ 
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 300px)',
              width: '100%'
            }}
          >
            <List sx={{ 
              width: '100%',
              p: 0
            }}>
              {rankings.map((job, index) => (
                <React.Fragment key={job.id}>
                  <JobCard 
                    job={job}
                    onJobClick={onJobClick}
                    expandedSkills={expandedSkills}
                    expandedMatching={expandedMatching}
                    toggleSkills={toggleSkills}
                    toggleMatching={toggleMatching}
                  />
                  {index < rankings.length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          </Box>
          
          {/* Load More Button */}
          {localHasMoreJobs && (
            <LoadMoreButton 
              onLoadMore={onLoadMore}
              isLoading={isLoadingMore}
              remainingJobs={remainingJobs}
              totalJobs={totalJobs}
            />
          )}
          
          {/* Next Page Button */}
          <NextPageButton 
            onLoadNextPage={onLoadNextPage}
            isLoading={isLoadingNextPage}
          />
        </Box>
      )}
    </Box>
  );
}

export default JobRankings; 