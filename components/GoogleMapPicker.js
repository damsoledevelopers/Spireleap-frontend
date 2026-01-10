'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'

export default function GoogleMapPicker({ lat, lng, onLocationSelect }) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [coordinates, setCoordinates] = useState({ lat: lat || 0, lng: lng || 0 })
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      setMapLoaded(true)
      initializeMap()
    } else {
      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.warn('Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.')
        setMapLoaded(false)
        return
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setMapLoaded(true)
          initializeMap()
        })
        return
      }

      // Load Google Maps script
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setMapLoaded(true)
        initializeMap()
      }
      script.onerror = () => {
        console.error('Failed to load Google Maps script. Please check your API key.')
        setMapLoaded(false)
      }
      document.head.appendChild(script)
    }
  }, [])

  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current && (lat !== coordinates.lat || lng !== coordinates.lng)) {
      setCoordinates({ lat, lng })
      if (lat && lng) {
        mapInstanceRef.current.setCenter({ lat, lng })
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng })
        }
      }
    }
  }, [lat, lng, mapLoaded])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return

    const center = coordinates.lat && coordinates.lng 
      ? { lat: coordinates.lat, lng: coordinates.lng }
      : { lat: 25.7617, lng: -80.1918 } // Default to Miami

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true
    })

    mapInstanceRef.current = map

    // Add marker
    const marker = new window.google.maps.Marker({
      position: center,
      map: map,
      draggable: true,
      title: 'Property Location'
    })

    markerRef.current = marker

    // Handle marker drag
    marker.addListener('dragend', () => {
      const position = marker.getPosition()
      const newCoords = {
        lat: position.lat(),
        lng: position.lng()
      }
      setCoordinates(newCoords)
      onLocationSelect(newCoords.lat, newCoords.lng, '')
    })

    // Handle map click
    map.addListener('click', (e) => {
      const newCoords = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      }
      setCoordinates(newCoords)
      marker.setPosition(newCoords)
      onLocationSelect(newCoords.lat, newCoords.lng, '')
    })

    // Geocoder for address lookup
    const geocoder = new window.google.maps.Geocoder()
    
    // Search box
    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Search for address...'
    input.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg mb-2'
    
    const searchBox = new window.google.maps.places.SearchBox(input)
    map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(input)

    searchBox.addListener('places_changed', () => {
      const places = searchBox.getPlaces()
      if (places.length === 0) return

      const place = places[0]
      if (!place.geometry) return

      const newCoords = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      }
      
      setCoordinates(newCoords)
      map.setCenter(newCoords)
      marker.setPosition(newCoords)
      onLocationSelect(newCoords.lat, newCoords.lng, place.formatted_address)
    })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="w-full h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center p-4">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium mb-1">Google Maps API Key Required</p>
          <p className="text-sm text-gray-500">
            Please set <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your .env file
          </p>
          <p className="text-xs text-gray-400 mt-2">
            You can get an API key from{' '}
            <a 
              href="https://console.cloud.google.com/google/maps-apis" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Google Cloud Console
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (!mapLoaded) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-lg border border-gray-300" 
        style={{ minHeight: '256px' }}
      />
      {coordinates.lat && coordinates.lng && (
        <div className="text-sm text-gray-600">
          Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
        </div>
      )}
    </div>
  )
}

