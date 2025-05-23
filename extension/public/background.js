const API_BASE_URL = 'https://n93ujxna6b.execute-api.eu-central-1.amazonaws.com/api';

let resumeData = null;
let jobListings = [];
let jobRankings = [];
let isMatchingJobs = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    jobListings: [],
    jobRankings: []
  });
  
  chrome.storage.local.get(['resumeData'], (result) => {
    if (result && result.resumeData) {
      resumeData = result.resumeData;
    }
  });
});

// Handle clicks on the extension icon in the toolbar
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('linkedin.com')) {
    // Send message to content script to toggle the sidebar
    chrome.tabs.sendMessage(tab.id, { 
      action: 'TOGGLE_SIDEBAR',
      source: 'toolbar_icon'
    }).catch(error => {
      console.error('Error toggling sidebar:', error);
      
      // If the content script isn't loaded yet, reload the tab and try again
      if (error.message.includes('Could not establish connection')) {
        // Reload the tab to ensure content script is loaded
        chrome.tabs.reload(tab.id, {}, () => {
          // After reload, wait a moment and try again
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'TOGGLE_SIDEBAR',
              source: 'toolbar_icon'
            }).catch(secondError => {
              console.error('Error toggling sidebar after reload:', secondError);
            });
          }, 2000);
        });
      }
    });
  } else {
    // If not on LinkedIn, open LinkedIn in a new tab
    chrome.tabs.create({ url: 'https://www.linkedin.com/' });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      chrome.runtime.sendMessage({
        action: 'UPDATE_LOADING_MESSAGE',
        message: message.message || 'Processing...'
      });
      sendResponse({ success: true });
      break;
      
    case 'SET_LOADING_STATE':
      chrome.runtime.sendMessage({
        action: 'SET_LOADING_STATE',
        isLoading: message.isLoading
      });
      sendResponse({ success: true });
      break;
      
    case 'CLEAR_EXISTING_JOBS':
      jobListings = [];
      jobRankings = [];
      chrome.storage.local.set({ jobListings: [], jobRankings: [] });
      sendResponse({ success: true, message: 'Cleared existing job data' });
      break;
      
    case 'JOBS_LIST_CHANGED':
      sendResponse({ success: true });
      break;
      
    case 'CONTENT_SCRIPT_READY':
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
      
    case 'INJECT_REACT_APP':
      // Inject the React app into the sidebar
      if (sender.tab && sender.tab.id) {
        try {
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: injectAppToSidebar,
            args: [message.target]
          })
          .then(results => {
            if (results && results[0] && results[0].result === true) {
              sendResponse({ success: true });
            } else {
              console.error('Failed to inject React app: Script executed but returned false');
              sendResponse({ success: false, error: 'Failed to inject app - target element not found' });
            }
          })
          .catch(err => {
            console.error('Error executing script to inject React app:', err);
            sendResponse({ success: false, error: err.message });
          });
        } catch (error) {
          console.error('Error injecting React app:', error);
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Invalid tab ID' });
      }
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true;
});

async function handleJobListingsExtracted(data, sendResponse) {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      sendResponse({ 
        error: 'No job listings data received', 
        success: false 
      });
      return;
    }

    const validListings = data.filter(job => {
      const isValid = job && job.id && job.title;
      return isValid;
    });
    
    if (validListings.length === 0) {
      sendResponse({ 
        error: 'No valid job listings found', 
        success: false 
      });
      return;
    }
    
    jobListings = validListings;
    chrome.storage.local.set({ jobListings });
    sendResponse({ 
      success: true, 
      message: `Stored ${validListings.length} jobs successfully`,
      jobCount: validListings.length
    });
  } catch (error) {
    sendResponse({ error: `Failed to process job listings: ${error.message}` });
  }
}

async function handleResumeUpload(data, sendResponse) {
  try {
    if (data === '') {
      resumeData = null;
      jobRankings = [];
      chrome.storage.local.set({ resumeData: null, jobRankings: [] });
      sendResponse({ success: true, message: 'Resume data cleared' });
      return;
    }
    
    if (!data) {
      sendResponse({ error: 'No resume data provided' });
      return;
    }
    
    if (typeof data !== 'string') {
      sendResponse({ error: 'Resume data must be a string' });
      return;
    }
    
    if (data.trim().length === 0) {
      sendResponse({ error: 'Resume data is empty' });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/upload-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ resumeData: data })
      });
      
      if (!response.ok) {
        let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        try {
          const errorResponse = await response.json();
          errorMessage += `. Details: ${JSON.stringify(errorResponse)}`;
        } catch (e) {
          const errorText = await response.text();
          errorMessage += `. Details: ${errorText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      if (result.processedResume) {
        resumeData = result.processedResume;
      } else if (result.keywords) {
        resumeData = {
          text: data,
          keywords: result.keywords
        };
      } else {
        resumeData = data;
      }
      
      chrome.storage.local.set({ resumeData });
      sendResponse({ success: true, resumeData });
    } catch (fetchError) {
      if (fetchError.message.includes('Failed to fetch') || !navigator.onLine) {
        sendResponse({ error: 'Failed to connect to the server. Please check your internet connection and ensure the backend server is running.' });
      } else {
        sendResponse({ error: `Failed to process resume: ${fetchError.message}` });
      }
    }
  } catch (error) {
    sendResponse({ error: `Failed to process resume: ${error.message}` });
  }
}

async function handleJobMatching(sendResponse, options = {}) {
  try {
    if (isMatchingJobs) {
      sendResponse({ success: false, error: 'Job matching already in progress' });
      return;
    }

    try {
      await ensureResumeData();
    } catch (resumeError) {
      sendResponse({ success: false, error: resumeError.message });
      return;
    }
    
    const { start = 0, limit = 10, displayLimit = null } = options;
    const results = await matchJobs(start, limit);
    
    // Always store all rankings in local storage for pagination
    const displayCount = displayLimit || results.rankings.length;
    chrome.storage.local.set({ 
      jobRankings: results.rankings.slice(0, displayCount),
      allJobRankings: results.rankings,
      currentDisplayIndex: displayCount
    }, () => {
      console.log(`Stored all ${results.rankings.length} ranked jobs in local storage for pagination. Displaying: ${displayCount}`);
    });
    
    sendResponse({ 
      success: true, 
      jobRankings: displayLimit ? results.rankings.slice(0, displayLimit) : results.rankings,
      pagination: results.pagination
    });
  } catch (error) {
    sendResponse({ error: `Failed to match jobs with resume: ${error.message}` });
  }
}

async function matchJobs(start = 0, limit = 10) {
  if (isMatchingJobs) {
    return { rankings: jobRankings, pagination: { hasMore: false } };
  }
  
  isMatchingJobs = true;
  
  try {
    await ensureResumeData();
    if (!jobListings || !Array.isArray(jobListings) || jobListings.length === 0) {
      throw new Error('No job listings available');
    }
    
    const jobsToMatch = jobListings
      .filter(job => job && job.id && job.title)
      .map(job => ({
        id: job.id,
        title: job.title || 'Unknown Position',
        company: job.company || 'Unknown Company',
        location: job.location || '',
        url: job.url || '',
        description: job.description || ''
      }));
    
    if (jobsToMatch.length === 0) {
      throw new Error('No valid job listings for matching');
    }
    let jobsForBackend = [];
    if (limit > 100) {
      jobsForBackend = jobsToMatch;
    } else {
      const endIndex = Math.min(start + limit, jobsToMatch.length);
      jobsForBackend = jobsToMatch.slice(start, endIndex);
    }
    
    const requestData = {
      resumeData: resumeData,
      resume: resumeData,
      jobs: jobsForBackend,
      start: start,
      limit: limit
    };

    if (typeof resumeData === 'object' && resumeData !== null) {
      if (resumeData.text) {
        requestData.resumeText = resumeData.text;
      }
      if (resumeData.keywords) {
        requestData.keywords = resumeData.keywords;
      }
    } else if (typeof resumeData === 'string') {
      requestData.resumeText = resumeData;
    }

    const response = await fetch(`${API_BASE_URL}/match-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to match jobs');
    }
    
    jobRankings = data.rankings;
    chrome.storage.local.set({ jobRankings });
    const currentProcessed = data.pagination?.processed || 
      (limit > 100 ? jobsToMatch.length : Math.min(start + limit, jobsToMatch.length));
    const pagination = {
      hasMore: data.pagination?.hasMore !== undefined ? data.pagination.hasMore : currentProcessed < jobsToMatch.length,
      total: data.pagination?.total || jobsToMatch.length,
      processed: currentProcessed,
      remaining: data.pagination?.remaining !== undefined ? data.pagination.remaining : jobsToMatch.length - currentProcessed
    };
    
    return {
      rankings: data.rankings,
      pagination: pagination
    };
  } catch (error) {
    throw error;
  } finally {
    isMatchingJobs = false;
  }
}

async function handleLoadNextPageJobs(message, sendResponse) {
  try {
    jobListings = [];
    jobRankings = [];
    
    try {
      await ensureResumeData();
    } catch (resumeError) {
      sendResponse({ 
        success: false, 
        error: resumeError.message
      });
      return;
    }

    chrome.storage.local.set({ jobListings: [], jobRankings: [] });
    chrome.storage.local.set({ resumeData });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { 
            action: 'LOAD_NEXT_PAGE_JOBS',
            suppressScrolling: message.suppressScrolling
          },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({ 
                success: false, 
                error: 'Failed to communicate with LinkedIn page. Try refreshing the page.' 
              });
              return;
            }
            
            if (response && response.success && response.jobListings) {
              jobListings = response.jobListings;
              chrome.storage.local.set({ jobListings });
              sendResponse({ 
                success: true, 
                message: `Loaded ${jobListings.length} jobs from next page` 
              });
            } else {
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
    sendResponse({ 
      success: false, 
      error: `Failed to load next page jobs: ${error.message}` 
    });
  }
}

async function ensureResumeData() {
  if (resumeData) {
    return resumeData;
  }
  
  try {
    const storageData = await new Promise(resolve => {
      chrome.storage.local.get(['resumeData'], resolve);
    });
    
    if (storageData && storageData.resumeData) {
      resumeData = storageData.resumeData;
      return resumeData;
    } else {
      throw new Error('Resume data not available. Please upload your resume first.');
    }
  } catch (error) {
    throw error;
  }
}

function handleNextPageSuccess(message) {
  if (!message.data || !message.data.jobCount) {
    return;
  }
  
  if (resumeData) {
    chrome.storage.local.set({ resumeData });
  }

  const displayLimit = 10;

  chrome.storage.local.set({ 
    allJobRankings: jobRankings,
    currentDisplayIndex: displayLimit
  });
}

// Function to be injected into the page to handle loading the React app
function injectAppToSidebar(targetId) {
  try {
    console.log(`Injecting React app into element with ID: ${targetId}`);
    
    // Find the target element
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      console.error(`Target element with ID "${targetId}" not found`);
      return false;
    }
    
    // Clear any existing content
    targetElement.innerHTML = '';
    
    // Create iframe to load the React app
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('index.html');
    iframe.id = 'job-analyzer-iframe';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.margin = '0';
    iframe.style.padding = '0';
    iframe.style.overflow = 'hidden';
    
    // Add error handling for iframe loading
    iframe.onerror = (error) => {
      console.error('Error loading iframe:', error);
      targetElement.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">Error loading application. Please try refreshing the page.</div>';
      return false;
    };
    
    // Add the iframe to the target element
    targetElement.appendChild(iframe);
    
    console.log('React app iframe injected successfully');
    return true;
  } catch (error) {
    console.error('Error injecting React app to sidebar:', error);
    return false;
  }
}