'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Navigation } from 'lucide-react'

interface MapPickerProps {
  lat: number
  lng: number
  onMove: (lat: number, lng: number, address: string) => void
}

export default function MapPicker({ lat, lng, onMove }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`,
        { headers: { 'Accept-Language': 'th' } }
      )
      const data = await res.json()
      return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  }

  async function searchAddress() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=th`,
        { headers: { 'Accept-Language': 'th' } }
      )
      const results = await res.json()
      if (results.length > 0) {
        const { lat: newLat, lon: newLng, display_name } = results[0]
        const la = parseFloat(newLat)
        const ln = parseFloat(newLng)
        markerRef.current?.setLatLng([la, ln])
        mapRef.current?.setView([la, ln], 16)
        onMove(la, ln, display_name)
      }
    } finally {
      setSearching(false)
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const la = pos.coords.latitude
        const ln = pos.coords.longitude
        markerRef.current?.setLatLng([la, ln])
        mapRef.current?.setView([la, ln], 16)
        const address = await reverseGeocode(la, ln)
        onMove(la, ln, address)
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if ((containerRef.current as any)._leaflet_id) return

    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!).setView([lat, lng], 13)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', async () => {
        const pos = marker.getLatLng()
        const address = await reverseGeocode(pos.lat, pos.lng)
        onMove(pos.lat, pos.lng, address)
      })

      map.on('click', async (e: any) => {
        marker.setLatLng(e.latlng)
        const address = await reverseGeocode(e.latlng.lat, e.latlng.lng)
        onMove(e.latlng.lat, e.latlng.lng, address)
      })
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    markerRef.current.setLatLng([lat, lng])
    mapRef.current.setView([lat, lng], 15)
  }, [lat, lng])

  return (
    <div className="space-y-2">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border-2 px-3" style={{ borderColor: '#e8c4c4', background: 'white' }}>
          <Search size={16} style={{ color: '#7a4a4b' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchAddress()}
            placeholder="ค้นหาที่อยู่..."
            className="flex-1 py-2.5 text-sm font-medium bg-transparent"
            style={{ color: '#4a2728' }}
          />
        </div>
        <button
          type="button"
          onClick={searchAddress}
          disabled={searching}
          className="px-3 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: '#4a2728', color: '#f2dada' }}
        >
          {searching ? '...' : 'หา'}
        </button>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          title="ใช้ตำแหน่งปัจจุบัน"
          className="px-3 rounded-xl disabled:opacity-50"
          style={{ background: '#f2dada', color: '#4a2728' }}
        >
          <Navigation size={16} className={locating ? 'animate-pulse' : ''} />
        </button>
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        style={{ height: '240px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e8c4c4' }}
      />
      <p className="text-xs" style={{ color: '#7a4a4b' }}>
        ลากหมุดหรือแตะบนแผนที่เพื่อปรับตำแหน่ง
      </p>
    </div>
  )
}
