import { useState, useEffect } from 'react';

export function useLinkedInStatus() {
  // State for checking if we're on LinkedIn
  const [isOnLinkedIn, setIsOnLinkedIn] = useState(false);
  // State for error messages
  const [error, setError] = useState<string | null>(null);
  
  // Check if we're on LinkedIn jobs page
  useEffect(() => {
    console.log('Checking LinkedIn status');
    
    // Check if we're on LinkedIn
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || '';
      console.log('Current URL:', currentUrl);
      const isLinkedIn = currentUrl.includes('linkedin.com/jobs');
      setIsOnLinkedIn(isLinkedIn);
      console.log('Is on LinkedIn:', isLinkedIn);
      
      if (!isLinkedIn) {
        console.log('Not on a LinkedIn jobs page');
        setError('Please navigate to a LinkedIn jobs page to use this extension');
      } else {
        setError(null);
      }
    });
  }, []);
  
  return { isOnLinkedIn, error };
} 