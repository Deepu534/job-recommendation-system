import { useState } from 'react';

export function useAppTabs() {
  // State for tabs
  const [tabValue, setTabValue] = useState(0);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log('Tab changed to:', newValue);
    setTabValue(newValue);
  };
  
  return {
    tabValue,
    setTabValue,
    handleTabChange
  };
} 