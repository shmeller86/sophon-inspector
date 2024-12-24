import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

const queryClient = new QueryClient();

const Root = () => {
  const [darkMode, setDarkMode] = useState(false); // Состояние для темы

  // Динамическое создание темы
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
        },
      }),
    [darkMode]
  );

  const toggleTheme = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <App toggleTheme={toggleTheme} darkMode={darkMode} />
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

reportWebVitals();
