import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { queryClient } from './config/queryClient.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Tajawal, sans-serif',
              fontWeight: 600,
              fontSize: '15px',
              direction: 'rtl',
            },
            success: {
              style: {
                background: '#1d0a3f',
                color: '#E8C76A',
                border: '1px solid rgba(232,199,106,0.3)',
              },
            },
            error: {
              style: {
                background: '#1d0a3f',
                color: '#f87171',
                border: '1px solid rgba(248,113,113,0.3)',
              },
            },
          }}
        />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
