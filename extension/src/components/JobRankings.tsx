import React, { useState, useEffect, useRef } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

// Define the job ranking interface
interface JobRanking {
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
  // State to track which job's skills sections are expanded
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [expandedMatching, setExpandedMatching] = useState<Record<string, boolean>>({});
  // Local state for hasMoreJobs in case the prop isn't working
  const [localHasMoreJobs, setLocalHasMoreJobs] = useState(hasMoreJobs);
  // Add state to track total jobs and remaining jobs
  const [totalJobs, setTotalJobs] = useState(rankings.length);
  const [remainingJobs, setRemainingJobs] = useState(0);
  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Check directly for more jobs when rankings change
  useEffect(() => {
    console.log('JobRankings useEffect - rankings length:', rankings.length, 'hasMoreJobs prop:', hasMoreJobs);
    
    if (rankings.length > 0) {
      // Check storage for more jobs
      chrome.storage.local.get(['allJobRankings', 'currentDisplayIndex'], (result) => {
        const allRankings = result.allJobRankings || [];
        const currentIndex = result.currentDisplayIndex || rankings.length;
        const moreJobsAvailable = allRankings.length > currentIndex;
        
        console.log('JobRankings check - Local storage has', allRankings.length, 'jobs, currently showing', currentIndex);
        console.log('JobRankings check - More jobs available:', moreJobsAvailable);
        
        // Update state with job counts
        setTotalJobs(allRankings.length);
        setRemainingJobs(Math.max(0, allRankings.length - currentIndex));
        
        // Update local state
        setLocalHasMoreJobs(moreJobsAvailable);
      });
    }
  }, [rankings, hasMoreJobs]);
  
  // Toggle skills expansion for a job
  const toggleSkills = (jobId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent job click
    setExpandedSkills(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };
  
  // Toggle matching skills expansion for a job
  const toggleMatching = (jobId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent job click
    setExpandedMatching(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  // Format the score as a percentage
  const formatScore = (job: JobRanking) => {
    // Use matchPercentage if available, otherwise calculate from score
    if (job.matchPercentage) {
      return job.matchPercentage;
    }
    return `${Math.round(job.score * 100)}%`;
  };
  
  // Get color based on score
  const getScoreColor = (job: JobRanking) => {
    // Get numeric value from either matchPercentage or score
    let percentage = 0;
    if (job.matchPercentage) {
      // Extract number from strings like "85%"
      percentage = parseInt(job.matchPercentage.replace('%', ''), 10);
    } else {
      percentage = Math.round(job.score * 100);
    }
    
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'primary';
    if (percentage >= 40) return 'warning';
    return 'error';
  };
  
  // Generate company initials for the avatar
  const getCompanyInitials = (company: string) => {
    if (!company) return 'JB';
    
    const words = company.split(' ');
    
    if (words.length === 1) {
      return company.substring(0, 2).toUpperCase();
    }
    
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Debug logs for pagination
  console.log('JobRankings render - hasMoreJobs prop:', hasMoreJobs, 'localHasMoreJobs:', localHasMoreJobs, 'rankings length:', rankings.length);

  // Add scroll handler to update loading message
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const handleScroll = () => {
      if (rankings.length === 0) return;
      
      // If user is actively scrolling, update loading indicator message
      chrome.runtime.sendMessage({ 
        action: 'UPDATE_LOADING_MESSAGE', 
        message: 'Reading job descriptions...'
      });
    };
    
    const container = scrollContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [rankings]);

  return (
    <Box sx={{ 
      width: '100%',
      overflow: 'visible'
    }}>
      {/* Header with buttons */}
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
            {rankings.length > 0 
              ? `Showing ${rankings.length} job matches${(hasMoreJobs || localHasMoreJobs) ? ' (more available)' : ''}` 
              : 'No jobs analyzed yet. Click "Analyze Jobs" to begin.'
            }
          </Typography>
        </Box>
      </Box>
      
      {/* No jobs message */}
      {rankings.length === 0 && (
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
      )}
      
      {/* Job list */}
      {rankings.length > 0 && (
        <Box 
          ref={scrollContainerRef}
          sx={{ 
            overflowY: 'auto',
            maxHeight: '450px', // Use fixed height instead of vh units
            width: '100%'
          }}
        >
          <List sx={{ 
            width: '100%',
            p: 0
          }}>
            {rankings.map((job, index) => (
              <React.Fragment key={job.id}>
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
                    
                    {/* Key skills section - collapsible */}
                    {job.keySkills && job.keySkills.length > 0 && (
                      <Box sx={{ 
                        pl: 9,
                        pt: 1,
                        width: '100%'
                      }}>
                        <Box 
                          onClick={(e) => toggleSkills(job.id, e)} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Key Skills Required:
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={(e) => toggleSkills(job.id, e)}
                            sx={{ ml: 1, p: 0 }}
                          >
                            {expandedSkills[job.id] ? 
                              <KeyboardArrowUpIcon fontSize="small" /> : 
                              <KeyboardArrowDownIcon fontSize="small" />
                            }
                          </IconButton>
                        </Box>
                        
                        {expandedSkills[job.id] && (
                          <Box sx={{ 
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            mt: 0.5
                          }}>
                            {job.keySkills.map((skill, i) => (
                              <Chip 
                                key={i}
                                label={skill}
                                size="small"
                                variant="outlined"
                                color="secondary"
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    {/* Matching keywords - collapsible */}
                    {job.matchingKeywords && job.matchingKeywords.length > 0 && (
                      <Box sx={{ 
                        pl: 9,
                        pt: 1,
                        width: '100%'
                      }}>
                        <Box 
                          onClick={(e) => toggleMatching(job.id, e)} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Your Matching Skills:
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={(e) => toggleMatching(job.id, e)}
                            sx={{ ml: 1, p: 0 }}
                          >
                            {expandedMatching[job.id] ? 
                              <KeyboardArrowUpIcon fontSize="small" /> : 
                              <KeyboardArrowDownIcon fontSize="small" />
                            }
                          </IconButton>
                        </Box>
                        
                        {expandedMatching[job.id] && (
                          <Box sx={{ 
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            mt: 0.5
                          }}>
                            {job.matchingKeywords.map((keyword, i) => (
                              <Chip 
                                key={i}
                                label={keyword}
                                size="small"
                                variant="outlined"
                                color="primary"
                                icon={<AssignmentIcon />}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                    
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
                {index < rankings.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
          
          {/* Load More Button for pagination within current jobs */}
          {onLoadMore && (hasMoreJobs || localHasMoreJobs) && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              width: '100%',
              position: 'static', // Changed from sticky to static
              marginTop: '16px', // Add margin top for spacing after job list
              marginBottom: '16px', // Add margin bottom for spacing
              backgroundColor: 'background.paper',
              pt: 2,
              pb: 2,
              borderTop: '2px solid',
              borderColor: 'primary.main',
              zIndex: 2, // Lower z-index so it doesn't overlay incorrectly
              boxShadow: '0px -4px 12px rgba(0,0,0,0.15)'
            }}>
              <Button 
                variant="contained"
                color="primary"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                startIcon={isLoadingMore ? <CircularProgress size={20} color="inherit" /> : <KeyboardArrowDownIcon />}
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
                {isLoadingMore 
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
          )}
          
          {/* Added the Analyze Next Page button at the bottom */}
          {onLoadNextPage && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              width: '100%',
              marginTop: '16px',
              marginBottom: '16px',
              pt: 1,
              pb: 1,
            }}>
              <Tooltip 
                title="This will navigate to the next page of LinkedIn job results and clear your current job analysis" 
                placement="bottom"
                arrow
              >
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={onLoadNextPage}
                  disabled={isLoadingNextPage}
                  startIcon={isLoadingNextPage ? <CircularProgress size={16} color="secondary" /> : <MoreHorizIcon />}
                  size="medium"
                  sx={{ width: '90%' }}
                >
                  {isLoadingNextPage ? 
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
                      <span>Loading...</span>
                    </Box> 
                    : 'Analyze Next Page'}
                </Button>
              </Tooltip>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default JobRankings; 