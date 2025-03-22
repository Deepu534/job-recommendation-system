// LinkedIn Job Analyzer Background Script

// API endpoint URL - update this with your actual backend URL when deployed
const API_BASE_URL = 'http://localhost:3000/api';

// Store user resume data
let resumeData = null;
// Store extracted job listings
let jobListings = [];
// Store job rankings
let jobRankings = [];
// Flag to prevent job matching loops
let isMatchingJobs = false;

// Set up listeners when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkedIn Job Analyzer extension installed');
  
  // Clear any existing state
  chrome.storage.local.set({
    jobListings: [],
    jobRankings: []
  });
  
  // Don't clear resume data - instead try to load it if available
  chrome.storage.local.get(['resumeData'], (result) => {
    if (result && result.resumeData) {
      console.log('Found existing resume data in storage, loading it');
      resumeData = result.resumeData;
    } else {
      console.log('No existing resume data found in storage');
    }
  });
});

// Listen for messages from the content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message.action);
  
  // Handle different message actions
  switch (message.action) {
    case 'JOB_LISTINGS_EXTRACTED':
      handleJobListingsExtracted(message.data, sendResponse);
      break;
      
    case 'UPLOAD_RESUME':
      handleResumeUpload(message.data, sendResponse);
      break;
      
    case 'GET_JOB_RANKINGS':
      sendResponse({ 
        jobRankings,
        pagination: {
          total: jobListings.length,
          hasMore: jobRankings.length < jobListings.length
        }
      });
      break;
      
    case 'UPDATE_LOADING_MESSAGE':
      // Forward the loading message to the popup
      chrome.runtime.sendMessage({
        action: 'UPDATE_LOADING_MESSAGE',
        message: message.message || 'Processing...'
      });
      sendResponse({ success: true });
      break;
      
    case 'SET_LOADING_STATE':
      // Forward the loading state to the popup
      chrome.runtime.sendMessage({
        action: 'SET_LOADING_STATE',
        isLoading: message.isLoading
      });
      sendResponse({ success: true });
      break;
      
    case 'CLEAR_EXISTING_JOBS':
      // Clear existing job data before new extraction
      console.log('Clearing existing job data before new extraction');
      jobListings = [];
      jobRankings = [];
      chrome.storage.local.set({ jobListings: [], jobRankings: [] });
      sendResponse({ success: true, message: 'Cleared existing job data' });
      break;
      
    case 'JOBS_LIST_CHANGED':
      // Just log the notification, no action needed
      console.log('LinkedIn job listings have changed:', message.message);
      sendResponse({ success: true });
      break;
      
    case 'CONTENT_SCRIPT_READY':
      // Content script is ready
      console.log('Content script is ready:', message.message);
      sendResponse({ success: true });
      break;
      
    case 'MATCH_JOBS':
      const options = {
        start: message.start || 0,
        limit: message.limit || 10,
        displayLimit: message.displayLimit || null
      };
      handleJobMatching(sendResponse, options);
      break;
      
    case 'LOAD_NEXT_PAGE_JOBS':
      handleLoadNextPageJobs(message, sendResponse);
      break;
      
    case 'GET_RESUME_STATUS':
      let isResumeValid = false;
      let resumeStatus = {};
      
      if (resumeData) {
        isResumeValid = true;
        
        let safeResumeData = { type: typeof resumeData };
        if (typeof resumeData === 'object' && resumeData !== null) {
          safeResumeData.hasText = !!resumeData.text;
          safeResumeData.hasKeywords = !!resumeData.keywords;
          safeResumeData.keywordsCount = resumeData.keywords ? resumeData.keywords.length : 0;
        } else if (typeof resumeData === 'string') {
          safeResumeData.length = resumeData.length;
        }
        
        resumeStatus = { format: safeResumeData };
      }
      
      sendResponse({ 
        resumeUploaded: isResumeValid,
        resumeStatus: resumeStatus
      });
      break;
      
    case 'NEXT_PAGE_SUCCESS':
      handleNextPageSuccess(message);
      break;
      
    default:
      console.warn('Unknown message action:', message.action);
      sendResponse({ error: 'Unknown action' });
  }
  
  // Return true to indicate we'll respond asynchronously
  return true;
});

// Handle job listings extracted from the content script
async function handleJobListingsExtracted(data, sendResponse) {
  try {
    console.log(`Received ${data?.length || 0} job listings from content script`);
    
    // Validate the data
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('No valid job listings data received');
      sendResponse({ 
        error: 'No job listings data received', 
        success: false 
      });
      return;
    }
    
    // Add detailed logging to see what's happening
    if (data.length < 5) {
      console.warn('Very few job listings extracted. LinkedIn might have changed their DOM structure.');
      console.log('Job listings received:', JSON.stringify(data));
    }
    
    // Validate each job listing has the required fields
    const validListings = data.filter(job => {
      const isValid = job && job.id && job.title;
      if (!isValid) {
        console.warn('Filtered out invalid job listing:', job);
      }
      return isValid;
    });
    
    if (validListings.length === 0) {
      console.error('No valid job listings found after filtering');
      sendResponse({ 
        error: 'No valid job listings found', 
        success: false 
      });
      return;
    }
    
    console.log(`Storing ${validListings.length} valid job listings`);
    jobListings = validListings;
    
    // Store in local storage
    chrome.storage.local.set({ jobListings });
    
    // No longer automatically match jobs when listings are extracted
    // Let the user explicitly click the Analyze Jobs button
    sendResponse({ 
      success: true, 
      message: `Stored ${validListings.length} jobs successfully`,
      jobCount: validListings.length
    });
  } catch (error) {
    console.error('Error handling job listings:', error);
    sendResponse({ error: `Failed to process job listings: ${error.message}` });
  }
}

// Handle resume upload from the popup
async function handleResumeUpload(data, sendResponse) {
  try {
    console.log('Processing resume data...');
    
    // Handle reset case
    if (data === '') {
      console.log('Clearing resume data');
      resumeData = null;
      jobRankings = [];
      chrome.storage.local.set({ resumeData: null, jobRankings: [] });
      sendResponse({ success: true, message: 'Resume data cleared' });
      return;
    }
    
    // Validate data before sending to server
    if (!data) {
      console.error('Empty resume data received');
      sendResponse({ error: 'No resume data provided' });
      return;
    }
    
    if (typeof data !== 'string') {
      console.error('Invalid resume data type:', typeof data);
      sendResponse({ error: 'Resume data must be a string' });
      return;
    }
    
    if (data.trim().length === 0) {
      console.error('Empty resume data string received');
      sendResponse({ error: 'Resume data is empty' });
      return;
    }
    
    // We'll trust the data from the FileReader in the component
    console.log('Resume data looks valid, uploading to backend...');
    console.log('Resume data length:', data.length, 'First 20 chars:', data.substring(0, 20));
    
    try {
      // Send resume data to the backend for processing
      const response = await fetch(`${API_BASE_URL}/upload-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ resumeData: data })
      });
      
      console.log('Resume upload status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        try {
          const errorResponse = await response.json();
          errorMessage += `. Details: ${JSON.stringify(errorResponse)}`;
          console.error('Upload response error:', errorResponse);
        } catch (e) {
          const errorText = await response.text();
          errorMessage += `. Details: ${errorText}`;
          console.error('Upload response error text:', errorText);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Resume processed successfully:', result);
      
      // Store processed resume data - make sure we're saving exactly what the backend expects
      // Check what property we received from the backend
      if (result.processedResume) {
        resumeData = result.processedResume;
        console.log('Stored processed resume from backend');
      } else if (result.keywords) {
        // If we only got keywords, store those with the original resume text
        resumeData = {
          text: data,
          keywords: result.keywords
        };
        console.log('Created resume data structure with keywords and original text');
      } else {
        // Fallback: just store the original resume text
        resumeData = data;
        console.log('Stored original resume text as no processed data received');
      }
      
      // Log what we're storing for debugging
      console.log('Resume data being stored:', typeof resumeData, 
                 JSON.stringify(resumeData).substring(0, 100) + '...');
      
      // Store in local storage
      chrome.storage.local.set({ resumeData });
      
      // Send success response
      sendResponse({ success: true, resumeData });
      
      // No longer automatically match jobs after resume upload
      // Let the user explicitly click the Analyze Jobs button
    } catch (fetchError) {
      console.error('Network error during resume upload:', fetchError);
      // Check if it's a network error (no internet connection)
      if (fetchError.message.includes('Failed to fetch') || !navigator.onLine) {
        sendResponse({ error: 'Failed to connect to the server. Please check your internet connection and ensure the backend server is running.' });
      } else {
        sendResponse({ error: `Failed to process resume: ${fetchError.message}` });
      }
    }
  } catch (error) {
    console.error('Error uploading resume:', error);
    sendResponse({ error: `Failed to process resume: ${error.message}` });
  }
}

// Match jobs with the resume
async function handleJobMatching(sendResponse, options = {}) {
  try {
    console.log('Starting job matching process...');
    
    // Check if already matching to prevent infinite loop
    if (isMatchingJobs) {
      console.log('Job matching already in progress, skipping');
      sendResponse({ success: false, error: 'Job matching already in progress' });
      return;
    }
    
    // First ensure we have resume data before proceeding
    try {
      await ensureResumeData();
      console.log('Resume data confirmed available for job matching');
    } catch (resumeError) {
      console.error('Resume data error:', resumeError);
      sendResponse({ success: false, error: resumeError.message });
      return;
    }
    
    // Extract pagination parameters
    const { start = 0, limit = 10, displayLimit = null } = options;
    console.log(`Job matching request with parameters: start=${start}, limit=${limit}, displayLimit=${displayLimit}`);
    
    // When limit is set to the full job list length, we'll process all jobs
    if (limit > 10) {
      console.log(`Will analyze all available jobs (up to ${limit}) from the backend`);
    }
    
    const results = await matchJobs(start, limit);
    console.log(`Successfully matched ${results.rankings.length} jobs with resume`);
    
    // If we have pagination details, log them
    if (results.pagination) {
      console.log(`Pagination info: ${JSON.stringify(results.pagination)}`);
    }
    
    sendResponse({ 
      success: true, 
      jobRankings: results.rankings,
      pagination: results.pagination
    });
  } catch (error) {
    console.error('Error in job matching:', error);
    sendResponse({ error: `Failed to match jobs with resume: ${error.message}` });
  }
}

// Match jobs with the resume by calling the backend API
async function matchJobs(start = 0, limit = 10) {
  // Set flag to prevent multiple simultaneous matching requests
  if (isMatchingJobs) {
    console.log('Job matching already in progress, skipping');
    return { rankings: jobRankings, pagination: { hasMore: false } };
  }
  
  isMatchingJobs = true;
  
  try {
    // Ensure resume data is available using our helper
    await ensureResumeData();
    
    // Log resume data format for debugging
    console.log(`Resume data type: ${typeof resumeData}`);
    console.log(`Resume data structure:`, JSON.stringify(resumeData).substring(0, 100) + '...');
    
    // Double-check job listings
    console.log(`Job listings check: have ${jobListings ? jobListings.length : 0} listings`);
    
    if (!jobListings || !Array.isArray(jobListings) || jobListings.length === 0) {
      console.error('No job listings available for matching');
      throw new Error('No job listings available');
    }
    
    // Log the first few jobs to ensure data quality
    console.log('Sample of job listings for matching:', 
      jobListings.slice(0, 3).map(job => ({
        id: job.id,
        title: job.title,
        company: job.company
      }))
    );
    
    // Ensure we have valid job data to send
    const jobsToMatch = jobListings
      // Ensure required fields exist
      .filter(job => job && job.id && job.title)
      // Format for API
      .map(job => ({
        id: job.id,
        title: job.title || 'Unknown Position',
        company: job.company || 'Unknown Company',
        location: job.location || '',
        url: job.url || '',
        description: job.description || ''
      }));
    
    if (jobsToMatch.length === 0) {
      console.error('No valid job listings to match after filtering');
      throw new Error('No valid job listings for matching');
    }
    
    console.log(`Sending ${jobsToMatch.length} job listings for analysis to the backend`);
    
    // Decide whether to send all jobs or just a subset
    let jobsForBackend = [];
    
    // If we're using a large limit (e.g., sending all jobs), don't apply pagination
    if (limit > 100) {
      console.log(`Sending ALL ${jobsToMatch.length} jobs to backend for full analysis`);
      jobsForBackend = jobsToMatch;
    } else {
      // For smaller limit values, maintain pagination support
      const endIndex = Math.min(start + limit, jobsToMatch.length);
      jobsForBackend = jobsToMatch.slice(start, endIndex);
      console.log(`Sending subset of ${jobsForBackend.length} jobs to backend (${start} to ${endIndex-1})`);
    }
    
    // Format the request data - ensure resume data is properly formatted based on what the backend expects
    // The backend expects either resumeData or resume property
    const requestData = {
      resumeData: resumeData, // Primary format
      resume: resumeData,     // Alternative format as backup
      jobs: jobsForBackend,
      // Add start and limit for backend information, even though we're sending all jobs
      start: start,
      limit: limit
    };
    
    // Normalize the resume data to ensure it's in the proper format.
    // Backend may expect either a string, object with text property, or object with keywords
    if (typeof resumeData === 'object' && resumeData !== null) {
      // If it's an object, ensure it has the expected properties
      if (resumeData.text) {
        // If we have text property, make sure it's available directly as well
        requestData.resumeText = resumeData.text;
      }
      if (resumeData.keywords) {
        // If we have keywords, make sure they're available directly
        requestData.keywords = resumeData.keywords;
      }
    } else if (typeof resumeData === 'string') {
      // If it's a string, create an object with text property
      requestData.resumeText = resumeData;
    }
    
    // Make API call to match jobs with resume
    console.log('Making API call to match jobs...');
    console.log('Request data structure:', 
      JSON.stringify({
        resumeDataType: typeof requestData.resumeData,
        resumeDataPresent: !!requestData.resumeData, 
        resumePresent: !!requestData.resume,
        jobsCount: requestData.jobs.length
      })
    );
    
    const response = await fetch(`${API_BASE_URL}/match-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}): ${errorText}`);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response data
    const data = await response.json();
    console.log('Received job matching results:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to match jobs');
    }
    
    // Update global jobRankings array
    jobRankings = data.rankings;
    
    // Store rankings in local storage
    chrome.storage.local.set({ jobRankings });
    console.log(`Stored ${jobRankings.length} job rankings`);
    
    // Calculate the current processed count based on the request and response
    const currentProcessed = data.pagination?.processed || 
      (limit > 100 ? jobsToMatch.length : Math.min(start + limit, jobsToMatch.length));
    
    // Result pagination info - use backend values if provided, otherwise calculate locally
    const pagination = {
      hasMore: data.pagination?.hasMore !== undefined ? data.pagination.hasMore : currentProcessed < jobsToMatch.length,
      total: data.pagination?.total || jobsToMatch.length,
      processed: currentProcessed,
      remaining: data.pagination?.remaining !== undefined ? data.pagination.remaining : jobsToMatch.length - currentProcessed
    };
    
    console.log(`Pagination info: ${JSON.stringify(pagination)}`);
    
    return {
      rankings: data.rankings,
      pagination: pagination
    };
  } catch (error) {
    console.error('Error in matchJobs:', error);
    throw error;
  } finally {
    // Reset the flag when done
    isMatchingJobs = false;
  }
}

// Handle loading jobs from the next page of LinkedIn search results
async function handleLoadNextPageJobs(message, sendResponse) {
  try {
    console.log('Processing request to load jobs from the next LinkedIn page...');
    
    // We'll clear current job listings and rankings but keep resume data
    jobListings = [];
    jobRankings = [];
    
    // Make sure we have the resume data before proceeding
    try {
      await ensureResumeData();
      console.log('Resume data confirmed available for next page navigation');
    } catch (resumeError) {
      console.error('Resume data error before page navigation:', resumeError);
      sendResponse({ 
        success: false, 
        error: resumeError.message
      });
      return;
    }
    
    // Only clear job-related data, not resume data
    chrome.storage.local.set({ jobListings: [], jobRankings: [] });
    
    // Make sure resume data is saved to storage for persistence
    chrome.storage.local.set({ resumeData });
    console.log('Resume data saved to storage for persistence during page navigation');
    
    // Request content script to navigate to the next page and extract jobs
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { 
            action: 'LOAD_NEXT_PAGE_JOBS',
            suppressScrolling: message.suppressScrolling // Pass this flag to content script
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error requesting next page jobs:', chrome.runtime.lastError);
              sendResponse({ 
                success: false, 
                error: 'Failed to communicate with LinkedIn page. Try refreshing the page.' 
              });
              return;
            }
            
            if (response && response.success && response.jobListings) {
              // Store the new job listings
              jobListings = response.jobListings;
              chrome.storage.local.set({ jobListings });
              
              console.log(`Loaded ${jobListings.length} jobs from next page`);
              sendResponse({ 
                success: true, 
                message: `Loaded ${jobListings.length} jobs from next page` 
              });
            } else {
              console.error('Error loading next page jobs:', response?.error || 'Unknown error');
              sendResponse({ 
                success: false, 
                error: response?.error || 'Failed to load jobs from the next page' 
              });
            }
          }
        );
      } else {
        sendResponse({ 
          success: false, 
          error: 'No active LinkedIn tab found. Please open a LinkedIn jobs page.' 
        });
      }
    });
  } catch (error) {
    console.error('Error handling next page jobs request:', error);
    sendResponse({ 
      success: false, 
      error: `Failed to load next page jobs: ${error.message}` 
    });
  }
}

// Helper function to ensure resume data is available
async function ensureResumeData() {
  // If we already have resume data in memory, return it
  if (resumeData) {
    return resumeData;
  }
  
  // Otherwise, try to load from storage
  console.log('Resume data not found in memory, loading from storage...');
  try {
    const storageData = await new Promise(resolve => {
      chrome.storage.local.get(['resumeData'], resolve);
    });
    
    if (storageData && storageData.resumeData) {
      console.log('Successfully loaded resume data from storage');
      resumeData = storageData.resumeData;
      return resumeData;
    } else {
      console.error('No resume data found in storage');
      throw new Error('Resume data not available. Please upload your resume first.');
    }
  } catch (error) {
    console.error('Error retrieving resume data:', error);
    throw error;
  }
}

// Make the NEXT_PAGE_SUCCESS handler better - this is called from the content script
// when it successfully navigates and extracts jobs from the next page
function handleNextPageSuccess(message) {
  // Ensure we have the jobListings array
  if (!message.data || !message.data.jobCount) {
    console.error('Invalid NEXT_PAGE_SUCCESS message, missing job data');
    return;
  }
  
  // Make sure resume data is saved again for extra safety
  if (resumeData) {
    chrome.storage.local.set({ resumeData });
    console.log('Re-saved resume data to storage after successful page navigation');
  }
  
  // Reset pagination state to ensure consistent behavior with first page
  console.log('Resetting pagination state to ensure we only show first 10 jobs initially');
  const displayLimit = 10; // Only show first 10 jobs initially
  
  // Reset the stored rankings in local storage to ensure proper pagination
  chrome.storage.local.set({ 
    allJobRankings: jobRankings,
    currentDisplayIndex: displayLimit
  }, () => {
    console.log(`Reset pagination: Set currentDisplayIndex to ${displayLimit}`);
    
    // We don't need to do anything else here as the message handler in App.tsx
    // will automatically trigger job matching with the correct display limit
  });
}