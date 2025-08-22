<template>
  <div class="relative w-full h-full">
    <div ref="mapContainer" class="w-full h-full rounded-lg"></div>

    <!-- Live Activity Counter Overlay -->
    <div class="absolute top-4 right-4 bg-black/50 backdrop-blur-lg rounded-lg p-3 z-[1000]">
      <div class="text-white text-sm font-bold mb-2">Live Activity</div>
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-green-500 rounded-full"></div>
          <span class="text-green-400 text-xs">{{ counters.successful }} successful</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span class="text-yellow-400 text-xs">{{ counters.limited }} limited</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-red-500 rounded-full"></div>
          <span class="text-red-400 text-xs">{{ counters.failed }} failed</span>
        </div>
        <div class="text-gray-400 text-xs mt-2">
          {{ counters.total }} searches in last 30s
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, reactive } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  currentSearches: any[]
  persistPings: boolean
  showSuccess: boolean
  showLimited: boolean
  showNoResults: boolean
}>()

const mapContainer = ref<HTMLElement>()
let map: L.Map | null = null
let pingLayer: L.LayerGroup | null = null

// Counters for live activity
const counters = reactive({
  successful: 0,
  limited: 0,
  failed: 0,
  total: 0
})

const MAX_ACTIVE_MARKERS = 200  // Limit total markers on map
const MAX_PERSIST_MARKERS = 500  // Higher limit for persist mode

// Track all markers (not just for timeout)
const allMarkers = new Set<L.CircleMarker>()

// Track active pings for cleanup
const activePings = new Map<string, { marker: L.CircleMarker, timeout: number }>()


onMounted(() => {
  if (!mapContainer.value) return

  // Initialize map centered on USA
  map = L.map(mapContainer.value, {
    center: [39.8283, -98.5795],
    zoom: 4,
    preferCanvas: true // Better performance for many markers
  })

  // Dark tile layer to match our theme
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map)

  // Create layer group for pings
  pingLayer = L.layerGroup().addTo(map)
})

// Watch for new searches
watch(() => props.currentSearches.length, (newLength, oldLength) => {
  console.log(`📍 SearchMap watch triggered: ${oldLength} -> ${newLength} searches`)

  if (!map || !pingLayer) {
    console.error('❌ Map or pingLayer not initialized!')
    return
  }

  if (newLength <= oldLength) {
    console.log('⚠️ No new searches to add (newLength <= oldLength)')
    return
  }

  // Only process NEW searches (ones added since last check)
  const newSearches = props.currentSearches.slice(oldLength)
  console.log(`🆕 Processing ${newSearches.length} new searches`)
  console.log(`📊 Current marker count: ${allMarkers.size}`)

  newSearches.forEach((search, index) => {
    const shouldShow =
      (props.showSuccess && search.num_found > 3) ||
      (props.showLimited && search.num_found > 0 && search.num_found <= 3) ||
      (props.showNoResults && search.num_found === 0)

    if (!shouldShow) {
      console.log(`⏭️ Skipping search ${index} - filtered out`)
      return
    }

    // Add a small delay to prevent overwhelming the map
    setTimeout(() => {
      console.log(`➕ Adding ping for ${search.locality || 'Unknown'} (${search.latitude}, ${search.longitude})`)
      addPing(search)
    }, Math.random() * 100)

    // Log final state
    setTimeout(() => {
      console.log(`📍 After processing: ${allMarkers.size} total markers on map`)
    }, 500)

  })
})

function addPing(search: any) {
  if (!map || !pingLayer) {
    console.error('❌ Cannot add ping - map not ready')
    return
  }

  // Check if we've hit the limit
  const currentLimit = props.persistPings ? MAX_PERSIST_MARKERS : MAX_ACTIVE_MARKERS
  console.log(`🎯 Adding ping. Current: ${allMarkers.size}/${currentLimit}`)

  if (allMarkers.size >= currentLimit) {
    // Remove oldest markers to make room
    const markersToRemove = Math.floor(currentLimit * 0.2) // Remove 20% of oldest
    console.log(`🧹 Cleaning up ${markersToRemove} old markers`)

    const markers = Array.from(allMarkers)
    for (let i = 0; i < markersToRemove && i < markers.length; i++) {
      const oldMarker = markers[i]
      if (pingLayer && oldMarker) {
        pingLayer.removeLayer(oldMarker)
        allMarkers.delete(oldMarker)
      }
    }

    console.log(`🧹 Cleaned up ${markersToRemove} old markers`)
    console.log(`✅ Cleanup done. Now have ${allMarkers.size} markers`)
  }

  // Determine color based on results
  let color = '#10b981' // green
  let category = 'successful'
  if (search.num_found === 0) {
    color = '#ef4444' // red
    category = 'failed'
  } else if (search.num_found <= 3) {
    color = '#f59e0b' // yellow
    category = 'limited'
  }

  // Update counters
  counters[category]++
  counters.total++

  // Create the ping
  const ping = L.circleMarker([search.latitude, search.longitude], {
    radius: 8,
    fillColor: color,
    color: color,
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.6
  }).addTo(pingLayer)

  // Track this marker
  allMarkers.add(ping)

  // Popup content (simplified to reduce memory)
  const popupContent = `
    <div class="bg-gray-900 text-white p-2 rounded">
      <div class="font-bold text-sm">
        ${search.locality || 'Unknown'}${search.administrative_area ? ', ' + search.administrative_area : ''}
      </div>
      <div class="text-xs mt-1">Results: ${search.num_found !== undefined ? search.num_found : 'N/A'}</div>
    </div>
  `

  ping.bindPopup(popupContent, {
    className: 'custom-popup',
    closeButton: false
  })

  // Handle removal/persistence
  if (!props.persistPings) {
    setTimeout(() => {
      if (pingLayer && ping) {
        pingLayer.removeLayer(ping)
        allMarkers.delete(ping)
        counters[category]--
        counters.total--
      }
    }, 5000)
  } else {
    // Shrink persistent markers
    setTimeout(() => {
      ping.setRadius(4)
      ping.setStyle({
        opacity: 0.6,
        fillOpacity: 0.4
      })
    }, 3000)
  }

  // Skip radius circles for now (they add too many layers)
  // Or make them very temporary
  if (Math.random() < 0.1) { // Only show radius for 10% of searches
    const radiusCircle = L.circle([search.latitude, search.longitude], {
      radius: search.radius_miles * 1609.34,
      fillColor: color,
      color: color,
      weight: 1,
      opacity: 0.1,
      fillOpacity: 0.02
    }).addTo(pingLayer)

    setTimeout(() => {
      if (pingLayer && radiusCircle) {
        pingLayer.removeLayer(radiusCircle)
      }
    }, 1000) // Remove quickly
  }
}

// Reset counters every 30 seconds
const counterInterval = setInterval(() => {
  counters.successful = 0
  counters.limited = 0
  counters.failed = 0
  counters.total = 0
}, 30000)

const clearAllMarkers = () => {
  if (pingLayer) {
    pingLayer.clearLayers()
  }
  allMarkers.clear()
  counters.successful = 0
  counters.limited = 0
  counters.failed = 0
  counters.total = 0
  console.log('🗑️ Cleared all markers')
}

// Expose the clear method for parent component
defineExpose({
  clearAllMarkers
})


onUnmounted(() => {
  // Clean up
  clearInterval(counterInterval)
  activePings.forEach(({ timeout }) => clearTimeout(timeout))
  if (map) {
    map.remove()
  }
})
</script>

<style>
/* Ripple animation */
@keyframes ping {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.search-ping {
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* Custom popup styling */
.custom-popup .leaflet-popup-content-wrapper {
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.custom-popup .leaflet-popup-tip {
  background: rgba(17, 24, 39, 0.95);
  border: 1px solid rgba(75, 85, 99, 0.5);
}

.custom-popup .leaflet-popup-content {
  margin: 0;
  min-width: 200px;
}
</style>