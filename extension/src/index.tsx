import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './components/App';

// Create a theme instance with LinkedIn-inspired colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#0A66C2', // LinkedIn blue
    },
    secondary: {
      main: '#057642', // LinkedIn green
    },
    background: {
      default: '#F3F2EF', // LinkedIn light gray background
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 20,
          fontWeight: 600,
          padding: '6px 16px',
        },
      },
    },
  },
});

// Create root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// Render the app
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
); 