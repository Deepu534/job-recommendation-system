import React from 'react';
import { 
  Box, 
  List, 
  Divider,
  Stack,
  Button,
} from '@mui/material';
import { useJobRankingsState } from '../hooks/useJobRankingsState';

// Import components
import JobRankingsHeader from './JobRankings/JobRankingsHeader';
import EmptyJobsMessage from './JobRankings/EmptyJobsMessage';
import JobCard from './JobRankings/JobCard';
import LoadMoreButton from './JobRankings/LoadMoreButton';
import NextPageButton from './JobRankings/NextPageButton';

// Common styles for reuse
const styles = {
  container: {
    width: '100%',
    overflow: 'visible'
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    height: '100%'
  },
  scrollContainer: {
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 300px)',
    width: '100%',
    pb: 7,
  },
  list: {
    width: '100%',
    p: 0
  }
};

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

// RORO pattern for JobRankingsProps
export interface JobRankingsProps {
  rankings: JobRanking[];
  onJobClick: (jobId: string) => void;
  onRefresh: () => void;
  onLoadMore?: () => void;
  onLoadNextPage?: () => void;
  onClearResults?: () => void;
  hasMoreJobs?: boolean;
  isLoadingMore?: boolean;
  isLoadingNextPage?: boolean;
  showAnalysisButton?: boolean;
  handleMatchJobs?: () => void;
  resumeUploaded?: boolean;
}

// RORO pattern for JobListProps
interface JobListProps {
  params: {
    jobs: JobRanking[];
    onJobClick: (jobId: string) => void;
    expandedSkills: Record<string, boolean>;
    expandedMatching: Record<string, boolean>;
    toggleSkills: (params: { jobId: string; event: React.MouseEvent }) => void;
    toggleMatching: (params: { jobId: string; event: React.MouseEvent }) => void;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
  }
}

// RORO pattern for LoadingButtonsProps
interface LoadingButtonsProps {
  params: {
    hasMoreJobs: boolean;
    onLoadMore?: () => void;
    isLoadingMore: boolean;
    remainingJobs: number;
    totalJobs: number;
    onLoadNextPage?: () => void;
    isLoadingNextPage: boolean;
  }
}

// Extracted reusable JobList component with RORO pattern
function JobList({ params }: JobListProps) {
  const {
    jobs,
    onJobClick,
    expandedSkills,
    expandedMatching,
    toggleSkills,
    toggleMatching,
    scrollContainerRef
  } = params;
  
  if (jobs.length === 0) return null;
  
  return (
    <Box 
      ref={scrollContainerRef}
      sx={styles.scrollContainer}
    >
      <List sx={styles.list}>
        {jobs.map((job, index) => (
          <React.Fragment key={job.id}>
            <JobCard 
              params={{
                job,
                onJobClick,
                expandedSkills,
                expandedMatching,
                toggleSkills,
                toggleMatching
              }}
            />
            {index < jobs.length - 1 && (
              <Divider variant="inset" component="li" />
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}

// Extracted LoadingButtons component with RORO pattern
function LoadingButtons({ params }: LoadingButtonsProps) {
  const {
    hasMoreJobs,
    onLoadMore,
    isLoadingMore,
    remainingJobs,
    totalJobs,
    onLoadNextPage,
    isLoadingNextPage
  } = params;

  return (
    <Box sx={{ 
      width: '100%',
      pt: 1,
      pb: 1,
      position: 'sticky',
      bottom: 0,
      backgroundColor: 'background.paper',
      zIndex: 1,
      boxShadow: '0px -4px 12px rgba(0,0,0,0.08)',
      marginTop: 'auto' // Push to bottom of container
    }}>
      <Stack spacing={1} width="95%" mx="auto">
        {/* Load More Button: Show if there are more jobs to load from the current set */}
        {hasMoreJobs && onLoadMore && (
          <LoadMoreButton 
            params={{
              onLoadMore,
              isLoading: isLoadingMore,
              remainingJobs,
              totalJobs
            }}
          />
        )}
        
        {/* Next Page Button: Show if there are no more jobs from the current set, but a next page might exist */}
        {!hasMoreJobs && onLoadNextPage && (
          <NextPageButton 
            params={{
              onLoadNextPage,
              isLoading: isLoadingNextPage
            }}
          />
        )}
      </Stack>
    </Box>
  );
}

// Main JobRankings component with RORO pattern
function JobRankings({ 
  rankings, 
  onJobClick, 
  onRefresh, 
  onLoadMore, 
  onLoadNextPage,
  onClearResults,
  hasMoreJobs = false, 
  isLoadingMore = false,
  isLoadingNextPage = false,
  showAnalysisButton = false,
  handleMatchJobs,
  resumeUploaded = false
}: JobRankingsProps) {
  // Use custom hook for state management
  const {
    expandedSkills,
    expandedMatching,
    totalJobs,
    remainingJobs,
    localHasMoreJobs,
    scrollContainerRef,
    toggleSkills: originalToggleSkills,
    toggleMatching: originalToggleMatching
  } = useJobRankingsState({
    rankings, 
    hasMoreJobs
  });

  // Adapt original toggle functions to RORO pattern
  const toggleSkills = ({ jobId, event }: { jobId: string; event: React.MouseEvent }) => {
    originalToggleSkills(jobId, event);
  };

  const toggleMatching = ({ jobId, event }: { jobId: string; event: React.MouseEvent }) => {
    originalToggleMatching(jobId, event);
  };

  // Early return pattern for empty state
  const showEmptyMessage = rankings.length === 0;

  return (
    <Box sx={styles.container}>
      {/* Header */}
      <JobRankingsHeader 
        params={{
          rankingsCount: rankings.length,
          hasMoreJobs: localHasMoreJobs,
          onClearResults
        }}
      />
      
      {/* No jobs message */}
      {showEmptyMessage && (
        <EmptyJobsMessage params={{ onRefresh }} />
      )}
      
      {/* Job list with loading buttons */}
      {!showEmptyMessage && (
        <Box sx={styles.contentContainer}>
          <JobList
            params={{
              jobs: rankings,
              onJobClick,
              expandedSkills,
              expandedMatching,
              toggleSkills,
              toggleMatching,
              scrollContainerRef
            }}
          />
          
          <LoadingButtons
            params={{
              hasMoreJobs: localHasMoreJobs,
              onLoadMore,
              isLoadingMore,
              remainingJobs,
              totalJobs,
              onLoadNextPage,
              isLoadingNextPage
            }}
          />
        </Box>
      )}
      
      {/* Scroll & Analyze button for empty state */}
      {showAnalysisButton && resumeUploaded && handleMatchJobs && (
        <Box sx={{ 
          width: '100%',
          pt: 1,
          pb: 1,
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'background.paper',
          zIndex: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0px -4px 12px rgba(0,0,0,0.1)',
          marginTop: 'auto' // Push to bottom of container
        }}>
          <Stack spacing={1} width="95%" mx="auto">
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={handleMatchJobs}
              sx={{ 
                py: 2, 
                fontSize: '0.95rem',
                fontWeight: 'bold',
                boxShadow: 3,
                borderRadius: 1,
                '&:hover': {
                  boxShadow: 5
                }
              }}
            >
              Scroll & Analyze Jobs
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

export default JobRankings; 