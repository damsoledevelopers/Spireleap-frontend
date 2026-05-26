'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="h-screen flex overflow-hidden bg-logo-beige">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex flex-col w-0 flex-1 min-w-0 overflow-hidden">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 relative min-w-0 overflow-y-auto focus:outline-none">
          <div className="py-6 overflow-visible">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 min-w-0 overflow-visible">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
