import React, { useCallback, useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Chip } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SelectChangeEvent } from '@mui/material/Select';

interface ResumeUploaderProps {
  onUpload: (resumeData: string, requiredLanguages?: string[]) => void;
  resumeUploaded: boolean;
}

function ResumeUploader({ onUpload, resumeUploaded }: ResumeUploaderProps) {
  // State for error messages
  const [error, setError] = useState<string | null>(null);
  // State for the file name
  const [fileName, setFileName] = useState<string | null>(null);
  // State for the base64 data
  const [base64Data, setBase64Data] = useState<string | null>(null);
  // State for tracking file reading process
  const [isProcessing, setIsProcessing] = useState(false);
  // State for selected languages - array for multi-select
  const [requiredLanguages, setRequiredLanguages] = useState<string[]>(['en']);

  // List of West European languages
  const westEuropeanLanguages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'nl', name: 'Dutch' },
  ];

  // Reset the component when resumeUploaded changes
  useEffect(() => {
    if (!resumeUploaded) {
      setFileName(null);
      setBase64Data(null);
      setError(null);
      setRequiredLanguages(['en']); // Reset languages to default (English)
    }
  }, [resumeUploaded]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setBase64Data(null); // Clear previous data
    setIsProcessing(true);
    
    // Check if any files were uploaded
    if (acceptedFiles.length === 0) {
      setError('No files were uploaded');
      setIsProcessing(false);
      return;
    }
    
    const file = acceptedFiles[0];
    
    // Check file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      setIsProcessing(false);
      return;
    }
    
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large (max 10MB)');
      setIsProcessing(false);
      return;
    }
    
    // Check if file is empty
    if (file.size === 0) {
      setError('File is empty');
      setIsProcessing(false);
      return;
    }
    
    // Store file name
    setFileName(file.name);
    console.log('File selected:', file.name, 'Size:', file.size, 'bytes');
    
    // Read file as base64
    const reader = new FileReader();
    
    reader.onabort = () => {
      console.error('File reading was aborted');
      setError('File reading was aborted');
      setIsProcessing(false);
    };
    
    reader.onerror = () => {
      console.error('Failed to read file', reader.error);
      setError('Failed to read file: ' + (reader.error?.message || 'Unknown error'));
      setIsProcessing(false);
    };
    
    reader.onload = () => {
      try {
        if (!reader.result) {
          throw new Error('File reading resulted in empty data');
        }
        
        // Get base64 string
        const base64String = reader.result as string;
        console.log('File read successfully, length:', base64String.length);
        
        // Keep the data URI prefix as the server will handle it
        // This ensures we're sending valid base64 data
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
  
  // Function to handle the upload button click
  const handleUploadClick = () => {
    if (!base64Data) {
      setError('No resume data available. Please drop a PDF file first.');
      return;
    }
    
    if (base64Data.length === 0) {
      setError('Resume data is empty. Please try uploading the file again.');
      return;
    }
    
    console.log('Uploading resume with data length:', base64Data.length, 'Required languages:', requiredLanguages);
    
    // Send the data to the parent component
    onUpload(base64Data, requiredLanguages);
  };
  
  // Handle language selection change
  const handleLanguageChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    // On autofill we get a stringified value.
    const selectedLanguages = typeof value === 'string' ? value.split(',') : value;
    setRequiredLanguages(selectedLanguages);
  };
  
  // Set up dropzone
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
        // Resume already uploaded view
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
              setRequiredLanguages(['en']); // Reset languages to default
              // Send empty string to reset the state
              onUpload('');
            }}
            sx={{ mt: 2 }}
          >
            Upload a different resume
          </Button>
        </Box>
      ) : (
        // Resume upload view
        <Box sx={{ width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload your resume to analyze job matches
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload a PDF resume, then go to the "Job Rankings" tab and click the "Analyze Jobs" button to see how well your resume matches with LinkedIn job listings
          </Typography>
          
          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          
          {/* Processing indicator */}
          {isProcessing && (
            <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
              Processing your resume...
            </Alert>
          )}
          
          {/* Language Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="required-languages-label">Required Languages</InputLabel>
            <Select
              labelId="required-languages-label"
              id="required-languages-select"
              multiple
              value={requiredLanguages}
              onChange={handleLanguageChange}
              input={<OutlinedInput id="select-multiple-languages" label="Required Languages" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const language = westEuropeanLanguages.find(lang => lang.code === value);
                    return <Chip key={value} label={language?.name || value} />;
                  })}
                </Box>
              )}
            >
              {westEuropeanLanguages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Dropzone */}
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.400',
              borderRadius: 2,
              p: 3,
              width: '100%',
              mb: 2,
              textAlign: 'center',
              cursor: isProcessing ? 'wait' : 'pointer',
              backgroundColor: isDragActive ? 'rgba(10, 102, 194, 0.04)' : 'transparent',
              opacity: isProcessing ? 0.7 : 1,
              '&:hover': {
                borderColor: isProcessing ? 'grey.400' : 'primary.main',
                backgroundColor: isProcessing ? 'transparent' : 'rgba(10, 102, 194, 0.04)'
              }
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon 
              sx={{ 
                fontSize: 48, 
                mb: 1,
                color: isDragActive ? 'primary.main' : 'text.secondary'
              }} 
            />
            <Typography variant="body1" color="text.primary">
              {isDragActive
                ? 'Drop your resume here'
                : isProcessing
                  ? 'Processing...'
                  : 'Drag and drop your resume here, or click to browse'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Only PDF files are supported (max 10MB)
            </Typography>
          </Box>
          
          {/* Upload button */}
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