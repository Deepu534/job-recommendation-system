import { useState, useEffect } from 'react';

export function useLoadingState() {
  // State for loading state
  const [isLoading, setIsLoading] = useState(false);
  // State for loading message
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  // State for error messages
  const [error, setError] = useState<string | null>(null);
  
  // Setup message listener for loading message updates
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'UPDATE_LOADING_MESSAGE' && message.message) {
        console.log('Received loading message update:', message.message);
        setLoadingMessage(message.message);
      }
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Cleanup function to remove the listener when component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);
  
  return {
    isLoading,
    loadingMessage,
    error,
    setIsLoading,
    setLoadingMessage,
    setError
  };
} 