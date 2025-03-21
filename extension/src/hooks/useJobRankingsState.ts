import { useState, useEffect, useRef } from 'react';
import { JobRanking } from '../components/JobRankings';

export function useJobRankingsState(rankings: JobRanking[], hasMoreJobs: boolean) {
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

  // Debug logs for pagination
  console.log('JobRankings state - hasMoreJobs prop:', hasMoreJobs, 'localHasMoreJobs:', localHasMoreJobs, 'rankings length:', rankings.length);

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