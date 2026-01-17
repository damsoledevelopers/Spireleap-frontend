'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import {
  FileText,
  Image,
  Tag,
  Home,
  Star,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Phone,
  Layout,
  Mail,
  Code
} from 'lucide-react'
import toast from 'react-hot-toast'
import BlogManagement from '../../../components/CMS/BlogManagement'
import PageManagement from '../../../components/CMS/PageManagement'
import BannerManagement from '../../../components/CMS/BannerManagement'
import CategoryManagement from '../../../components/CMS/CategoryManagement'
import AmenityManagement from '../../../components/CMS/AmenityManagement'
import TestimonialManagement from '../../../components/CMS/TestimonialManagement'
import HomepageContentManagement from '../../../components/CMS/HomepageContentManagement'
import AboutUsManagement from '../../../components/CMS/AboutUsManagement'
import ContactUsManagement from '../../../components/CMS/ContactUsManagement'
import FooterManagement from '../../../components/CMS/FooterManagement'
import EmailTemplateManagement from '../../../components/CMS/EmailTemplateManagement'
import ScriptManagement from '../../../components/CMS/ScriptManagement'

const tabs = [
  { id: 'homepage', name: 'Homepage', icon: Home },
  { id: 'blogs', name: 'Blogs', icon: FileText },
  { id: 'pages', name: 'Pages', icon: FileText },
  { id: 'banners', name: 'Banners', icon: Image },
  { id: 'categories', name: 'Categories', icon: Tag },
  { id: 'amenities', name: 'Amenities', icon: Home },
  { id: 'testimonials', name: 'Testimonials', icon: Star },
  { id: 'about', name: 'About Us', icon: Users },
  { id: 'contact', name: 'Contact Us', icon: Phone },
  { id: 'footer', name: 'Footer', icon: Layout },
  { id: 'email-templates', name: 'Email Templates', icon: Mail },
  { id: 'scripts', name: 'Scripts', icon: Code },
]

export function CMSManagementPageContent() {
  const { user, checkPermission } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('homepage')

  // Dynamic Permission Flags
  const canViewCMS = checkPermission('cms', 'view')

  // Page access check
  useEffect(() => {
    if (user && !canViewCMS) {
      toast.error('You do not have permission to access CMS')
      router.push('/admin/dashboard')
    }
  }, [user, canViewCMS, router])

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Content Management System</h1>
          <p className="text-gray-600 mt-2">Manage your website content, blogs, pages, and more</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                    ${activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'homepage' && <HomepageContentManagement />}
          {activeTab === 'blogs' && <BlogManagement />}
          {activeTab === 'pages' && <PageManagement />}
          {activeTab === 'banners' && <BannerManagement />}
          {activeTab === 'categories' && <CategoryManagement />}
          {activeTab === 'amenities' && <AmenityManagement />}
          {activeTab === 'testimonials' && <TestimonialManagement />}
          {activeTab === 'about' && <AboutUsManagement />}
          {activeTab === 'contact' && <ContactUsManagement />}
          {activeTab === 'footer' && <FooterManagement />}
          {activeTab === 'email-templates' && <EmailTemplateManagement />}
          {activeTab === 'scripts' && <ScriptManagement />}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function CMSManagementPage() {
  return <CMSManagementPageContent />
}

