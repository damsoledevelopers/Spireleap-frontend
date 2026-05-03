'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getDropdownOptions } from '../lib/dropdownsApi'

const CurrencyContext = createContext(null)

const STORAGE_KEY = 'spireleap:selectedCurrency'
const DEFAULT_CURRENCY = 'USD'

export function CurrencyProvider({ children }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState(DEFAULT_CURRENCY)
  const [currencies, setCurrencies] = useState([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSelectedCurrencyState(saved)
    } catch (_) {
      // ignore storage issues
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const opts = await getDropdownOptions()
        const list = Array.isArray(opts?.currencies) ? opts.currencies : []
        const normalized = list
          .map((c) => String(c || '').trim().toUpperCase())
          .filter(Boolean)
        if (!mounted) return
        setCurrencies(normalized)

        // Ensure selected currency is valid
        setSelectedCurrencyState((prev) => {
          const next = String(prev || '').trim().toUpperCase() || DEFAULT_CURRENCY
          if (normalized.length > 0 && !normalized.includes(next)) return normalized[0]
          return next
        })
      } catch (e) {
        // keep defaults if dropdown-options fails
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const setSelectedCurrency = (code) => {
    const next = String(code || '').trim().toUpperCase()
    setSelectedCurrencyState(next || DEFAULT_CURRENCY)
    try {
      localStorage.setItem(STORAGE_KEY, next || DEFAULT_CURRENCY)
    } catch (_) {
      // ignore
    }
  }

  const value = useMemo(
    () => ({
      selectedCurrency,
      setSelectedCurrency,
      currencies
    }),
    [selectedCurrency, currencies]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    return {
      selectedCurrency: DEFAULT_CURRENCY,
      setSelectedCurrency: () => {},
      currencies: []
    }
  }
  return ctx
}

