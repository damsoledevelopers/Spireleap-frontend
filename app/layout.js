import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { Toaster } from 'react-hot-toast'
import WidgetCleaner from '@/components/Layout/WidgetCleaner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SPIRELEAP - Real Estate CRM & CMS',
  description: 'Comprehensive real estate property listing website with CRM and CMS',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CurrencyProvider>
            <WidgetCleaner />
            <div id="app-content-wrapper" className="min-h-screen min-w-0">
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </div>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
