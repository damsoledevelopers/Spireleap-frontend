'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PropertyComparison from '../../../components/Property/PropertyComparison'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'

export default function ComparePropertiesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [propertyIds, setPropertyIds] = useState([])

  useEffect(() => {
    const ids = searchParams.get('ids')
    if (ids) {
      setPropertyIds(ids.split(',').filter(Boolean))
    }
  }, [searchParams])

  const handleClose = () => {
    router.push('/properties')
  }

  return (
    <DashboardLayout>
      <PropertyComparison propertyIds={propertyIds} onClose={handleClose} />
    </DashboardLayout>
  )
}

