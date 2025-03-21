import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import ResumeUploader from './ResumeUploader';
import JobRankingsComponent from './JobRankings';

// TabPanel component for the tab content
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      {...other}
    >
      {value === index && (
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 1
        }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

// Main App component
function App() {
  console.log('App component rendering');
  
  // State for tabs
  const [tabValue, setTabValue] = useState(0);
  // State for resume uploaded status
  const [resumeUploaded, setResumeUploaded] = useState(false);
  // State for job rankings
  const [jobRankings, setJobRankings] = useState<any[]>([]);
  // State for loading state
  const [isLoading, setIsLoading] = useState(false);
  // State for loading message
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  // State for checking if we're on LinkedIn
  const [isOnLinkedIn, setIsOnLinkedIn] = useState(false);
  // State for error messages
  const [error, setError] = useState<string | null>(null);
  // Ref to track if job matching is in progress
  const isMatchingJobsRef = useRef(false);
  // State for tracking pagination
  const [hasMoreJobs, setHasMoreJobs] = useState(false);
  // State for tracking if we're loading more jobs
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Current batch index for pagination
  const currentBatchRef = useRef(0);
  // State for tracking if loading next page jobs
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log('Tab changed to:', newValue);
    setTabValue(newValue);
  };

  // Check if we're on LinkedIn jobs page
  useEffect(() => {
    console.log('App initialization effect running');
    
    // Check if we're on LinkedIn
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || '';
      console.log('Current URL:', currentUrl);
      const isLinkedIn = currentUrl.includes('linkedin.com/jobs');
      setIsOnLinkedIn(isLinkedIn);
      console.log('Is on LinkedIn:', isLinkedIn);
      
      // No longer automatically extract jobs when on LinkedIn
      // This will now only happen when the user clicks the "Analyze" button
      if (isLinkedIn) {
        console.log('On LinkedIn jobs page, waiting for user to click Analyze button');
      } else {
        console.log('Not on a LinkedIn jobs page');
        setError('Please navigate to a LinkedIn jobs page to use this extension');
      }
    });

    // Setup message listener for loading message updates and next page success
    const messageListener = (message: any) => {
      if (message.action === 'UPDATE_LOADING_MESSAGE' && message.message) {
        console.log('Received loading message update:', message.message);
        setLoadingMessage(message.message);
      } else if (message.action === 'NEXT_PAGE_SUCCESS' && message.data) {
        console.log('Received next page success:', message.data);
        // Automatically trigger job matching after next page success
        setIsLoadingNextPage(false);
        setError(null);
        
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
            setJobRankings(matchResponse.jobRankings);
            setHasMoreJobs(matchResponse.pagination?.hasMore || false);
            
            // Explicitly set pagination state to ensure consistent behavior
            console.log('Explicitly ensuring pagination state is consistent with first page');
            chrome.storage.local.get(['allJobRankings'], (result) => {
              const allRankings = result.allJobRankings || [];
              if (allRankings.length > 10) {
                console.log(`Setting hasMoreJobs to true, as we have ${allRankings.length} total rankings with 10 displayed`);
                setHasMoreJobs(true);
              }
            });
          } else if (matchResponse && matchResponse.error) {
            setError(`Error matching jobs: ${matchResponse.error}`);
          } else {
            setError('Unknown error matching jobs');
          }
        });
      } else if (message.action === 'NEXT_PAGE_ERROR' && message.error) {
        console.error('Next page error:', message.error);
        setIsLoadingNextPage(false);
        setError(`Error: ${message.error}`);
      }
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Cleanup function to remove the listener when component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Check resume status in a separate effect
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'GET_RESUME_STATUS' }, (response) => {
      console.log('Resume status response:', response);
      if (response && response.resumeUploaded) {
        setResumeUploaded(true);
        console.log('Resume is uploaded');
        setTabValue(1);
      } else {
        setResumeUploaded(false);
        console.log('No resume uploaded yet');
      }
    });

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

  // Handle resume upload
  const handleResumeUpload = (resumeData: string) => {
    if (!resumeData) {
      console.log('Resetting resume state');
      setResumeUploaded(false);
      setError(null);
      
      // Clear resume data in background script
      chrome.runtime.sendMessage({ 
        action: 'UPLOAD_RESUME', 
        data: '' 
      });
      
      return;
    }
    
    console.log('Uploading resume');
    setError(null);
    setIsLoading(true);
    setResumeUploaded(false); // Reset the state to avoid conflicting UI
    
    chrome.runtime.sendMessage({ 
      action: 'UPLOAD_RESUME', 
      data: resumeData
    }, (response) => {
      console.log('Resume upload response:', response);
      setIsLoading(false);
      
      if (response && response.success) {
        setResumeUploaded(true);
        setError(null); // Clear any previous errors
        console.log('Resume uploaded successfully');
        
        // Switch to rankings tab
        setTabValue(1);
        
        // No longer automatically match jobs after resume upload
        // User will need to click the analyze/refresh button to initiate job matching
      } else if (response && response.error) {
        console.error('Error uploading resume:', response.error);
        setError(`Error uploading resume: ${response.error}`);
        setResumeUploaded(false); // Ensure we're in the correct state
      } else {
        console.error('Unknown error uploading resume');
        setError('Unknown error uploading resume');
        setResumeUploaded(false); // Ensure we're in the correct state
      }
    });
  };

  // Request job matching
  const handleMatchJobs = () => {
    // Prevent multiple simultaneous job matching requests
    if (isMatchingJobsRef.current) {
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
            return;
          }
          
          // Check for extraction errors
          if (response && response.error) {
            console.error('Job extraction error:', response.error);
            setIsLoading(false);
            setError(`Error extracting jobs: ${response.error}`);
            isMatchingJobsRef.current = false;
            return;
          }
          
          // Check if we got any job listings
          if (!response || !response.jobListings || response.jobListings.length === 0) {
            console.error('No job listings returned from extraction');
            setIsLoading(false);
            setError('No job listings found. Please make sure you are on a LinkedIn jobs search results page.');
            isMatchingJobsRef.current = false;
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
            } else {
              console.error('Unknown error matching jobs');
              setError('Failed to match jobs. Make sure both resume and job listings are available.');
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

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'primary.main',
        color: 'white'
      }}>
        <Typography variant="h6" component="h1">
          LinkedIn Job Analyzer
        </Typography>
      </Box>
      
      {/* Main content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Not on LinkedIn message */}
        {!isOnLinkedIn && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1" color="error">
              Please open a LinkedIn Jobs page to use this extension.
            </Typography>
          </Box>
        )}
        
        {/* Error message */}
        {error && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          </Box>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            zIndex: 1000,
            backgroundColor: 'background.paper',
            p: 3,
            borderRadius: 1,
            boxShadow: 3
          }}>
            <CircularProgress />
            <Typography>{loadingMessage}</Typography>
          </Box>
        )}
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
          >
            <Tab label="Upload Resume" />
            <Tab label="Job Rankings" />
          </Tabs>
        </Box>
        
        {/* Tab panels */}
        <Box sx={{ 
          flex: 1,
          overflow: 'hidden',
          position: 'relative' // Add position relative for proper overflow behavior
        }}>
          <TabPanel value={tabValue} index={0}>
            <ResumeUploader 
              onUpload={handleResumeUpload} 
              resumeUploaded={resumeUploaded}
            />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <JobRankingsComponent 
              rankings={jobRankings} 
              onJobClick={handleJobClick}
              onRefresh={handleMatchJobs}
              onLoadMore={handleLoadMore}
              onLoadNextPage={handleLoadNextPage}
              hasMoreJobs={hasMoreJobs}
              isLoadingMore={isLoadingMore}
              isLoadingNextPage={isLoadingNextPage}
            />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
}

export default App; 