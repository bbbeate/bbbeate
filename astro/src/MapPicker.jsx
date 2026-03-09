import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [59.91, 10.75]
const DEFAULT_ZOOM = 4

export default function MapPicker({ lat, lng, onChange }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const containerRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const center = lat && lng ? [parseFloat(lat), parseFloat(lng)] : DEFAULT_CENTER
  const hasPosition = lat && lng && !isNaN(parseFloat(lat))

  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, {
      center: hasPosition ? center : DEFAULT_CENTER,
      zoom: hasPosition ? 8 : DEFAULT_ZOOM,
      attributionControl: false,
    })
    L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png').addTo(map)

    if (hasPosition) {
      markerRef.current = L.circleMarker(center, {
        radius: 6, color: 'var(--first)', fillOpacity: 0.8,
      }).addTo(map)
    }

    map.on('click', async (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng)
      } else {
        markerRef.current = L.circleMarker(e.latlng, {
          radius: 6, color: 'var(--first)', fillOpacity: 0.8,
        }).addTo(map)
      }

      let tz = 'UTC'
      try {
        const res = await fetch(
          `https://timeapi.io/api/timezone/coordinate?latitude=${clickLat}&longitude=${clickLng}`
        )
        if (res.ok) {
          const data = await res.json()
          tz = data.timeZone || 'UTC'
        }
      } catch {}

      onChangeRef.current(clickLat.toFixed(2), clickLng.toFixed(2), tz)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="map-picker" />
}
