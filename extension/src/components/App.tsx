import React from 'react';
import { Box, Typography, LinearProgress, Alert, Divider, Button } from '@mui/material';
import ResumeUploader from './ResumeUploader';
import JobRankingsComponent from './JobRankings';
import { useLinkedInStatus } from '../hooks/useLinkedInStatus';
import { useResumeUpload } from '../hooks/useResumeUpload';
import { useJobRankings } from '../hooks/useJobRankings';
import { useLoadingState } from '../hooks/useLoadingState';

// Header component
function Header() {
  return (
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
  );
}

// LoadingOverlay component
function LoadingOverlay({ isLoading, message }: { isLoading: boolean, message: string }) {
  if (!isLoading) return null;
  
  return (
    <>
      {/* Full-screen dimming overlay */}
      <Box sx={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker for better contrast
        zIndex: 999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        animation: 'fadeIn 0.3s ease-in-out',
        '@keyframes fadeIn': {
          '0%': {
            opacity: 0,
          },
          '100%': {
            opacity: 1,
          },
        },
      }} />
      
      {/* Loading indicator card */}
      <Box sx={{ 
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        p: 4, // Increased padding
        borderRadius: 2, // Slightly more rounded
        boxShadow: 5,
        minWidth: '320px',
        maxWidth: '90%',
        animation: 'slideIn 0.3s ease-out',
        '@keyframes slideIn': {
          '0%': {
            opacity: 0,
            transform: 'translate(-50%, -45%)',
          },
          '100%': {
            opacity: 1,
            transform: 'translate(-50%, -50%)',
          },
        },
      }}>
        <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>{message}</Typography>
        <Box sx={{ width: '100%' }}>
          <LinearProgress 
            variant="indeterminate" // Shows continuous animation
            sx={{ 
              height: 8, 
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4
              }
            }} 
          />
        </Box>
      </Box>
    </>
  );
}

// Error message component
function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  
  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
        {error}
      </Alert>
    </Box>
  );
}

// LinkedIn status message component
function LinkedInStatusMessage({ isOnLinkedIn }: { isOnLinkedIn: boolean }) {
  if (isOnLinkedIn) return null;
  
  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="body1" color="error">
        Please open a LinkedIn Jobs page to use this extension.
      </Typography>
    </Box>
  );
}

// Compact Resume status component
function ResumeStatus({ resumeUploaded, handleUploadClick }: { resumeUploaded: boolean, handleUploadClick: () => void }) {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      p: 2,
      bgcolor: resumeUploaded ? 'success.light' : 'grey.100',
      borderRadius: 1,
      mb: 2
    }}>
      <Typography variant="body1" color={resumeUploaded ? 'white' : 'text.primary'}>
        {resumeUploaded ? 'Resume uploaded ✓' : 'No resume uploaded'}
      </Typography>
      <Button 
        variant={resumeUploaded ? "outlined" : "contained"}
        color={resumeUploaded ? "inherit" : "primary"}
        size="small"
        onClick={handleUploadClick}
        sx={{ 
          color: resumeUploaded ? 'white' : undefined,
          borderColor: resumeUploaded ? 'white' : undefined
        }}
      >
        {resumeUploaded ? 'Change Resume' : 'Upload Resume'}
      </Button>
    </Box>
  );
}

// Main App component
function App() {
  console.log('App component rendering');
  
  // Get LinkedIn status
  const { isOnLinkedIn, error: linkedInError } = useLinkedInStatus();
  
  // Get loading state
  const { isLoading, loadingMessage, setIsLoading, setLoadingMessage, error, setError } = useLoadingState();
  
  // State for showing resume uploader
  const [showResumeUploader, setShowResumeUploader] = React.useState(false);
  
  // Get resume upload state and handlers
  const { resumeUploaded, handleResumeUpload } = useResumeUpload({ 
    setIsLoading, 
    setError, 
    setTabValue: () => setShowResumeUploader(false) // Hide uploader after successful upload
  });
  
  // Get job rankings state and handlers
  const { 
    jobRankings, 
    hasMoreJobs, 
    isLoadingMore, 
    isLoadingNextPage,
    handleMatchJobs, 
    handleLoadMore, 
    handleLoadNextPage,
    handleJobClick,
    handleClearResults
  } = useJobRankings({
    setIsLoading,
    setLoadingMessage,
    setError,
    isLoading
  });

  // Toggle resume uploader visibility
  const toggleResumeUploader = () => {
    setShowResumeUploader(!showResumeUploader);
  };
  
  // Determine whether to show the analysis button
  const showAnalysisButton = resumeUploaded && jobRankings.length === 0;
  
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Header />
      
      {/* Main content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        p: 2
      }}>
        {/* Not on LinkedIn message */}
        <LinkedInStatusMessage isOnLinkedIn={isOnLinkedIn} />
        
        {/* Error message */}
        <ErrorMessage error={error} />
        
        {/* Resume status */}
        <ResumeStatus 
          resumeUploaded={resumeUploaded} 
          handleUploadClick={toggleResumeUploader} 
        />
        
        {/* Resume upload modal */}
        {showResumeUploader && (
          <ResumeUploader 
            onClose={toggleResumeUploader} 
            onUpload={handleResumeUpload} 
          />
        )}
        
        {/* Job rankings */}
        {isOnLinkedIn && (
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            position: 'relative'
          }}>
            <JobRankingsComponent 
              rankings={jobRankings}
              onJobClick={handleJobClick}
              onRefresh={handleMatchJobs}
              onLoadMore={handleLoadMore}
              onLoadNextPage={handleLoadNextPage}
              onClearResults={handleClearResults}
              hasMoreJobs={hasMoreJobs}
              isLoadingMore={isLoadingMore}
              isLoadingNextPage={isLoadingNextPage}
              showAnalysisButton={showAnalysisButton}
              handleMatchJobs={handleMatchJobs}
              resumeUploaded={resumeUploaded}
            />
          </Box>
        )}
      </Box>
      
      {/* Loading overlay */}
      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />
    </Box>
  );
}

export default App; 