import React, { useCallback, useState, useEffect } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface ResumeUploaderProps {
  onUpload: (resumeData: string) => void;
  resumeUploaded: boolean;
}

function ResumeUploader({ onUpload, resumeUploaded }: ResumeUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!resumeUploaded) {
      setFileName(null);
      setBase64Data(null);
      setError(null);
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
        console.log('Resume data processed successfully');
      } catch (err) {
        console.error('Failed to process file:', err);
        setError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setBase64Data(null);
        setIsProcessing(false);
      }
    };
    
    reader.readAsDataURL(file);
  }, []);

  const handleUploadClick = () => {
    if (!base64Data) {
      setError('No resume data available. Please drop a PDF file first.');
      return;
    }
    
    if (base64Data.length === 0) {
      setError('Resume data is empty. Please try uploading the file again.');
      return;
    }
    
    onUpload(base64Data);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false,
    disabled: isProcessing
  });

  return (
    <Box sx={{ 
      width: '100%',
      padding: 1
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
            <Typography variant="body2" color="text.secondary">
              {fileName}
            </Typography>
          )}
          <Typography variant="body1" sx={{ mt: 2 }}>
            Go to the "Job Rankings" tab and click the "Analyze Jobs" button to see how well your resume matches with the job listings.
          </Typography>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => {
              setFileName(null);
              setBase64Data(null);
              setError(null);
              onUpload('');
            }}
            sx={{ mt: 2 }}
          >
            Upload a different resume
          </Button>
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
          </Box>
          
          {fileName && base64Data && !isProcessing && (
            <Box sx={{ mt: 2, width: '100%' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Selected file: {fileName}
              </Typography>
              
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={handleUploadClick}
                disabled={isProcessing}
              >
                Upload Resume
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ResumeUploader; 