import { useState, useEffect } from 'react';

interface UseResumeUploadProps {
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTabValue?: (value: number) => void;
}

export function useResumeUpload({ 
  setIsLoading, 
  setError,
  setTabValue 
}: UseResumeUploadProps) {
  const [resumeUploaded, setResumeUploaded] = useState(false);

  // Check if resume data exists in storage
  useEffect(() => {
    chrome.storage.local.get(['resumeData'], (result) => {
      if (result.resumeData) {
        setResumeUploaded(true);
      }
    });

    // Also check by asking the background script for resume status
    chrome.runtime.sendMessage({ action: 'GET_RESUME_STATUS' }, (response) => {
      if (response && response.resumeUploaded) {
        setResumeUploaded(true);
      }
    });
  }, []);

  const handleResumeUpload = (data: string) => {
    if (data === '') {
      // Handle clear resume case
      console.log('Clearing resume data');
      setResumeUploaded(false);
      chrome.runtime.sendMessage({
        action: 'UPLOAD_RESUME',
        data: ''
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing resume:', chrome.runtime.lastError);
          setError('Error clearing resume data');
        } else if (response.error) {
          console.error('Error clearing resume:', response.error);
          setError(`Error clearing resume: ${response.error}`);
        } else {
          console.log('Resume cleared successfully');
          setError(null);
        }
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('Uploading resume data...');
    chrome.runtime.sendMessage({
      action: 'UPLOAD_RESUME',
      data
    }, (response) => {
      setIsLoading(false);
      
      if (chrome.runtime.lastError) {
        console.error('Error uploading resume:', chrome.runtime.lastError);
        setError('Error uploading resume. Please try again.');
        return;
      }
      
      if (response.error) {
        console.error('Resume upload error:', response.error);
        setError(`Error: ${response.error}`);
      } else {
        console.log('Resume uploaded successfully');
        setResumeUploaded(true);
        setError(null);
        
        // Navigate to the jobs tab if setTabValue is provided
        if (setTabValue) {
          setTabValue(1);
        }
      }
    });
  };

  return {
    resumeUploaded,
    handleResumeUpload
  };
} 