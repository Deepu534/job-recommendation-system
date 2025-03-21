import React from 'react';
import { 
  Box, 
  Typography, 
  Chip,
  IconButton
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

export interface CollapsibleSectionProps {
  params: {
    sectionTitle: string;
    isExpanded: boolean;
    onToggle: (e: React.MouseEvent) => void;
    items: string[];
    chipColor: "primary" | "secondary" | "default" | "error" | "info" | "success" | "warning";
    chipIcon?: React.ReactElement;
  }
}

function CollapsibleSection({ params }: CollapsibleSectionProps) {
  const { 
    sectionTitle, 
    isExpanded, 
    onToggle, 
    items, 
    chipColor, 
    chipIcon 
  } = params;
  
  if (!items || items.length === 0) {
    return null;
  }
  
  return (
    <Box sx={{ 
      pl: 9,
      pt: 1,
      width: '100%'
    }}>
      <Box 
        onClick={onToggle} 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {sectionTitle}
        </Typography>
        <IconButton 
          size="small" 
          onClick={onToggle}
          sx={{ ml: 1, p: 0 }}
        >
          {isExpanded ? 
            <KeyboardArrowUpIcon fontSize="small" /> : 
            <KeyboardArrowDownIcon fontSize="small" />
          }
        </IconButton>
      </Box>
      
      {isExpanded && (
        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          mt: 0.5
        }}>
          {items.map((item, i) => (
            <Chip 
              key={i}
              label={item}
              size="small"
              variant="outlined"
              color={chipColor}
              icon={chipIcon}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default CollapsibleSection; 