import React, { useCallback, useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, Chip } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearIcon from '@mui/icons-material/Clear';

interface ResumeUploaderProps {
  onUpload: (resumeData: string) => void;
  resumeUploaded: boolean;
}

function ResumeUploader({ onUpload, resumeUploaded }: ResumeUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);

  useEffect(() => {
    if (!resumeUploaded) {
      setFileName(null);
      setBase64Data(null);
      setError(null);
      setIsPendingConfirmation(false);
    }
  }, [resumeUploaded]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    if (acceptedFiles.length === 0) {
      setError('Please upload a PDF file.');
      return;
    }
    
    const file = acceptedFiles[0];
    setFileName(file.name);
    setIsProcessing(true);
    
    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      setError('Failed to read file');
      setBase64Data(null);
      setIsProcessing(false);
    };
    
    reader.onload = () => {
      try {
        if (!reader.result) {
          throw new Error('File reading resulted in empty data');
        }
        
        const base64String = reader.result as string;
        setBase64Data(base64String);
        setIsProcessing(false);
        setIsPendingConfirmation(true);
        console.log('Resume data processed successfully');
        
        // No longer automatically upload - wait for confirmation
      } catch (err) {
        console.error('Failed to process file:', err);
        setError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setBase64Data(null);
        setIsProcessing(false);
      }
    };
    
    reader.readAsDataURL(file);
  }, []);

  const handleConfirmUpload = () => {
    if (base64Data) {
      onUpload(base64Data);
      setIsPendingConfirmation(false);
    }
  };

  const handleRemoveFile = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setFileName(null);
    setBase64Data(null);
    setError(null);
    setIsPendingConfirmation(false);
    onUpload('');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false,
    disabled: isProcessing || isPendingConfirmation
  });

  return (
    <Box sx={{ 
      width: '100%',
      padding: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: isPendingConfirmation ? 'calc(100vh - 200px)' : 'auto',
      minHeight: isPendingConfirmation ? '400px' : 'auto'
    }}>
      {resumeUploaded ? (
        <Box sx={{ 
          textAlign: 'center',
          p: 2
        }}>
          <CheckCircleIcon 
            color="success" 
            sx={{ fontSize: 60 }} 
          />
          <Typography variant="h6">
            Resume uploaded successfully!
          </Typography>
          {fileName && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Chip
                label={fileName}
                color="primary"
                variant="outlined"
                onDelete={handleRemoveFile}
                deleteIcon={<ClearIcon />}
                sx={{ 
                  maxWidth: '100%', 
                  fontWeight: 500,
                  '& .MuiChip-label': { 
                    whiteSpace: 'normal',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }
                }}
              />
            </Box>
          )}
          <Typography variant="body1" sx={{ mt: 2 }}>
            Go to the "Job Rankings" tab and click the "Analyze Jobs" button to see how well your resume matches with the job listings.
          </Typography>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={handleRemoveFile}
            sx={{ mt: 2 }}
          >
            Upload a different resume
          </Button>
        </Box>
      ) : isPendingConfirmation ? (
        <Box sx={{ 
          textAlign: 'center',
          p: 3,
          py: 4,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Please confirm your resume before starting the job ranking analysis
          </Typography>
          {fileName && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Chip
                label={fileName}
                color="primary"
                variant="outlined"
                onDelete={() => handleRemoveFile()}
                deleteIcon={<ClearIcon />}
                sx={{ 
                  maxWidth: '100%', 
                  fontWeight: 500,
                  '& .MuiChip-label': { 
                    whiteSpace: 'normal',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }
                }}
              />
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleConfirmUpload}
            >
              Confirm Upload
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => handleRemoveFile()}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload your resume to analyze job matches
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload a PDF resume, then go to the "Job Rankings" tab and click the "Analyze Jobs" button to see how well your resume matches with LinkedIn job listings
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          
          {isProcessing && (
            <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
              Processing your resume...
            </Alert>
          )}
          
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              {isDragActive ? 
                'Drop your resume here...' : 
                'Drag and drop your resume here, or click to select'
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Only PDF files are accepted
            </Typography>
            
            {fileName && !isProcessing && !resumeUploaded && !isPendingConfirmation && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Chip
                  label={fileName}
                  color="primary"
                  variant="outlined"
                  onDelete={handleRemoveFile}
                  deleteIcon={<ClearIcon />}
                  sx={{ 
                    maxWidth: '100%', 
                    fontWeight: 500,
                    '& .MuiChip-label': { 
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default ResumeUploader; 