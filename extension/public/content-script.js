// LinkedIn Job Analyzer Content Script

// Function to extract job data from LinkedIn job listings
function extractJobListings() {
  console.log('Attempting to extract job listings from LinkedIn...');

  try {
    // Try multiple selectors to find job cards
    const possibleSelectors = [
      'li.occludable-update',
      'li.jobs-search-results__list-item',
      '.job-card-container',
      'div[data-job-id]',
      'div[data-occludable-job-id]',
      '.jobs-search-results-list__list-item'
    ];
    
    let jobCards = [];
    let usedSelector = '';
    
    // Try each selector until we find job cards
    for (const selector of possibleSelectors) {
      const cards = document.querySelectorAll(selector);
      if (cards && cards.length > 0) {
        console.log(`Found ${cards.length} job cards using selector: ${selector}`);
        jobCards = Array.from(cards);
        usedSelector = selector;
        break;
      }
    }
    
    // If we still don't have job cards, try a more general approach
    if (jobCards.length === 0) {
      console.log('No job cards found with specific selectors, trying general approach');
      
      // Look for elements that might be job cards based on content
      const allElements = document.querySelectorAll('li, div');
      const possibleJobCards = Array.from(allElements).filter(element => {
        // Check if this element has job-related content
        const text = element.textContent.toLowerCase();
        return (
          (element.querySelector('a[href*="jobs/view"]') || 
           element.querySelector('a[href*="jobs/search"]')) && 
          (text.includes('ago') || text.includes('applicants') || text.includes('apply'))
        );
      });
      
      if (possibleJobCards.length > 0) {
        console.log(`Found ${possibleJobCards.length} potential job cards using content heuristics`);
        jobCards = possibleJobCards;
        usedSelector = 'content-based-detection';
      }
    }
    
    if (jobCards.length === 0) {
      console.log('ERROR: Could not find any job cards on the page');
      return [];
    }
    
    console.log(`Processing ${jobCards.length} job cards found with selector: ${usedSelector}`);
    
    const jobListings = [];

    // Process each job card
    jobCards.forEach((card, index) => {
      try {
        // Try multiple selectors for each piece of information

        // Extract job title
        const titleSelectors = [
          '.job-card-container__link',
          'a[data-control-name="job_card_title_click"]',
          'h3',
          'a[href*="jobs/view"]',
          'a[class*="job-title"]',
          'a[class*="title"]',
          // Add more specific LinkedIn selectors
          '.job-card-list__title',
          '.job-card-container__link',
          '.artdeco-entity-lockup__title',
          '.jobs-unified-top-card__job-title',
          // General fallbacks
          'h2', 'h3', 'h4',
          'a' // Last resort - find the first link
        ];
        const titleElement = findElementWithSelectors(card, titleSelectors);
        const title = titleElement ? titleElement.textContent.trim() : '';

        // Extract company name
        const companySelectors = [
          '.artdeco-entity-lockup__subtitle',
          '[data-control-name="job_card_company_link"]',
          'span[class*="company"]',
          'div[class*="company"]',
          'a[href*="company"]',
          // Add more specific LinkedIn selectors
          '.job-card-container__company-name',
          '.job-card-container__primary-description',
          '.job-card-container__subtitle',
          '.artdeco-entity-lockup__subtitle'
        ];
        const companyElement = findElementWithSelectors(card, companySelectors);
        const company = companyElement ? companyElement.textContent.trim() : '';

        // Extract location
        const locationSelectors = [
          '.job-card-container__metadata-wrapper',
          '.artdeco-entity-lockup__caption',
          '.job-card-container__location',
          'span[class*="location"]',
          'div[class*="location"]',
          // Add more specific LinkedIn selectors  
          '.job-card-container__metadata-item',
          '.artdeco-entity-lockup__caption',
          'span[class*="location"]'
        ];
        const locationElement = findElementWithSelectors(card, locationSelectors);
        const location = locationElement ? locationElement.textContent.trim() : '';

        // Extract job URL
        const linkSelectors = [
          '.job-card-container__link',
          'a[data-control-name="job_card_title_click"]',
          'a[href*="jobs/view"]',
          'a[class*="job-title"]',
          'a[href*="linkedin.com/jobs"]',
          'a' // Last resort - find the first link
        ];
        const linkElement = findElementWithSelectors(card, linkSelectors);
        const jobUrl = linkElement ? linkElement.href : '';

        // Extract job ID from the URL or data attribute
        let jobId = `job-${index}`;

        if (jobUrl) {
          // Try to extract from URL
          const idFromUrl = jobUrl.split('currentJobId=')[1]?.split('&')[0];
          if (idFromUrl) jobId = idFromUrl;
        }

        // Try to get from data attributes
        const dataJobId = card.getAttribute('data-job-id') ||
          card.getAttribute('data-occludable-job-id') ||
          card.getAttribute('data-id') ||
          card.getAttribute('data-occludable-entity-urn');
        if (dataJobId) jobId = dataJobId;

        console.log(`Extracted job: ${title} at ${company}, ID: ${jobId}`);

        // Only add jobs with at least a title or company
        if ((title || company) && jobId) {
          jobListings.push({
            id: jobId,
            title: title || 'Unknown Position',
            company: company || 'Unknown Company',
            location: location || '',
            url: jobUrl || '',
            element: null // Don't store DOM references
          });
        } else {
          console.log(`Skipping job card ${index} - insufficient data extracted`);
        }
      } catch (error) {
        console.error(`Error extracting job data for card ${index}:`, error);
      }
    });

    console.log(`Successfully extracted ${jobListings.length} valid job listings from ${jobCards.length} cards`);
    
    // Log additional debug info if we didn't extract many jobs
    if (jobListings.length < 5 && jobCards.length > 5) {
      console.warn('WARNING: Extracted significantly fewer jobs than cards found!');
      console.log('This might indicate issues with the selectors used for extraction.');
    }
    
    // Double-check we have at least some jobs
    if (jobListings.length === 0) {
      console.error('ERROR: No job listings extracted after processing all cards!');
    }

    return jobListings;
  } catch (error) {
    console.error('Error in extractJobListings:', error);
    return []; // Return empty array in case of error
  }
}

// Helper function to try multiple selectors and return the first found element
function findElementWithSelectors(parentElement, selectors) {
  try {
    for (const selector of selectors) {
      const elements = parentElement.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        // Only log when elements are found, and with less verbosity
        return elements[0];
      }
    }
    return null;
  } catch (error) {
    console.error('Error in findElementWithSelectors:', error);
    return null;
  }
}

// Function to get the full job description when a job is selected
function getSelectedJobDescription() {
  console.log('Attempting to extract job description...');

  try {
    // Try multiple selectors for job descriptions
    const descriptionSelectors = [
      '.jobs-description-content__text',
      '.jobs-description__content',
      '.jobs-description',
      '[class*="description"]',
      '.jobs-box__html-content',
      '.jobs-description-content',
      '[data-test-id="job-details"]',
      '.show-more-less-html__markup',
      'article',
      '.job-details'
    ];

    let descriptionElement = null;

    for (const selector of descriptionSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        descriptionElement = elements[0];
        break;
      }
    }

    if (!descriptionElement) {
      console.log('No job description element found with standard selectors, trying fallback approach');

      // Try to find any large text block that might be a job description
      const possibleDescriptionElements = Array.from(document.querySelectorAll('div, p, section, article'))
        .filter(el => {
          const text = el.textContent.trim();
          // Look for elements with substantial text that might be job descriptions
          return text.length > 200 &&
            (text.toLowerCase().includes('responsibilities') ||
              text.toLowerCase().includes('qualifications') ||
              text.toLowerCase().includes('requirements') ||
              text.toLowerCase().includes('about the job') ||
              text.toLowerCase().includes('job description'));
        });

      if (possibleDescriptionElements.length > 0) {
        descriptionElement = possibleDescriptionElements[0];
        console.log('Found possible description element using content heuristics');
      } else {
        console.log('No job description element found at all');
        return null;
      }
    }

    // Get the text content
    const description = descriptionElement.textContent.trim();
    console.log(`Extracted job description (${description.length} characters)`);

    if (description.length < 50) {
      console.warn('Job description is suspiciously short, might be incorrect element');
    }

    return {
      description,
      fullHtml: '' // Don't return HTML to save memory and avoid crashes
    };
  } catch (error) {
    console.error('Error in getSelectedJobDescription:', error);
    return null;
  }
}

// Send job listings to the background script
function sendJobsToBackground(jobListings) {
  try {
    console.log(`Sending ${jobListings.length} job listings to background script`);
    chrome.runtime.sendMessage({
      action: 'JOB_LISTINGS_EXTRACTED',
      data: jobListings
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending job listings to background:', chrome.runtime.lastError);
      } else {
        console.log('Successfully sent job listings to background script:', response);
      }
    });
  } catch (error) {
    console.error('Error in sendJobsToBackground:', error);
  }
}

// Function to navigate to the next page of LinkedIn jobs
function navigateToNextJobPage() {
  console.log('Attempting to navigate to the next page of job listings...');

  try {
    // Look for pagination next button
    const nextButtonSelectors = [
      'button.artdeco-pagination__button--next',
      'li.artdeco-pagination__button--next button',
      'button[aria-label*="Next"]',
      'button[data-test-pagination-page-btn="next"]',
      '.artdeco-pagination__button--next'
    ];

    let nextButton = null;

    // Try each selector until we find the next button
    for (const selector of nextButtonSelectors) {
      nextButton = document.querySelector(selector);
      if (nextButton) {
        console.log(`Found next page button with selector: ${selector}`);
        break;
      }
    }

    if (!nextButton) {
      console.log('No next page button found - may be on the last page');
      return false;
    }

    // Check if the button is disabled
    if (nextButton.disabled || nextButton.getAttribute('aria-disabled') === 'true') {
      console.log('Next page button is disabled - on the last page');
      return false;
    }

    console.log('Clicking next page button...');
    nextButton.click();

    // Return true to indicate successful navigation
    return true;
  } catch (error) {
    console.error('Error navigating to next page:', error);
    return false;
  }
}

// Function to scroll through job listings to trigger LinkedIn's lazy loading
function scrollJobListingsToLoadAll() {
  return new Promise((resolve) => {
    console.log('Starting to scroll job listings to load all lazy-loaded content');

    // Find the job listings container - first try to find the UL container specifically
    const jobCardSelector = 'li.occludable-update';
    const jobCards = document.querySelectorAll(jobCardSelector);
    
    // If we have job cards, find their parent UL container
    let ulContainer = null;
    if (jobCards.length > 0) {
      let currentElement = jobCards[0];
      // Walk up the DOM tree to find the UL parent
      while (currentElement && currentElement.tagName !== 'UL' && currentElement.parentElement) {
        currentElement = currentElement.parentElement;
      }
      
      if (currentElement && currentElement.tagName === 'UL') {
        ulContainer = currentElement;
        console.log('Found UL container for job listings');
      }
    }
    
    // Find the actual scrollable parent container
    let scrollableParent = null;
    
    // If we found the UL container, let's find its scrollable parent
    if (ulContainer) {
      console.log('Looking for scrollable parent of UL container');
      let parent = ulContainer.parentElement;
      
      // Walk up the DOM tree to find a scrollable parent
      while (parent) {
        // Check if this element is scrollable
        const overflowY = window.getComputedStyle(parent).overflowY;
        const hasScroll = overflowY === 'auto' || overflowY === 'scroll' || 
                         (parent.scrollHeight > parent.clientHeight && overflowY !== 'hidden');
        
        if (hasScroll) {
          scrollableParent = parent;
          console.log('Found scrollable parent container');
          break;
        }
        
        // Move up to the next parent
        parent = parent.parentElement;
        
        // Stop if we reach the body/html elements
        if (!parent || parent === document.body || parent === document.documentElement) {
          break;
        }
      }
    }
    
    // If we didn't find a scrollable parent, try the traditional container selectors
    let jobsContainer = scrollableParent || ulContainer;
    if (!jobsContainer) {
      const possibleContainers = [
        '.jobs-search-results-list',
        '.jobs-search-results',
        'main div.scaffold-layout__list',
        'div.jobs-search-two-pane__wrapper',
        '.scaffold-layout__list',
        '#main',
        // Add more potential LinkedIn selectors
        '.jobs-search__results-list',
        '.jobs-search__job-feed-container',
        '.jobs-search-results-page__wrapper'
      ];

      for (const selector of possibleContainers) {
        jobsContainer = document.querySelector(selector);
        if (jobsContainer) {
          console.log(`Found job listings container with selector: ${selector}`);
          break;
        }
      }
    }

    if (!jobsContainer) {
      console.log('Could not find the job listings container for scrolling');
      resolve(false);
      return;
    }

    // Log information about the container we found
    console.log(`Using container: ${jobsContainer.tagName}, class: ${jobsContainer.className}`);
    console.log(`Container dimensions: ${jobsContainer.clientWidth}x${jobsContainer.clientHeight}, scrollHeight: ${jobsContainer.scrollHeight}`);

    // Get initial job card count
    const initialJobCount = document.querySelectorAll(jobCardSelector).length;
    console.log(`Initial job card count before scrolling: ${initialJobCount}`);

    // Save the initial scroll position
    const initialScrollTop = jobsContainer.scrollTop;
    
    let previousJobCount = initialJobCount;
    let noChangeCounter = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20; // Increased max scroll attempts to ensure better coverage
    
    // Function to perform a gradual scroll down and then quickly back up
    const scrollGradually = () => {
      if (scrollAttempts >= maxScrollAttempts) {
        console.log(`Reached maximum scroll attempts (${maxScrollAttempts}), stopping`);
        // Restore the original scroll position
        jobsContainer.scrollTop = initialScrollTop;
        
        const finalJobCount = document.querySelectorAll(jobCardSelector).length;
        console.log(`Final job card count after scrolling: ${finalJobCount} (started with ${initialJobCount})`);
        
        resolve(true);
        return;
      }

      scrollAttempts++;
      console.log(`Starting scroll attempt #${scrollAttempts}`);
      
      // Instead of jumping to the bottom immediately, we'll scroll in increments
      const scrollHeight = jobsContainer.scrollHeight;
      const containerHeight = jobsContainer.clientHeight;
      const incrementalSteps = 5; // Number of steps to take when scrolling down
      const stepSize = scrollHeight / incrementalSteps;
      let currentStep = 0;
      
      // Function to incrementally scroll down
      const scrollDownStep = () => {
        if (currentStep >= incrementalSteps) {
          // We've reached the bottom, now quickly scroll back up
          console.log('Reached bottom of scroll container, scrolling back to top');
          setTimeout(() => {
            // Fast scroll to top
            jobsContainer.scrollTop = 0;
            console.log('Scrolled back to top');
            
            // Check for new job cards after full scroll cycle
            setTimeout(() => {
              const currentJobCount = document.querySelectorAll(jobCardSelector).length;
              console.log(`Job count after scroll #${scrollAttempts}: ${currentJobCount} (previously ${previousJobCount})`);
              
              // Check if we've reached the end (no more jobs loading)
              if (currentJobCount === previousJobCount) {
                noChangeCounter++;
                console.log(`No new jobs loaded, counter: ${noChangeCounter}/5`);
                
                // If we haven't seen new jobs for several scrolls, we're probably at the end
                // Increased from 3 to 5 for more patience
                if (noChangeCounter >= 5) {
                  console.log('No new jobs loaded after 5 scroll attempts, ending scroll');
                  // Restore the original scroll position
                  jobsContainer.scrollTop = initialScrollTop;
                  
                  const finalJobCount = document.querySelectorAll(jobCardSelector).length;
                  console.log(`Final job card count after scrolling: ${finalJobCount} (started with ${initialJobCount})`);
                  
                  resolve(true);
                  return;
                }
              } else {
                // Reset counter if we found new jobs
                noChangeCounter = 0;
                console.log(`Found ${currentJobCount - previousJobCount} new job cards!`);
              }
              
              previousJobCount = currentJobCount;
              
              // Continue scrolling with the next attempt
              setTimeout(scrollGradually, 300);
            }, 500); // Check for new jobs after scrolling to top
          }, 300); // Wait before scrolling back to top
          
          return;
        }
        
        // Calculate next scroll position - Go a bit further each time
        const nextScrollTop = Math.min(
          Math.floor(stepSize * (currentStep + 1)),
          scrollHeight - containerHeight
        );
        
        // Scroll to the next position
        jobsContainer.scrollTop = nextScrollTop;
        console.log(`Scroll step ${currentStep + 1}/${incrementalSteps}: Scrolled to position ${nextScrollTop}px`);
        
        // Pause at each step to let content load
        currentStep++;
        
        // Longer pause time for LinkedIn to load content
        setTimeout(scrollDownStep, 600); // Increased from typical 300ms to 600ms for slower scrolling
      };
      
      // Start the incremental scrolling process
      scrollDownStep();
    };
    
    // Start the scrolling process
    scrollGradually();
  });
}

// Function to set up the mutation observer for job listings changes
function setupJobListingsObserver() {
  // We're no longer automatically extracting jobs on DOM changes
  // This function only sets up the observer to track if we need to show the user
  // a notification that LinkedIn's content has changed and they may want to re-analyze
  
  const possibleContainers = [
    '.jobs-search-results-list',
    '.jobs-search-results',
    'main',
    '#main',
    '.scaffold-layout__list'
  ];

  let jobsContainer = null;
  for (const selector of possibleContainers) {
    jobsContainer = document.querySelector(selector);
    if (jobsContainer) {
      console.log(`Found jobs container with selector: ${selector}`);
      break;
    }
  }

  if (jobsContainer) {
    console.log('Setting up mutation observer for job listings container');

    // Use a debounced function to avoid excessive processing
    let debounceTimer = null;
    const debouncedNotify = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        try {
          console.log('Detected changes in job listings container - debounced');
          // Just notify that changes were detected, but don't extract anything
          chrome.runtime.sendMessage({
            action: 'JOBS_LIST_CHANGED',
            message: 'LinkedIn job listings have changed. You may want to re-analyze.'
          });
        } catch (error) {
          console.error('Error in debounced notification:', error);
        }
      }, 1000); // 1 second debounce
    };

    const observer = new MutationObserver((mutations) => {
      console.log('Detected changes in job listings container');
      debouncedNotify();
    });

    // Use less resource-intensive observation
    observer.observe(jobsContainer, {
      childList: true,
      subtree: false,
      attributes: false
    });
  } else {
    console.log('Could not find jobs container for mutation observer');
    // We're not using interval checks anymore since we only want to extract 
    // when the user clicks "Analyze Jobs"
  }
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.action);

  // Wrap all message handling in try-catch to prevent page crashes
  try {
    if (message.action === 'EXTRACT_JOBS') {
      // This action is triggered when the user clicks the "Analyze" button in the extension popup
      console.log('Received request to extract jobs from the "Analyze" button - starting the sequence');
      
      // First clear any existing data
      chrome.runtime.sendMessage({
        action: 'CLEAR_EXISTING_JOBS',
        message: 'Clearing existing job data before new extraction'
      });
      
      // Then scroll to load all job cards
      console.log('Step 1: Scrolling to load all job listings');
      scrollJobListingsToLoadAll().then(scrollSuccess => {
        console.log(`Step 1 complete: Scroll completed with status: ${scrollSuccess}`);
        
        // After scrolling completes, extract the job listings
        console.log('Step 2: Extracting job listings');
        const jobListings = extractJobListings();
        console.log(`Step 2 complete: Extracted ${jobListings.length} job listings after scrolling`);
        
        // Ensure we have job listings before proceeding
        if (!jobListings || jobListings.length === 0) {
          console.error('No job listings extracted - cannot proceed with analysis');
          sendResponse({ 
            error: 'No job listings were found on this page. Please make sure you are on a LinkedIn jobs search results page.',
            jobListings: []
          });
          return;
        }
        
        // Double-check the formatting of our job listings
        const validListings = jobListings.map(job => ({
          id: job.id || `job-${Math.random().toString(36).substring(2, 10)}`,
          title: job.title || 'Unknown Position',
          company: job.company || 'Unknown Company',
          location: job.location || '',
          url: job.url || '',
        }));
        
        console.log(`Step 3: Sending ${validListings.length} formatted job listings for analysis`);
        
        // Explicitly send the job listings to the background script
        chrome.runtime.sendMessage({
          action: 'JOB_LISTINGS_EXTRACTED',
          data: validListings
        }, backgroundResponse => {
          if (chrome.runtime.lastError) {
            console.error('Error sending job listings to background:', chrome.runtime.lastError);
            sendResponse({ error: 'Error communicating with the extension background. Please try again.' });
          } else {
            console.log('Background script acknowledged receipt of job listings:', backgroundResponse);
            // Send response back to popup
            sendResponse({ 
              jobListings: validListings,
              message: `Successfully extracted ${validListings.length} job listings`
            });
          }
        });
      }).catch(error => {
        console.error('Error during job extraction process:', error);
        sendResponse({ 
          error: 'An error occurred during the job extraction process. Please try again.',
          details: error.toString()
        });
      });
      
      return true; // Keep message channel open for async response
    } else if (message.action === 'LOAD_NEXT_PAGE_JOBS') {
      // This action is triggered when the user clicks to load the next page
      console.log('Received request to load next page jobs - starting the sequence');
      
      // First clear any existing data
      chrome.runtime.sendMessage({
        action: 'CLEAR_EXISTING_JOBS',
        message: 'Clearing existing job data before new page load'
      });
      
      // Navigate to the next page
      console.log('Step 1: Navigating to next page');
      const success = navigateToNextJobPage();

      if (success) {
        // Wait for the new page to load
        console.log('Step 1 complete: Navigation successful, waiting for page to load');
        setTimeout(() => {
          // After page loads, scroll to load all job cards
          console.log('Step 2: Scrolling to load all job listings on new page');
          scrollJobListingsToLoadAll().then(scrollSuccess => {
            console.log(`Step 2 complete: Next page scroll completed with status: ${scrollSuccess}`);
            
            // After scrolling completes, extract the job listings
            console.log('Step 3: Extracting job listings from new page');
            const jobListings = extractJobListings();
            console.log(`Step 3 complete: Extracted ${jobListings.length} job listings from next page after scrolling`);
            
            // Send the job listings back to the popup
            console.log('Step 4: Sending extracted job listings for analysis');
            sendResponse({ success: true, jobListings });
          });
        }, 2000); // Wait 2 seconds for page to load

        return true; // Keep message channel open for async response
      } else {
        sendResponse({ success: false, error: 'Could not navigate to next page' });
      }
    } else if (message.action === 'GET_JOB_DESCRIPTION') {
      const { jobId } = message;
      console.log(`Received request to get description for job ID: ${jobId}`);

      // Find and click the job card
      const jobCardResult = findAndClickJobCard(jobId);

      if (!jobCardResult.success) {
        console.log(`Job card with ID ${jobId} not found or could not be clicked`);
        sendResponse({ error: 'Job card not found or could not be clicked' });
        return true;
      }

      // Wait for job description to load after clicking
      setTimeout(() => {
        try {
          const jobDescription = getSelectedJobDescription();
          if (jobDescription) {
            console.log('Successfully retrieved job description');
            sendResponse({ jobDescription });
          } else {
            console.log('Failed to get job description after clicking');

            // Try clicking again with a longer delay
            setTimeout(() => {
              try {
                const retryJobCard = findAndClickJobCard(jobId);
                if (retryJobCard.success) {
                  setTimeout(() => {
                    const retryDescription = getSelectedJobDescription();
                    if (retryDescription) {
                      console.log('Successfully retrieved job description on second attempt');
                      sendResponse({ jobDescription: retryDescription });
                    } else {
                      sendResponse({ error: 'No description found after multiple attempts' });
                    }
                  }, 1500);
                } else {
                  sendResponse({ error: 'Failed to click job card on retry' });
                }
              } catch (retryError) {
                sendResponse({ error: `Error during retry: ${retryError.message}` });
              }
            }, 500);
          }
        } catch (descError) {
          console.error('Error getting job description:', descError);
          sendResponse({ error: 'Error retrieving description: ' + descError.message });
        }
      }, 1500); // Wait for description to load

      return true; // Keep the message channel open for the async response
    } else if (message.action === 'HIGHLIGHT_JOB') {
      const { jobId } = message;
      console.log(`Received request to highlight job ID: ${jobId}`);

      try {
        // Remove any existing highlights
        document.querySelectorAll('.job-analyzer-highlighted').forEach(el => {
          el.classList.remove('job-analyzer-highlighted');
        });

        // Find and highlight the job card
        let found = false;
        const allJobCards = document.querySelectorAll('li, div[data-job-id], div[data-occludable-job-id]');

        for (let i = 0; i < allJobCards.length; i++) {
          try {
            const card = allJobCards[i];
            const cardId = card.getAttribute('data-job-id') ||
              card.getAttribute('data-occludable-job-id') ||
              card.getAttribute('data-id');

            if (cardId === jobId || card.id === jobId) {
              console.log(`Highlighting job card with ID: ${jobId}`);
              card.classList.add('job-analyzer-highlighted');

              // Scroll into view with try-catch to prevent errors
              try {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } catch (scrollError) {
                console.error('Error scrolling to job card:', scrollError);
              }

              found = true;
              break;
            }
          } catch (cardError) {
            console.error(`Error processing job card highlight at index ${i}:`, cardError);
            // Continue with the next card
          }
        }

        if (!found) {
          console.log(`Could not find job card with ID ${jobId} to highlight`);
        }

        sendResponse({ success: found });
      } catch (error) {
        console.error('Error in job highlighting:', error);
        sendResponse({ success: false, error: 'Error during highlighting' });
      }
    }
  } catch (error) {
    console.error('Error handling message in content script:', error);
    sendResponse({ error: 'Internal error in content script' });
  }

  return true; // Keep the message channel open for async responses
});

// Helper function to find and click a job card
function findAndClickJobCard(jobId) {
  try {
    console.log(`Looking for job card with ID: ${jobId}`);
    let jobCardFound = false;

    // Try a variety of selectors to find job cards
    const allJobCards = document.querySelectorAll(
      'li, div[data-job-id], div[data-occludable-job-id], a[href*="currentJobId="], .job-card-container, .jobs-search-results__list-item'
    );

    console.log(`Searching among ${allJobCards.length} possible job cards`);

    // Search for the job card with the specified ID
    for (let i = 0; i < allJobCards.length; i++) {
      try {
        const card = allJobCards[i];

        // Look in various attributes and check URL for job ID
        const cardId = card.getAttribute('data-job-id') ||
          card.getAttribute('data-occludable-job-id') ||
          card.getAttribute('data-id') ||
          card.getAttribute('data-entity-urn') ||
          card.id;

        // Also check if the URL contains the job ID
        const cardHref = card.href || '';
        const hasIdInUrl = cardHref.includes(jobId);

        if (cardId === jobId || card.id === jobId || hasIdInUrl) {
          console.log(`Found job card for ID: ${jobId}`);
          jobCardFound = true;

          // Try to click on the card
          card.click();
          console.log('Clicked on job card, waiting for description to load...');

          // If we've found and clicked the card, we can stop searching
          return { success: true, card };
        }
      } catch (cardError) {
        console.error(`Error processing job card at index ${i}:`, cardError);
        // Continue with the next card
      }
    }

    if (!jobCardFound) {
      // If not found by ID directly, try to find a card with matching URL or title
      console.log('Job card not found by ID, trying alternative methods...');

      // Look for any links or cards that might match
      const allLinks = document.querySelectorAll('a[href*="jobs/view"], .job-card-list__title');

      for (let i = 0; i < allLinks.length; i++) {
        try {
          const link = allLinks[i];
          const href = link.href || '';

          if (href.includes(jobId) || href.includes('jobs/view')) {
            console.log('Found a link that might match the job, clicking it...');
            link.click();
            return { success: true, card: link };
          }
        } catch (linkError) {
          console.error(`Error processing link at index ${i}:`, linkError);
        }
      }
    }

    return { success: false };
  } catch (error) {
    console.error('Error in findAndClickJobCard:', error);
    return { success: false, error };
  }
}

// Run once when the content script is loaded
function initialize() {
  console.log('LinkedIn Job Analyzer content script initialized');
  console.log('NOTE: Job analysis will ONLY start when the user clicks the "Analyze" button in the extension popup');

  try {
    // Add CSS for highlighting
    const style = document.createElement('style');
    style.textContent = `
      .job-analyzer-highlighted {
        border: 3px solid #0073b1 !important;
        box-shadow: 0 0 10px rgba(0, 115, 177, 0.5) !important;
        transform: scale(1.02);
        transition: all 0.3s ease;
        z-index: 100;
        position: relative;
      }
    `;
    document.head.appendChild(style);

    // Wait for the page to fully load
    setTimeout(() => {
      try {
        console.log('Page loaded - setting up job listings observer only');
        console.log('No automatic job extraction will occur until user explicitly clicks "Analyze"');
        
        // NO extraction of job listings at initialization
        // Only set up the observer to watch for changes in LinkedIn's DOM
        setupJobListingsObserver();
        
        // Let the background script know we're ready
        chrome.runtime.sendMessage({
          action: 'CONTENT_SCRIPT_READY',
          message: 'LinkedIn Job Analyzer content script is ready - waiting for user to click Analyze'
        });
      } catch (initError) {
        console.error('Error during initialization:', initError);
      }
    }, 3000); // Wait 3 seconds for the page to load
  } catch (error) {
    console.error('Error initializing content script:', error);
  }
}

// Initialize the content script
initialize(); 