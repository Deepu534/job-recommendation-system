function extractJobListings() {
  chrome.runtime.sendMessage({ 
    action: 'UPDATE_LOADING_MESSAGE', 
    message: 'Extracting job listings...'
  });

  try {
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

    for (const selector of possibleSelectors) {
      const cards = document.querySelectorAll(selector);
      if (cards && cards.length > 0) {
        jobCards = Array.from(cards);
        usedSelector = selector;
        break;
      }
    }
    
    if (jobCards.length === 0) {
      const allElements = document.querySelectorAll('li, div');
      const possibleJobCards = Array.from(allElements).filter(element => {
        const text = element.textContent.toLowerCase();
        return (
          (element.querySelector('a[href*="jobs/view"]') || 
           element.querySelector('a[href*="jobs/search"]')) && 
          (text.includes('ago') || text.includes('applicants') || text.includes('apply'))
        );
      });
      
      if (possibleJobCards.length > 0) {
        jobCards = possibleJobCards;
        usedSelector = 'content-based-detection';
      }
    }
    
    if (jobCards.length === 0) {
      return [];
    }
    
    const jobListings = [];

    jobCards.forEach((card, index) => {
      try {
        const titleSelectors = [
          '.artdeco-entity-lockup__title',
        ];
        const titleElement = findElementWithSelectors(card, titleSelectors);
        const title = titleElement ? titleElement.textContent.trim() : '';

        const companySelector = '.artdeco-entity-lockup__subtitle';
        const companyElement = findElementWithSelectors(card, companySelector);
        const company = companyElement ? companyElement.textContent.trim() : '';

        const locationSelectors = [
          '.artdeco-entity-lockup__caption',
        ];
        const locationElement = findElementWithSelectors(card, locationSelectors);
        const location = locationElement ? locationElement.textContent.trim() : '';

        const linkSelectors = [
          '.job-card-container__link',
          'a[href*="jobs/view"]',
        ];
        const linkElement = findElementWithSelectors(card, linkSelectors);
        const jobUrl = linkElement ? linkElement.href : '';

        let jobId = `job-${index}`;

        if (jobUrl) {
          const idFromUrl = jobUrl.split('currentJobId=')[1]?.split('&')[0];
          if (idFromUrl) jobId = idFromUrl;
        }

        const dataJobId = card.getAttribute('data-job-id') ||
          card.getAttribute('data-occludable-job-id') ||
          card.getAttribute('data-id') ||
          card.getAttribute('data-occludable-entity-urn');
        if (dataJobId) jobId = dataJobId;

        if ((title || company) && jobId) {
          jobListings.push({
            id: jobId,
            title: title || 'Unknown Position',
            company: company || 'Unknown Company',
            location: location || '',
            url: jobUrl || '',
            element: null
          });
        }
      } catch (error) {
        console.error(`Error extracting job data for card ${index}:`, error);
      }
    });
    return jobListings;
  } catch (error) {
    return [];
  }
}

function findElementWithSelectors(parentElement, selectors) {
  try {
    for (const selector of selectors) {
      const elements = parentElement.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        return elements[0];
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

function getSelectedJobDescription() {
  try {
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
      const possibleDescriptionElements = Array.from(document.querySelectorAll('div, p, section, article'))
        .filter(el => {
          const text = el.textContent.trim();
            (text.toLowerCase().includes('responsibilities') ||
              text.toLowerCase().includes('qualifications') ||
              text.toLowerCase().includes('requirements') ||
              text.toLowerCase().includes('about the job') ||
              text.toLowerCase().includes('job description'));
        });

      if (possibleDescriptionElements.length > 0) {
        descriptionElement = possibleDescriptionElements[0];
      } else {
        return null;
      }
    }

    const description = descriptionElement.textContent.trim();

    return {
      description,
      fullHtml: ''
    };
  } catch (error) {
    return null;
  }
}

function sendJobsToBackground(jobListings) {
  try {
    chrome.runtime.sendMessage({
      action: 'JOB_LISTINGS_EXTRACTED',
      data: jobListings
    });
  } catch (error) {
    console.error('Error in sendJobsToBackground:', error);
  }
}

function navigateToNextJobPage(suppressScrolling = false) {
  suppressScrolling = false;
  try {
    let currentPage = 1;
    let nextButton = null;
    nextButton = document.querySelector('button[aria-label="View next page"], button.jobs-search-pagination__button--next');
    
    if (nextButton) {
      const activePaginationItem = document.querySelector('.artdeco-pagination__indicator--number.active, .artdeco-pagination__indicator.active, [aria-current="true"]');
      if (activePaginationItem) {
        const pageText = activePaginationItem.textContent.trim();
        const pageNumber = parseInt(pageText);
        if (!isNaN(pageNumber)) {
          currentPage = pageNumber;
        }
      }
      
      try {
        nextButton.click();
        handleAfterClick(currentPage, suppressScrolling);
        return true;
      } catch (clickError) {
        nextButton = null;
      }
    }
    
    if (!nextButton) {
      const buttonsWithSVG = Array.from(document.querySelectorAll('button'));
      
      const nextButtons = buttonsWithSVG.filter(btn => {
        const svgIcon = btn.querySelector('svg[data-test-icon="chevron-right-small"]');
        const hasNextText = btn.textContent.trim().toLowerCase().includes('next');
        return svgIcon || hasNextText;
      });
      
      if (nextButtons.length > 0) {
        nextButton = nextButtons[0];    
        try {
          nextButton.click();
          handleAfterClick(currentPage, suppressScrolling);
          return true;
        } catch (clickError) {
          nextButton = null;
        }
      }
    }

    let activePageElement = document.querySelector('.artdeco-pagination__indicator--number.active.selected');
    
    if (activePageElement) {
      const currentPageBtn = activePageElement.querySelector('button');
      currentPage = currentPageBtn ? parseInt(currentPageBtn.querySelector('span').textContent) : 1;
      const nextPageElement = document.querySelector(`[data-test-pagination-page-btn="${currentPage + 1}"]`);
      if (nextPageElement) {
        nextButton = nextPageElement.querySelector('button');
      }
    }

    if (!nextButton) {
      const possibleActiveSelectors = [
        '.artdeco-pagination__indicator.active',
        '.artdeco-pagination__indicator.selected',
        '.artdeco-pagination__indicator--number.active',
        '.active[role="button"]',
        '[aria-current="true"]',
        '.selected[role="button"]',
        '.artdeco-pagination li.active',
        '.artdeco-pagination li.selected',
        '.pagination li.active',
        '.pagination li.selected',
        '.jobs-search-results-list__pagination li.active',
        '.jobs-search-results-list__pagination li.selected'
      ];
      
      for (const selector of possibleActiveSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          activePageElement = element;
          const pageText = element.textContent.trim();
          const pageNumber = parseInt(pageText);
          if (!isNaN(pageNumber)) {
            currentPage = pageNumber;
          }
          break;
        }
      }
      
      const nextButtonSelectors = [
        '.artdeco-pagination__button--next',
        'button[aria-label="Next"]',
        'button.next',
        'li.next button',
        'button[data-control-name="pagination_right"]',
        'button.artdeco-pagination__button--next',
        'button.artdeco-pagination__button[data-direction="next"]',
        'button:not([disabled]):-webkit-any(:has(span:contains("Next")), :contains("Next"))',
        'button.artdeco-pagination__button:not([disabled])[aria-label*="Next"]',
        'button:not([disabled]) svg[data-test-icon="arrow-right-small"]',
        'button:not([disabled]) .artdeco-icon[type="arrow-right-small"]',
        'button:not([disabled]) i[aria-label*="next"]'
      ];
      
      for (const selector of nextButtonSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            nextButton = elements[0];
            break;
          }
        } catch (error) {
          // Some complex selectors might not be supported, continue to the next
        }
      }
      
      if (!nextButton && activePageElement) {
        let paginationContainer = null;
        let current = activePageElement;
        
        while (current && current.parentElement) {
          current = current.parentElement;
          if (current.classList.contains('artdeco-pagination') || 
              current.querySelector('li.active') || 
              current.querySelector('li.selected')) {
            paginationContainer = current;
            break;
          }
          
          if (current === document.body) break;
        }
        
        if (paginationContainer) {
          const allButtons = Array.from(paginationContainer.querySelectorAll('button:not([disabled])'));
          const activeButtonIndex = allButtons.findIndex(btn => {
            return btn.closest('li')?.classList.contains('active') || 
                   btn.closest('li')?.classList.contains('selected') ||
                   btn.classList.contains('active') ||
                   btn.classList.contains('selected') ||
                   btn.parentElement?.classList.contains('active') ||
                   btn.parentElement?.classList.contains('selected') ||
                   btn.getAttribute('aria-current') === 'true';
          });
          
          if (activeButtonIndex !== -1 && activeButtonIndex < allButtons.length - 1) {
            nextButton = allButtons[activeButtonIndex + 1];
          }
        }
      }
    }
    
    if (!nextButton) {
      const allButtons = Array.from(document.querySelectorAll('button:not([disabled])'));
      const possibleNextButtons = allButtons.filter(btn => {
        const text = btn.textContent.toLowerCase();
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        
        return (text.includes('next') || ariaLabel.includes('next')) ||
               btn.querySelector('svg[data-test-icon="arrow-right-small"]') ||
               btn.querySelector('.artdeco-icon[type="arrow-right-small"]');
      });
      
      if (possibleNextButtons.length > 0) {
        nextButton = possibleNextButtons[0];
      }
    }
    if (!nextButton) {
      return false;
    }

    if (!nextButton || typeof nextButton.click !== 'function') {
      if (nextButton) {
        let current = nextButton;
        let found = false;
        for (let i = 0; i < 3; i++) {
          if (!current || current === document.body) break;
          
          current = current.parentElement;
          if (current && typeof current.click === 'function') {
            nextButton = current;
            found = true;
            break;
          }
        }
        
        if (!found) {
          try {
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            
            const clickResult = nextButton.dispatchEvent(clickEvent);
            if (clickResult) {
              handleAfterClick(currentPage, suppressScrolling);
              return true;
            }
          } catch (eventError) {
            console.error('Error dispatching click event:', eventError);
          }
          
          if (nextButton.tagName === 'A' && nextButton.href) {
            window.location.href = nextButton.href;
            setTimeout(() => {
              handleAfterClick(currentPage, suppressScrolling);
            }, 2000);
            
            return true;
          }
          return false;
        }
      } else {
        return false;
      }
    }
 
    try {
      nextButton.click();
      handleAfterClick(currentPage, suppressScrolling);
      return true;
    } catch (clickError) {
      try {
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        
        nextButton.dispatchEvent(clickEvent);
        handleAfterClick(currentPage, suppressScrolling);
        return true;
      } catch (eventError) {
        return false;
      }
    }
  } catch (error) {
    chrome.runtime.sendMessage({
      action: 'NEXT_PAGE_ERROR',
      error: 'Failed to navigate to next page: ' + error.message
    });
    return false;
  }

  function handleAfterClick(currentPage, suppressScrolling) {
    suppressScrolling = false;
    setTimeout(() => {
      chrome.runtime.sendMessage({ 
        action: 'UPDATE_LOADING_MESSAGE', 
        message: 'New page loaded, preparing to analyze jobs...'
      });

      scrollJobListingsToLoadAll().then(scrollSuccess => {
        if (scrollSuccess) {
          chrome.runtime.sendMessage({ 
            action: 'UPDATE_LOADING_MESSAGE', 
            message: 'Extracting job listings...'
          });
          
          const jobListings = extractJobListings();
          
          if (jobListings && jobListings.length > 0) {
            chrome.runtime.sendMessage({ 
              action: 'UPDATE_LOADING_MESSAGE', 
              message: `Sending ${jobListings.length} jobs for analysis...`
            });

            chrome.runtime.sendMessage({
              action: 'JOB_LISTINGS_EXTRACTED',
              data: jobListings
            }, response => {
              chrome.runtime.sendMessage({ 
                action: 'UPDATE_LOADING_MESSAGE', 
                message: `Processing ${jobListings.length} job matches...`
              });
              
              if (chrome.runtime.lastError) {
                chrome.runtime.sendMessage({
                  action: 'NEXT_PAGE_ERROR',
                  error: 'Failed to analyze jobs on the next page.'
                });
                chrome.runtime.sendMessage({ 
                  action: 'UPDATE_LOADING_MESSAGE', 
                  message: 'Error sending jobs for analysis'
                });

                chrome.runtime.sendMessage({
                  action: 'SET_LOADING_STATE',
                  isLoading: false
                });
              } else {
                chrome.runtime.sendMessage({
                  action: 'NEXT_PAGE_SUCCESS',
                  data: {
                    jobCount: jobListings.length,
                    currentPage: currentPage + 1
                  }
                });
                chrome.runtime.sendMessage({ 
                  action: 'UPDATE_LOADING_MESSAGE', 
                  message: `Successfully analyzed ${jobListings.length} jobs from page ${currentPage + 1}`
                });
              }
            });
          } else {
            chrome.runtime.sendMessage({ 
              action: 'UPDATE_LOADING_MESSAGE', 
              message: 'No jobs found on this page'
            });
            chrome.runtime.sendMessage({
              action: 'SET_LOADING_STATE',
              isLoading: false
            });
            chrome.runtime.sendMessage({
              action: 'NEXT_PAGE_ERROR',
              error: 'No jobs found on the next page.'
            });
          }
        } else {
          chrome.runtime.sendMessage({ 
            action: 'UPDATE_LOADING_MESSAGE', 
            message: 'Failed to load jobs on this page'
          });
          chrome.runtime.sendMessage({
            action: 'SET_LOADING_STATE',
            isLoading: false
          });
          chrome.runtime.sendMessage({
            action: 'NEXT_PAGE_ERROR',
            error: 'Failed to load jobs on the next page.'
          });
        }
      });
    }, 2000);
  }
}

function scrollJobListingsToLoadAll() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ 
      action: 'CONFIGURE_LOADING_MESSAGE', 
      enabled: true,
      defaultMessage: 'Reading job descriptions...'
    });
    chrome.runtime.sendMessage({ 
      action: 'UPDATE_LOADING_MESSAGE', 
      message: 'Scrolling to load job descriptions...'
    });
    chrome.runtime.sendMessage({
      action: 'SET_LOADING_STATE',
      isLoading: true
    });
    const jobCardSelector = 'li.occludable-update';
    const jobCards = document.querySelectorAll(jobCardSelector);
    let ulContainer = null;
    if (jobCards.length > 0) {
      let currentElement = jobCards[0];
      while (currentElement && currentElement.tagName !== 'UL' && currentElement.parentElement) {
        currentElement = currentElement.parentElement;
      }
      
      if (currentElement && currentElement.tagName === 'UL') {
        ulContainer = currentElement;
        console.log('Found UL container for job listings');
      }
    }
    let scrollableParent = null;
    if (ulContainer) {
      let parent = ulContainer.parentElement;
      while (parent) {
        const overflowY = window.getComputedStyle(parent).overflowY;
        const hasScroll = overflowY === 'auto' || overflowY === 'scroll' || 
                         (parent.scrollHeight > parent.clientHeight && overflowY !== 'hidden');
        
        if (hasScroll) {
          scrollableParent = parent;
          console.log('Found scrollable parent container');
          break;
        }
        
        parent = parent.parentElement;
        
        if (!parent || parent === document.body || parent === document.documentElement) {
          break;
        }
      }
    }
    
    let jobsContainer = scrollableParent || ulContainer;
    if (!jobsContainer) {
      const possibleContainers = [
        '.jobs-search-results-list',
        '.jobs-search-results',
        'main div.scaffold-layout__list',
        'div.jobs-search-two-pane__wrapper',
        '.scaffold-layout__list',
        '#main',
        '.jobs-search__results-list',
        '.jobs-search__job-feed-container',
        '.jobs-search-results-page__wrapper'
      ];

      for (const selector of possibleContainers) {
        jobsContainer = document.querySelector(selector);
        if (jobsContainer) {
          break;
        }
      }
    }

    if (!jobsContainer) {
      chrome.runtime.sendMessage({ 
        action: 'UPDATE_LOADING_MESSAGE', 
        message: 'Failed to find job listings container'
      });
      
      chrome.runtime.sendMessage({
        action: 'SET_LOADING_STATE',
        isLoading: false
      });
      
      resolve(false);
      return;
    }

    const initialJobCount = document.querySelectorAll(jobCardSelector).length;
    chrome.runtime.sendMessage({ 
      action: 'UPDATE_LOADING_MESSAGE', 
      message: `Reading job descriptions... (0/${initialJobCount})`
    });

    const initialScrollTop = jobsContainer.scrollTop;
    
    let previousJobCount = initialJobCount;
    let noChangeCounter = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 1;

    const scrollGradually = () => {
      if (scrollAttempts >= maxScrollAttempts) {
        jobsContainer.scrollTop = initialScrollTop;
        
        const finalJobCount = document.querySelectorAll(jobCardSelector).length;
        chrome.runtime.sendMessage({ 
          action: 'UPDATE_LOADING_MESSAGE', 
          message: `Extracting ${finalJobCount} job descriptions...`
        });
        
        resolve(true);
        return;
      }

      scrollAttempts++;
      
      chrome.runtime.sendMessage({ 
        action: 'UPDATE_LOADING_MESSAGE', 
        message: `Scrolling to load job descriptions... (single scroll)`
      });
      
      const scrollHeight = jobsContainer.scrollHeight;
      const containerHeight = jobsContainer.clientHeight;
      const incrementalSteps = 5;
      const stepSize = scrollHeight / incrementalSteps;
      let currentStep = 0;

      const scrollDownStep = () => {
        if (currentStep >= incrementalSteps) {
          chrome.runtime.sendMessage({ 
            action: 'UPDATE_LOADING_MESSAGE', 
            message: `Scrolling back to top... (attempt ${scrollAttempts}/${maxScrollAttempts})`
          });
          
          setTimeout(() => {
            jobsContainer.scrollTop = 0;
            setTimeout(() => {
              const currentJobCount = document.querySelectorAll(jobCardSelector).length;
              chrome.runtime.sendMessage({ 
                action: 'UPDATE_LOADING_MESSAGE', 
                message: `Found ${currentJobCount} job descriptions (scroll ${scrollAttempts}/${maxScrollAttempts})`
              });
              
              // Check if we've reached the end (no more jobs loading)
              if (currentJobCount === previousJobCount) {
                // Since we're only doing one scroll, we'll immediately finish
                console.log('Completed single scroll through job listings');
                // Restore the original scroll position
                jobsContainer.scrollTop = initialScrollTop;
                
                const finalJobCount = document.querySelectorAll(jobCardSelector).length;
                console.log(`Final job card count after scrolling: ${finalJobCount} (started with ${initialJobCount})`);
                
                // Update loading message for extraction phase
                chrome.runtime.sendMessage({ 
                  action: 'UPDATE_LOADING_MESSAGE', 
                  message: `Extracting ${finalJobCount} job descriptions...`
                });
                
                resolve(true);
                return;
              } else {
                // Reset counter if we found new jobs
                noChangeCounter = 0;
                console.log(`Found ${currentJobCount - previousJobCount} new job cards!`);
              }
              
              previousJobCount = currentJobCount;
              
              // Since we're only doing one scroll, we'll resolve here instead of continuing
              console.log('Completed single scroll through job listings');
              // Restore the original scroll position
              jobsContainer.scrollTop = initialScrollTop;
              
              const finalJobCount = document.querySelectorAll(jobCardSelector).length;
              console.log(`Final job card count after scrolling: ${finalJobCount} (started with ${initialJobCount})`);
              
              // Update loading message for extraction phase
              chrome.runtime.sendMessage({ 
                action: 'UPDATE_LOADING_MESSAGE', 
                message: `Extracting ${finalJobCount} job descriptions...`
              });
              
              resolve(true);
              return;
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
        
        // Update loading message with current step
        chrome.runtime.sendMessage({ 
          action: 'UPDATE_LOADING_MESSAGE', 
          message: `Scrolling down to load jobs... (step ${currentStep + 1}/${incrementalSteps})`
        });
        
        // Pause at each step to let content load
        currentStep++;
        
        // Longer pause time for LinkedIn to load content
        setTimeout(scrollDownStep, 1000); // Increased from 600ms to 1000ms to give more time for content to load
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
        
        // Update loading message for the analysis phase
        chrome.runtime.sendMessage({ 
          action: 'UPDATE_LOADING_MESSAGE', 
          message: `Processing ${validListings.length} jobs...`
        });
        
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
    } 
    else if (message.action === 'LOAD_NEXT_PAGE_JOBS') {
      // This action is triggered when the user clicks to load the next page
      console.log('Received request to load next page jobs - starting the sequence');
      
      // First clear any existing data
      chrome.runtime.sendMessage({
        action: 'CLEAR_EXISTING_JOBS',
        message: 'Clearing existing job data before new page load'
      });
      
      // Configure the loading message system
      chrome.runtime.sendMessage({ 
        action: 'CONFIGURE_LOADING_MESSAGE', 
        enabled: true,
        defaultMessage: 'Navigating to next page...'
      });
      
      // Show initial loading message
      chrome.runtime.sendMessage({ 
        action: 'UPDATE_LOADING_MESSAGE', 
        message: 'Navigating to next page of job listings...'
      });
      
      // Set loading state to ensure loading indicator is visible
      chrome.runtime.sendMessage({
        action: 'SET_LOADING_STATE',
        isLoading: true
      });
      
      // Always set suppressScrolling to false to ensure we always scroll
      const suppressScrolling = false;
      console.log(`Always enabling scrolling on next page: suppressScrolling = ${suppressScrolling}`);
      
      // Navigate to the next page
      console.log('Step 1: Navigating to next page');
      const success = navigateToNextJobPage(suppressScrolling);

      if (success) {
        // Wait for the new page to load
        console.log('Step 1 complete: Navigation successful, waiting for page to load');
        
        // We don't need the rest of this handler as the navigateToNextJobPage function
        // will now handle scrolling, extraction, and sending the NEXT_PAGE_SUCCESS message
        sendResponse({ success: true });
      } else {
        // Update loading message to indicate failure
        chrome.runtime.sendMessage({ 
          action: 'UPDATE_LOADING_MESSAGE', 
          message: 'Failed to navigate to next page'
        });
        
        // Reset loading state
        chrome.runtime.sendMessage({
          action: 'SET_LOADING_STATE',
          isLoading: false
        });
        
        sendResponse({ success: false, error: 'Could not navigate to next page' });
      }
      
      return true; // Keep message channel open for async response
    }
    else if (message.action === 'GET_JOB_DESCRIPTION') {
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
    }
    else if (message.action === 'HIGHLIGHT_JOB') {
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
        const cardHref = card.href || '';
        const hasIdInUrl = cardHref.includes(jobId);

        if (cardId === jobId || card.id === jobId || hasIdInUrl) {
          jobCardFound = true;
          card.click();
          return { success: true, card };
        }
      } catch (cardError) {
        console.error(`Error processing job card at index ${i}:`, cardError);
      }
    }

    if (!jobCardFound) {
      const allLinks = document.querySelectorAll('a[href*="jobs/view"], .job-card-list__title');
      for (let i = 0; i < allLinks.length; i++) {
        try {
          const link = allLinks[i];
          const href = link.href || '';

          if (href.includes(jobId) || href.includes('jobs/view')) {
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
    return { success: false, error };
  }
}

function initialize() {
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
    setTimeout(() => {
      try {
        setupJobListingsObserver();
        chrome.runtime.sendMessage({
          action: 'CONTENT_SCRIPT_READY',
          message: 'LinkedIn Job Analyzer content script is ready - waiting for user to click Analyze'
        });
      } catch (initError) {
        console.error('Error during initialization:', initError);
      }
    }, 3000);
  } catch (error) {
    console.error('Error initializing content script:', error);
  }
}

initialize(); 