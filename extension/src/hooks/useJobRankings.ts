import { useState, useEffect, useRef } from 'react';

interface UseJobRankingsProps {
  setIsLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
  setError: (error: string | null) => void;
  isLoading: boolean;
}

export function useJobRankings({ 
  setIsLoading, 
  setLoadingMessage, 
  setError,
  isLoading
}: UseJobRankingsProps) {
  // State for job rankings
  const [jobRankings, setJobRankings] = useState<any[]>([]);
  // State for tracking pagination
  const [hasMoreJobs, setHasMoreJobs] = useState(false);
  // State for tracking if we're loading more jobs
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // State for tracking if loading next page jobs
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);
  // Ref to track if job matching is in progress
  const isMatchingJobsRef = useRef(false);
  // Current batch index for pagination
  const currentBatchRef = useRef(0);
  
  // Initialize job rankings
  useEffect(() => {
    // Check for pagination status immediately
    chrome.storage.local.get(['allJobRankings', 'currentDisplayIndex'], (result) => {
      const allRankings = result.allJobRankings || [];
      const currentIndex = result.currentDisplayIndex || 0;
      console.log('Initial check - Stored rankings:', allRankings.length, 'Current index:', currentIndex);
      
      // If we have more jobs stored than we're displaying, enable the Load More button
      if (allRankings.length > currentIndex && currentIndex > 0) {
        setHasMoreJobs(true);
        console.log('Initial check - More jobs available, setting hasMoreJobs to true');
      }
    });

    // Get job rankings if available
    chrome.runtime.sendMessage({ action: 'GET_JOB_RANKINGS' }, (response) => {
      console.log('Job rankings response:', response);
      if (response && response.jobRankings && response.jobRankings.length > 0) {
        setJobRankings(response.jobRankings);
        console.log(`Found ${response.jobRankings.length} job rankings`);
        
        // Also check if there are more jobs in storage
        chrome.storage.local.get(['allJobRankings', 'currentDisplayIndex'], (result) => {
          const allRankings = result.allJobRankings || [];
          const currentIndex = result.currentDisplayIndex || response.jobRankings.length;
          console.log(`Stored rankings: ${allRankings.length}, current index: ${currentIndex}`);
          
          // If we have more jobs stored than we're displaying, enable the Load More button
          if (allRankings.length > currentIndex) {
            setHasMoreJobs(true);
            console.log('More jobs available, enabling Load More button');
          }
        });
      } else {
        console.log('No job rankings available yet');
      }
    });
  }, []);
  
  // Handle next page success message (separate effect to avoid dependency issues)
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'NEXT_PAGE_SUCCESS' && message.data) {
        console.log('Received next page success:', message.data);
        // Automatically trigger job matching after next page success
        setIsLoadingNextPage(false);
        setError(null);
        
        // Ensure loading message is properly configured for next page
        resetAndActivateLoadingMessage();
        
        // Automatically trigger job matching with the new jobs
        console.log('Automatically triggering job matching after next page navigation');
        setIsLoading(true);
        setLoadingMessage('Matching jobs with your resume...');
        chrome.runtime.sendMessage({ 
          action: 'MATCH_JOBS',
          start: 0,
          limit: message.data.jobCount || 100, // Process all extracted jobs
          displayLimit: 10 // But only show top 10 initially in UI, matching behavior of first page
        }, (matchResponse) => {
          console.log('Match jobs response after next page:', matchResponse);
          setIsLoading(false);
          
          if (matchResponse && matchResponse.success && matchResponse.jobRankings) {
            // Check if we have more than 10 results
            const totalResults = matchResponse.jobRankings.length;
            const initialBatchSize = 10;
            const hasMore = totalResults > initialBatchSize;
            
            console.log(`Received ${totalResults} total ranked jobs from next page after language filtering`);
            
            // Only show the top 10 jobs initially
            setJobRankings(matchResponse.jobRankings.slice(0, initialBatchSize));
            console.log(`Showing top ${initialBatchSize} jobs out of ${totalResults} total ranked jobs from next page`);
            
            // We'll have more jobs to show if the total is greater than initial batch size
            setHasMoreJobs(hasMore);
            console.log('Setting hasMoreJobs for next page to:', hasMore);
            
            // Store all rankings in storage for pagination
            chrome.storage.local.set({ 
              allJobRankings: matchResponse.jobRankings,
              currentDisplayIndex: initialBatchSize
            }, () => {
              console.log(`Stored all ${totalResults} ranked jobs in local storage for pagination. Has more: ${hasMore}`);
            });
          } else if (matchResponse && matchResponse.error) {
            setError(`Error matching jobs: ${matchResponse.error}`);
            
            // Disable loading message on job matching error
            chrome.runtime.sendMessage({ 
              action: 'CONFIGURE_LOADING_MESSAGE', 
              enabled: false
            });
          } else {
            setError('Unknown error matching jobs');
            
            // Disable loading message on unknown error
            chrome.runtime.sendMessage({ 
              action: 'CONFIGURE_LOADING_MESSAGE', 
              enabled: false
            });
          }
        });
      } else if (message.action === 'NEXT_PAGE_ERROR' && message.error) {
        console.error('Next page error:', message.error);
        setIsLoadingNextPage(false);
        setError(`Error: ${message.error}`);
        
        // Disable loading message on error
        chrome.runtime.sendMessage({ 
          action: 'CONFIGURE_LOADING_MESSAGE', 
          enabled: false
        });
      }
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Cleanup function to remove the listener when component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [setError, setIsLoading, setLoadingMessage]);
  
  // Reset and activate loading message system for LinkedIn page content scrolling
  const resetAndActivateLoadingMessage = () => {
    // First disable to clear any existing state
    chrome.runtime.sendMessage({ 
      action: 'CONFIGURE_LOADING_MESSAGE', 
      enabled: false
    });
    
    // Then re-enable with proper configuration - NOTE: This is only for LinkedIn page content scrolling
    // NOT for scrolling in the extension UI
    setTimeout(() => {
      chrome.runtime.sendMessage({ 
        action: 'CONFIGURE_LOADING_MESSAGE', 
        enabled: true,
        defaultMessage: 'Processing job descriptions...'
      });
      
      // Show initial message
      chrome.runtime.sendMessage({ 
        action: 'UPDATE_LOADING_MESSAGE', 
        message: 'Processing job descriptions...'
      });
    }, 100);
  };

  // Request job matching
  const handleMatchJobs = () => {
    // Prevent multiple simultaneous job matching requests
    if (isMatchingJobsRef.current || isLoading) {
      console.log('Job matching already in progress, skipping');
      return;
    }
    
    console.log('Manually requesting job matching...');
    setError(null);
    setIsLoading(true);
    setLoadingMessage('Extracting job listings...');
    isMatchingJobsRef.current = true;
    // Reset pagination
    currentBatchRef.current = 0;
    
    // Reset and activate loading message system
    resetAndActivateLoadingMessage();
    
    // First, make sure we have jobs
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        console.log('Requesting job extraction from content script');
        chrome.tabs.sendMessage(tabs[0].id, { action: 'EXTRACT_JOBS' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error extracting jobs:', chrome.runtime.lastError);
            setIsLoading(false);
            setError('Error communicating with LinkedIn page. Try refreshing the page.');
            isMatchingJobsRef.current = false;
            
            // Disable loading message on error
            chrome.runtime.sendMessage({ 
              action: 'CONFIGURE_LOADING_MESSAGE', 
              enabled: false
            });
            return;
          }
          
          // Check for extraction errors
          if (response && response.error) {
            console.error('Job extraction error:', response.error);
            setIsLoading(false);
            setError(`Error extracting jobs: ${response.error}`);
            isMatchingJobsRef.current = false;
            
            // Disable loading message on error
            chrome.runtime.sendMessage({ 
              action: 'CONFIGURE_LOADING_MESSAGE', 
              enabled: false
            });
            return;
          }
          
          // Check if we got any job listings
          if (!response || !response.jobListings || response.jobListings.length === 0) {
            console.error('No job listings returned from extraction');
            setIsLoading(false);
            setError('No job listings found. Please make sure you are on a LinkedIn jobs search results page.');
            isMatchingJobsRef.current = false;
            
            // Disable loading message on error
            chrome.runtime.sendMessage({ 
              action: 'CONFIGURE_LOADING_MESSAGE', 
              enabled: false
            });
            return;
          }
          
          console.log(`Successfully extracted ${response.jobListings.length} job listings`);
          
          // Now request job matching for ALL jobs, but with a display limit
          console.log('Sending MATCH_JOBS message to backend for all jobs, with display pagination');
          // Update loading message for API processing
          setLoadingMessage('Processing job matches...');
          chrome.runtime.sendMessage({ 
            action: 'MATCH_JOBS',
            start: 0,
            limit: response.jobListings.length, // Process ALL jobs in the backend instead of just 10
            displayLimit: 10 // But only show top 10 initially in UI
          }, (matchResponse) => {
            console.log('Match jobs response:', matchResponse);
            setIsLoading(false);
            isMatchingJobsRef.current = false;
            
            if (matchResponse && matchResponse.success && matchResponse.jobRankings) {
              // Check if we have more than 10 results
              const totalResults = matchResponse.jobRankings.length;
              const initialBatchSize = 10;
              const hasMore = totalResults > initialBatchSize;
              
              console.log(`Received ${totalResults} total ranked jobs from backend after language filtering`);
              
              // Only show the top 10 jobs initially
              setJobRankings(matchResponse.jobRankings.slice(0, initialBatchSize));
              console.log(`Showing top ${initialBatchSize} jobs out of ${totalResults} total ranked jobs`);
              
              // We'll have more jobs to show if the total is greater than initial batch size
              setHasMoreJobs(hasMore);
              console.log('Setting hasMoreJobs to:', hasMore);
              
              // Store all rankings in storage for pagination
              chrome.storage.local.set({ 
                allJobRankings: matchResponse.jobRankings,
                currentDisplayIndex: initialBatchSize
              }, () => {
                console.log(`Stored all ${totalResults} ranked jobs in local storage for pagination. Has more: ${hasMore}`);
              });
            } else if (matchResponse && matchResponse.error) {
              console.error('Error matching jobs:', matchResponse.error);
              setError(`Error matching jobs: ${matchResponse.error}`);
              
              // Disable loading message on job matching error
              chrome.runtime.sendMessage({ 
                action: 'CONFIGURE_LOADING_MESSAGE', 
                enabled: false
              });
            } else {
              console.error('Unknown error matching jobs');
              setError('Failed to match jobs. Make sure both resume and job listings are available.');
              
              // Disable loading message on unknown error
              chrome.runtime.sendMessage({ 
                action: 'CONFIGURE_LOADING_MESSAGE', 
                enabled: false
              });
            }
          });
        });
      } else {
        setIsLoading(false);
        isMatchingJobsRef.current = false;
        setError('No active LinkedIn tab found. Please open a LinkedIn jobs page.');
      }
    });
  };
  
  // Load more job rankings
  const handleLoadMore = () => {
    if (isLoadingMore) {
      console.log('Already loading more jobs, skipping request');
      return;
    }
    
    console.log('Loading more job rankings...');
    setIsLoadingMore(true);
    setError(null);
    
    // Get all rankings and current display index from storage
    chrome.storage.local.get(['allJobRankings', 'currentDisplayIndex'], (result) => {
      const allRankings = result.allJobRankings || [];
      const currentIndex = result.currentDisplayIndex || 0;
      
      console.log(`Loading more job rankings, current display index: ${currentIndex}, total rankings: ${allRankings.length}`);
      
      if (allRankings.length <= currentIndex) {
        console.log('No more jobs to load');
        setHasMoreJobs(false);
        setIsLoadingMore(false);
        return;
      }
      
      // Calculate the next batch - show 10 more jobs
      const batchSize = 10;
      const nextIndex = currentIndex + batchSize;
      const hasMore = nextIndex < allRankings.length;
      
      console.log(`Adding jobs from index ${currentIndex} to ${nextIndex}, has more: ${hasMore}`);
      
      // Add a slight delay to simulate loading (good for UX)
      setTimeout(() => {
        // Show the next 10 jobs (or whatever remains)
        setJobRankings(prevRankings => {
          const newRankings = [...prevRankings, ...allRankings.slice(currentIndex, nextIndex)];
          console.log(`Now showing ${newRankings.length} jobs out of ${allRankings.length} total jobs`);
          return newRankings;
        });
        
        // Set hasMoreJobs state after updating the rankings
        console.log(`Setting hasMoreJobs to: ${hasMore}`);
        setHasMoreJobs(hasMore);
        
        // Update the current display index
        chrome.storage.local.set({ currentDisplayIndex: nextIndex }, () => {
          // Set loading state to false after state is updated
          setIsLoadingMore(false);
          console.log(`Loaded more jobs. Now showing ${nextIndex} of ${allRankings.length} jobs. Has more: ${hasMore}`);
        });
      }, 500); // Small delay for UX
    });
  };

  // Handle loading jobs from the next page of LinkedIn job results
  const handleLoadNextPage = () => {
    if (isLoadingNextPage) {
      return;
    }
    
    setIsLoadingNextPage(true);
    setError(null);
    
    console.log('Requesting to load jobs from the next page of LinkedIn results');
    
    // Tell the user we're navigating to the next page
    setLoadingMessage('Navigating to next page of job listings...');
    
    // Reset and activate loading message system for the next page
    resetAndActivateLoadingMessage();
    
    chrome.runtime.sendMessage({
      action: 'LOAD_NEXT_PAGE_JOBS',
      suppressScrolling: true // Signal that scrolling is handled by content script
    });
    
    // Don't need to handle the response here - our message listener will 
    // automatically receive the NEXT_PAGE_SUCCESS message from the content
    // script when navigation and job extraction is complete
    
    // Clear current job rankings immediately to show loading state
    setJobRankings([]);
    setHasMoreJobs(false);
    
    // Reset pagination state
    chrome.storage.local.set({ 
      allJobRankings: [],
      currentDisplayIndex: 0
    });
    
    // Note: We're not setting isLoadingNextPage to false here
    // This will be handled by the NEXT_PAGE_SUCCESS or NEXT_PAGE_ERROR
    // message handler we added earlier
  };

  // Handle job click to highlight on the page
  const handleJobClick = (jobId: string) => {
    console.log('Highlighting job:', jobId);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'HIGHLIGHT_JOB',
          jobId
        }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            console.error('Error highlighting job:', chrome.runtime.lastError || 'Job not found');
            setError('Could not highlight job on the page. The job may no longer be visible.');
          }
        });
      }
    });
  };
  
  // Handle clearing all job results
  const handleClearResults = () => {
    console.log('Clearing all job results');
    
    // Clear all job rankings from state
    setJobRankings([]);
    setHasMoreJobs(false);
    setIsLoadingMore(false);
    setIsLoadingNextPage(false);
    setError(null);
    
    // Clear job rankings from storage
    chrome.storage.local.set({ 
      jobListings: [],
      jobRankings: [],
      allJobRankings: [],
      currentDisplayIndex: 0
    }, () => {
      console.log('Successfully cleared all job data from storage');
    });
    
    // Send message to clear any loaded jobs in background
    chrome.runtime.sendMessage({ 
      action: 'CLEAR_EXISTING_JOBS',
      message: 'User manually cleared all job results'
    });
  };
  
  // Clean up function to properly reset state when unmounting
  useEffect(() => {
    return () => {
      // Disable loading message when component unmounts
      chrome.runtime.sendMessage({ 
        action: 'CONFIGURE_LOADING_MESSAGE', 
        enabled: false
      });
    };
  }, []);
  
  return {
    jobRankings,
    hasMoreJobs,
    isLoadingMore,
    isLoadingNextPage,
    handleMatchJobs,
    handleLoadMore,
    handleLoadNextPage,
    handleJobClick,
    handleClearResults
  };
} 