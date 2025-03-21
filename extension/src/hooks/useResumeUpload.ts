import { useState, useEffect } from 'react';

interface UseResumeUploadProps {
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTabValue: (value: number) => void;
}

export function useResumeUpload({ setIsLoading, setError, setTabValue }: UseResumeUploadProps) {
  // State for resume uploaded status
  const [resumeUploaded, setResumeUploaded] = useState(false);
  
  // Check resume status on init
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
  }, [setTabValue]);
  
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
  
  return {
    resumeUploaded,
    handleResumeUpload
  };
} 