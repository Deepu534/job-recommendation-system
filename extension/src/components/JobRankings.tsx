import React from 'react';
import { 
  Box, 
  List, 
  Divider,
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
    width: '100%'
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
  hasMoreJobs?: boolean;
  isLoadingMore?: boolean;
  isLoadingNextPage?: boolean;
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
    <>
      {/* Load More Button */}
      {hasMoreJobs && (
        <LoadMoreButton 
          params={{
            onLoadMore,
            isLoading: isLoadingMore,
            remainingJobs,
            totalJobs
          }}
        />
      )}
      
      {/* Next Page Button */}
      <NextPageButton 
        params={{
          onLoadNextPage,
          isLoading: isLoadingNextPage
        }}
      />
    </>
  );
}

// Main JobRankings component with RORO pattern
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
          hasMoreJobs: localHasMoreJobs
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
    </Box>
  );
}

export default JobRankings; 