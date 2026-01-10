'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react'
import { api } from '../../lib/api'

export default function Footer() {
  const [footerData, setFooterData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFooterData()
  }, [])

  const fetchFooterData = async () => {
    try {
      const response = await api.get('/cms/footer')
      if (response.data.footer) {
        setFooterData(response.data.footer)
      }
    } catch (error) {
      console.error('Error fetching footer data:', error)
      // Use default data if API fails
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400"></div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center mb-6">
                <div className="h-16 w-16 flex items-center justify-center bg-white rounded-lg p-2">
                  <Image 
                    src={footerData?.logo || '/NovaKeys.png'} 
                    alt={footerData?.companyName || 'NOVA KEYS Real Estate'} 
                    width={56} 
                    height={56} 
                    className="object-contain"
                  />
                </div>
                <div className="ml-4">
                  <span className="text-2xl font-bold bg-gradient-to-r from-gold-400 to-gold-500 bg-clip-text text-transparent">
                    {footerData?.companyName || 'NOVA KEYS'}
                  </span>
                  <p className="text-sm text-gray-400">{footerData?.companyTagline || 'Real Estate'}</p>
                </div>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                {footerData?.description || 'Your trusted partner in finding the perfect property. We connect you with premium real estate opportunities and expert agents to make your property dreams come true.'}
              </p>
              <div className="flex space-x-3">
                {footerData?.socialMedia?.facebook && (
                  <a 
                    href={footerData.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {footerData?.socialMedia?.twitter && (
                  <a 
                    href={footerData.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {footerData?.socialMedia?.instagram && (
                  <a 
                    href={footerData.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {footerData?.socialMedia?.linkedin && (
                  <a 
                    href={footerData.socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {footerData?.socialMedia?.youtube && (
                  <a 
                    href={footerData.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
                {/* Fallback to default social links if no CMS data */}
                {!footerData?.socialMedia && (
                  <>
                    <a 
                      href="#" 
                      className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                      aria-label="Facebook"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                    <a 
                      href="#" 
                      className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                      aria-label="Twitter"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                    <a 
                      href="#" 
                      className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                    <a 
                      href="#" 
                      className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                    <a 
                      href="#" 
                      className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 hover:scale-110 transition-all"
                      aria-label="YouTube"
                    >
                      <Youtube className="h-5 w-5" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Properties for Sale */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Properties for Sale</h3>
              <ul className="space-y-3">
                {footerData?.saleLinks && footerData.saleLinks.filter(link => link.title && link.url).length > 0 ? (
                  footerData.saleLinks.filter(link => link.title && link.url).map((link, index) => (
                    <li key={index}>
                      <Link href={link.url} className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">{link.title}</span>
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li>
                      <Link href="/properties?listingType=sale&propertyType=apartment" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Apartments</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties?listingType=sale&propertyType=villa" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Villas</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties?listingType=sale&propertyType=house" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Houses</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties?listingType=sale&propertyType=townhouse" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Townhouses</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties?listingType=sale&propertyType=commercial" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Commercial</span>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Properties for Rent */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Properties for Rent</h3>
              <ul className="space-y-3">
                {footerData?.rentLinks && footerData.rentLinks.filter(link => link.title && link.url).length > 0 ? (
                  footerData.rentLinks.filter(link => link.title && link.url).map((link, index) => (
                    <li key={index}>
                      <Link href={link.url} className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">{link.title}</span>
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li>
                      <Link href="/properties?listingType=rent&propertyType=apartment" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Apartments</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties?listingType=rent&propertyType=villa" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Villas</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties?listingType=rent&propertyType=house" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Houses</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties?listingType=rent&propertyType=townhouse" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Townhouses</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties?listingType=rent&propertyType=commercial" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Commercial</span>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Quick Links & Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
              <ul className="space-y-3 mb-6">
                {footerData?.quickLinks && footerData.quickLinks.filter(link => link.title && link.url).length > 0 ? (
                  footerData.quickLinks.filter(link => link.title && link.url).map((link, index) => (
                    <li key={index}>
                      <Link href={link.url} className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">{link.title}</span>
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li>
                      <Link href="/home" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Home</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/properties" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Browse Properties</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/about" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/services" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Services</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/blog" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Blog</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="text-gray-400 hover:text-gold-400 transition-colors flex items-center group">
                        <span className="group-hover:translate-x-1 transition-transform">Contact</span>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
              
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-lg font-semibold mb-4 text-white">Contact</h3>
                <ul className="space-y-3">
                  {footerData?.phone && (
                    <li className="flex items-start text-gray-400">
                      <Phone className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gold-400" />
                      <a href={`tel:${footerData.phone}`} className="hover:text-gold-400 transition-colors">
                        {footerData.phone}
                      </a>
                    </li>
                  )}
                  {footerData?.email && (
                    <li className="flex items-start text-gray-400">
                      <Mail className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gold-400" />
                      <a href={`mailto:${footerData.email}`} className="hover:text-gold-400 transition-colors">
                        {footerData.email}
                      </a>
                    </li>
                  )}
                  {footerData?.address && (
                    <li className="flex items-start text-gray-400">
                      <MapPin className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gold-400" />
                      <span>{footerData.address}</span>
                    </li>
                  )}
                  {/* Fallback to default if no CMS data */}
                  {!footerData && (
                    <>
                      <li className="flex items-start text-gray-400">
                        <Phone className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gold-400" />
                        <a href="tel:+1234567890" className="hover:text-gold-400 transition-colors">
                          +1 (555) 123-4567
                        </a>
                      </li>
                      <li className="flex items-start text-gray-400">
                        <Mail className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gold-400" />
                        <a href="mailto:info@novakeys.com" className="hover:text-gold-400 transition-colors">
                          info@novakeys.com
                        </a>
                      </li>
                      <li className="flex items-start text-gray-400">
                        <MapPin className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gold-400" />
                        <span>123 Real Estate Ave, City, State 12345</span>
                      </li>
                    </>
                  )}
                </ul>
                <div className="mt-6">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center text-gold-400 hover:text-gold-300 font-medium transition-colors group"
                  >
                    <span>Agent Login</span>
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              {footerData ? (
                <>
                  <span>© 2026 NOVAKEYS RealEstate. All Rights Reserved. Design and Developed with ♥ Spireleap Innovations</span>
                  {footerData.additionalContent && (
                    <span> {footerData.additionalContent.replace(/\s*damsole\s*/gi, '').trim()}</span>
                  )}
                </>
              ) : (
                `© ${new Date().getFullYear()} NOVA KEYS Real Estate. All rights reserved.`
              )}
            </p>
            <div className="flex items-center space-x-6 text-sm">
              {footerData?.bottomLinks?.terms && (
                <Link href={footerData.bottomLinks.terms} className="text-gray-400 hover:text-gold-400 transition-colors">
                  Terms & Conditions
                </Link>
              )}
              {footerData?.bottomLinks?.privacy && (
                <Link href={footerData.bottomLinks.privacy} className="text-gray-400 hover:text-gold-400 transition-colors">
                  Privacy Policy
                </Link>
              )}
              {footerData?.bottomLinks?.support && (
                <Link href={footerData.bottomLinks.support} className="text-gray-400 hover:text-gold-400 transition-colors">
                  Support
                </Link>
              )}
              {/* Fallback to default if no CMS data */}
              {!footerData && (
                <>
                  <Link href="/about" className="text-gray-400 hover:text-gold-400 transition-colors">
                    Terms & Conditions
                  </Link>
                  <Link href="/about" className="text-gray-400 hover:text-gold-400 transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/contact" className="text-gray-400 hover:text-gold-400 transition-colors">
                    Support
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

