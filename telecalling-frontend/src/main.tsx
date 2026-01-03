// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from './App';
import './index.css';
import { store } from './store';
import { ThemeProvider } from './providers/theme-provider';
import Modals from './modals/modals';
import { Toaster } from 'sonner';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider >
        <BrowserRouter>
          <Toaster />
          <Modals />
          <div className="min-h-screen w-full mx-auto">
            <App />
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
