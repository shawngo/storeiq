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
watch(() => props.currentSearches, (newSearches) => {
  if (!map || !pingLayer) return

  // Add new pings
  newSearches.forEach(search => {
    // Check if we should show this type
    const shouldShow =
      (props.showSuccess && search.num_found > 3) ||
      (props.showLimited && search.num_found > 0 && search.num_found <= 3) ||
      (props.showNoResults && search.num_found === 0)

    if (!shouldShow) return

    addPing(search)
  })
}, { deep: true })

function addPing(search: any) {
  if (!map || !pingLayer) return

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

  // Create the ping with ripple effect
  const ping = L.circleMarker([search.latitude, search.longitude], {
    radius: 8,
    fillColor: color,
    color: color,
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.6,
    className: 'search-ping'
  }).addTo(pingLayer)

  // Add ripple animation via CSS class
  const pingElement = ping.getElement()
  if (pingElement) {
    pingElement.style.animation = 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
  }

  // Popup content
  const popupContent = `
    <div class="bg-gray-900 text-white p-2 rounded">
      <div class="font-bold text-sm">${search.locality || 'Unknown'}, ${search.administrative_area || search.country}</div>
      <div class="text-xs text-gray-400 mt-1">
        <div>Radius: ${search.radius_miles}mi</div>
        <div>Results: ${search.num_found === 0 ? 'None' : search.num_found}</div>
        <div>IP: <a href="https://ipinfo.io/${search.ip_address}" target="_blank" class="text-blue-400 hover:text-blue-300">${search.ip_address}</a></div>
      </div>
    </div>
  `

  ping.bindPopup(popupContent, {
    className: 'custom-popup',
    closeButton: false
  })


  if (!props.persistPings) {
    // Remove after 5 seconds
    const timeout = setTimeout(() => {
      if (pingLayer && ping) {
        pingLayer.removeLayer(ping)
        activePings.delete(pingKey)
        counters[category]--
        counters.total--
      }
    }, 5000)

    activePings.set(pingKey, { marker: ping, timeout })
  } else {
    // If persisting, shrink the marker after initial display
    setTimeout(() => {
      ping.setRadius(4) // Shrink to half size
      ping.setStyle({
        opacity: 0.6,
        fillOpacity: 0.4
      })
    }, 3000)
  }


  // Generate unique key for this ping
  const pingKey = `${search.qid}-${Date.now()}`

  // Auto-remove after a few seconds (unless persist is on)
  if (!props.persistPings) {
    const timeout = setTimeout(() => {
      if (pingLayer && ping) {
        pingLayer.removeLayer(ping)
        activePings.delete(pingKey)

        // Decrement counters
        counters[category]--
        counters.total--
      }
    }, 5000) // Remove after 5 seconds

    activePings.set(pingKey, { marker: ping, timeout })
  }

  // Also add a radius circle to show search area (subtle)
  const radiusCircle = L.circle([search.latitude, search.longitude], {
    radius: search.radius_miles * 1609.34, // Convert miles to meters
    fillColor: color,
    color: color,
    weight: 1,
    opacity: 0.2,
    fillOpacity: 0.05
  }).addTo(pingLayer)

  // Remove radius circle quickly
  setTimeout(() => {
    if (pingLayer && radiusCircle) {
      pingLayer.removeLayer(radiusCircle)
    }
  }, 2000)
}

// Reset counters every 30 seconds
const counterInterval = setInterval(() => {
  counters.successful = 0
  counters.limited = 0
  counters.failed = 0
  counters.total = 0
}, 30000)

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