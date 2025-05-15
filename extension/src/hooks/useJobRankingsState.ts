import { useState, useEffect, useRef } from 'react';
import { JobRanking } from '../components/JobRankings';

// RORO pattern for hook params
interface UseJobRankingsStateParams {
  rankings: JobRanking[];
  hasMoreJobs: boolean;
}

export function useJobRankingsState({ rankings, hasMoreJobs }: UseJobRankingsStateParams) {
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
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  
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

  // Check directly for more jobs when rankings change
  useEffect(() => {
    console.log('JobRankings useEffect - rankings length:', rankings.length, 'hasMoreJobs prop:', hasMoreJobs);
    
    // Always check storage for more jobs, even when rankings is empty
    chrome.storage.local.get(['allJobRankings', 'currentDisplayIndex'], (result) => {
      const allRankings = result.allJobRankings || [];
      const currentIndex = result.currentDisplayIndex || rankings.length;
      const moreJobsAvailable = allRankings.length > currentIndex;
      
      console.log('JobRankings check - Local storage has', allRankings.length, 'jobs, currently showing', currentIndex);
      console.log('JobRankings check - More jobs available:', moreJobsAvailable);
      
      // Update state with job counts
      if (allRankings.length > 0) {
        setTotalJobs(allRankings.length);
        setRemainingJobs(Math.max(0, allRankings.length - currentIndex));
      } else if (rankings.length > 0) {
        // Fallback to rankings if no allRankings
        setTotalJobs(rankings.length);
        setRemainingJobs(0);
      }
      
      // Update local state - force true if prop is true to handle parent state correctly
      setLocalHasMoreJobs(hasMoreJobs || moreJobsAvailable);
      
      // Log for debugging
      console.log('Jobs data - Total:', allRankings.length, 'Showing:', currentIndex, 'Remaining:', allRankings.length - currentIndex);
    });
  }, [rankings, hasMoreJobs]);

  // Debug logs for pagination
  console.log('JobRankings state - hasMoreJobs prop:', hasMoreJobs, 'localHasMoreJobs:', localHasMoreJobs, 'rankings length:', rankings.length);

  // Add scroll handler to update loading message
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const handleScroll = () => {
      // Remove the problematic loading message code
      // We don't want to show "Reading job descriptions..." when scrolling in the extension
      // No loading messages needed here as these jobs are already analyzed
    };
    
    const container = scrollContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      
      // Clear timeout on cleanup
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [rankings]);
  
  return {
    expandedSkills,
    expandedMatching,
    totalJobs,
    remainingJobs,
    localHasMoreJobs,
    scrollContainerRef,
    toggleSkills,
    toggleMatching
  };
} 