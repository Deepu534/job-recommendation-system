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