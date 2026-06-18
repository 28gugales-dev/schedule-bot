import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router.jsx'
import { AuthProvider } from './features/auth/AuthProvider.jsx'
import { ThemeProvider } from './features/theme/ThemeProvider.jsx'
import { SkinProvider } from './features/skin/SkinProvider.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <SkinProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </SkinProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
