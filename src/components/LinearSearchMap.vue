<template>
  <div class="relative w-full h-full">
    <!-- Map Container -->
    <div ref="mapContainer" class="w-full h-full rounded-lg"></div>

    <!-- Display Mode Toggle -->
    <div class="absolute top-4 left-4 bg-black/50 backdrop-blur-lg rounded-lg p-2 z-[1000]">
      <div class="flex gap-1">
        <button @click="displayMode = 'dots'"
          :class="['px-3 py-1 rounded text-xs font-medium transition-all',
            displayMode === 'dots' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white']">
          Live Dots
        </button>
        <button @click="displayMode = 'heatmap'"
          :class="['px-3 py-1 rounded text-xs font-medium transition-all',
            displayMode === 'heatmap' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white']">
          Heat Map
        </button>
        <button @click="displayMode = 'clusters'"
          :class="['px-3 py-1 rounded text-xs font-medium transition-all',
            displayMode === 'clusters' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white']">
          Clusters
        </button>
      </div>
      <label class="flex items-center gap-2 mt-2">
        <input type="checkbox" v-model="showTrails" class="rounded">
        <span class="text-white text-xs">Show trails</span>
      </label>
    </div>

    <!-- Live Activity Display -->
    <div class="absolute top-4 right-4 bg-black/50 backdrop-blur-lg rounded-lg p-3 z-[1000]">
      <div class="text-white text-sm font-bold mb-2">Live Activity</div>
      <div class="space-y-1">
        <div class="text-white text-xs">
          <span class="text-green-400">●</span> {{ stats.active }} active
        </div>
        <div class="text-white text-xs">
          <span class="text-yellow-400">●</span> {{ stats.rate }}/min rate
        </div>
        <div class="text-white text-xs">
          <span class="text-blue-400">●</span> {{ stats.total }} total
        </div>
      </div>
      <div class="text-white/60 text-xs mt-2">
        Activity (last 10 min)
      </div>
      <div class="flex gap-px h-8 items-end mt-1">
        <div v-for="(count, i) in histogram" :key="i"
          class="flex-1 bg-green-500/50 rounded-t"
          :style="{ height: `${(count / maxHistogram) * 100}%` }">
        </div>
      </div>
    </div>

    <!-- Bottom Status -->
    <div class="absolute bottom-4 left-4 text-white/60 text-xs z-[1000]">
      Showing: {{ formattedTimeWindow }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  searches: any[]
  timeWindow: number // milliseconds to show
}>()

// Map references
const mapContainer = ref<HTMLElement>()
let map: L.Map | null = null
let markersLayer: L.LayerGroup | null = null
let heatmapLayer: L.LayerGroup | null = null
let trailsLayer: L.LayerGroup | null = null

// Display settings
const displayMode = ref<'dots' | 'heatmap' | 'clusters'>('dots')
const showTrails = ref(false)

// Map state - Use a compound key for uniqueness
const activeMarkers = new Map<string, { marker: L.CircleMarker, timestamp: number }>()
const markerPool: L.CircleMarker[] = [] // Reuse markers for performance

// Stats
const stats = ref({
  active: 0,
  rate: 0,
  total: 0
})

// Activity histogram (last 10 minutes in 1-minute buckets)
const histogram = ref<number[]>(new Array(10).fill(0))
const maxHistogram = computed(() => Math.max(...histogram.value, 1))

// Initialize map
onMounted(() => {
  console.log('🗺️ LinearSearchMap mounting...')
  if (!mapContainer.value) return

  // Create map
  map = L.map(mapContainer.value, {
    center: [39.8283, -98.5795], // Center of USA
    zoom: 4,
    preferCanvas: true, // Better performance
    zoomControl: true
  })

  // Dark theme tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map)

  // Create layers
  markersLayer = L.layerGroup().addTo(map)
  heatmapLayer = L.layerGroup()
  trailsLayer = L.layerGroup()

  console.log('🗺️ Map initialized')

  // Start update loop
  startUpdateLoop()
})

// Watch for new searches
watch(() => props.searches, (newSearches) => {
  console.log(`🗺️ Map received ${newSearches.length} searches`)
  if (!map || !markersLayer) {
    console.error('Map not initialized!')
    return
  }

  // Process based on display mode
  if (displayMode.value === 'dots') {
    updateDots(newSearches)
  } else if (displayMode.value === 'heatmap') {
    updateHeatmap(newSearches)
  } else if (displayMode.value === 'clusters') {
    updateClusters(newSearches)
  }

  // Update stats
  updateStats(newSearches)
  updateHistogram(newSearches)
}, { deep: true })

// Watch display mode changes
watch(displayMode, (newMode) => {
  clearAllLayers()

  // Switch layers
  if (newMode === 'dots' && markersLayer && map) {
    map.addLayer(markersLayer)
  } else if (newMode === 'heatmap' && heatmapLayer && map) {
    map.addLayer(heatmapLayer)
  }

  // Reprocess current searches
  if (props.searches.length > 0) {
    if (newMode === 'dots') {
      updateDots(props.searches)
    } else if (newMode === 'heatmap') {
      updateHeatmap(props.searches)
    }
  }
})

// Watch trails toggle
watch(showTrails, (show) => {
  if (!map || !trailsLayer) return

  if (show) {
    map.addLayer(trailsLayer)
  } else {
    map.removeLayer(trailsLayer)
    trailsLayer.clearLayers()
  }
})

// Update dots display
function updateDots(searches: any[]) {
  if (!markersLayer) return

  console.log(`🔵 Updating dots with ${searches.length} searches`)

  // For linear playback, we want to show ALL searches passed to us
  // The parent component manages the time window

  // First, get the latest timestamp from the searches to use as reference
  let latestTime = 0
  searches.forEach(s => {
    const t = new Date(s.timestamp).getTime()
    if (t > latestTime) latestTime = t
  })

  // If we have a latest time, use it as reference for the cutoff
  const cutoffTime = latestTime ? latestTime - props.timeWindow : 0

  console.log(`⏰ Time window: showing searches after ${new Date(cutoffTime).toLocaleTimeString()}`)

  // Remove expired markers based on the playback time
  activeMarkers.forEach((data, id) => {
    if (data.timestamp < cutoffTime) {
      // Return marker to pool for reuse
      data.marker.remove()
      markerPool.push(data.marker)
      activeMarkers.delete(id)
    }
  })

  // Add new searches
  searches.forEach(search => {
    // Validate search data
    if (!search.latitude || !search.longitude) {
      console.warn('Search missing lat/lng:', search)
      return
    }

    const searchTime = new Date(search.timestamp).getTime()

    // Only show if within time window (based on playback time)
    if (searchTime < cutoffTime) {
      console.log(`⏭️ Skipping old search from ${new Date(searchTime).toLocaleTimeString()}`)
      return
    }

    // Create unique key using qid and timestamp
    const uniqueKey = `${search.qid}_${search.timestamp}`

    // Skip if already on map
    if (activeMarkers.has(uniqueKey)) return

    // Get marker from pool or create new
    let marker = markerPool.pop()

    if (!marker) {
      // Create new marker
      marker = L.circleMarker([0, 0], {
        radius: 6,
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6
      })
    }

    // Configure marker
    const color = getColorForResult(search.num_found)
    marker.setLatLng([search.latitude, search.longitude])
    marker.setStyle({
      fillColor: color,
      color: color
    })

    // Add to map
    marker.addTo(markersLayer!)

    // Simple popup
    marker.bindPopup(`
      <div class="text-sm">
        <strong>${search.locality || 'Unknown'}</strong><br>
        ${search.administrative_area || ''}<br>
        ${search.num_found} results • ${search.radius_miles}mi
      </div>
    `)

    // Track it with unique key
    activeMarkers.set(uniqueKey, {
      marker,
      timestamp: searchTime
    })

    // Add trail if enabled
    if (showTrails.value && trailsLayer) {
      addTrail(search)
    }

    // Animate entrance
    animateMarkerEntrance(marker)
  })

  stats.value.active = activeMarkers.size
  console.log(`🔵 Active markers: ${activeMarkers.size}`)
}

// Add trail effect
function addTrail(search: any) {
  if (!trailsLayer) return

  const color = getColorForResult(search.num_found)

  // Create expanding circle
  const trail = L.circle([search.latitude, search.longitude], {
    radius: 100,
    fillColor: color,
    fillOpacity: 0.3,
    stroke: false
  }).addTo(trailsLayer)

  // Animate expansion and fade
  let radius = 100
  let opacity = 0.3

  const animate = setInterval(() => {
    radius += 50
    opacity -= 0.03

    if (opacity <= 0) {
      trail.remove()
      clearInterval(animate)
    } else {
      trail.setRadius(radius)
      trail.setStyle({ fillOpacity: opacity })
    }
  }, 100)
}

// Update heatmap display
function updateHeatmap(searches: any[]) {
  if (!heatmapLayer) return

  heatmapLayer.clearLayers()

  const now = Date.now()
  const cutoffTime = now - props.timeWindow

  // Filter to time window
  const recentSearches = searches.filter(s => {
    const searchTime = new Date(s.timestamp).getTime()
    return searchTime > cutoffTime && s.latitude && s.longitude
  })

  // Create heat points
  recentSearches.forEach(search => {
    const intensity = search.num_found === 0 ? 0.8 : 0.4
    const color = getColorForResult(search.num_found)

    L.circle([search.latitude, search.longitude], {
      radius: 5000, // 5km radius
      fillColor: color,
      fillOpacity: intensity * 0.3,
      stroke: false
    }).addTo(heatmapLayer)
  })
}

// Update clusters display
function updateClusters(searches: any[]) {
  // For now, just use dots
  // Could implement actual clustering with leaflet.markercluster
  updateDots(searches)
}

// Animate marker entrance
function animateMarkerEntrance(marker: L.CircleMarker) {
  // Start small and grow
  marker.setRadius(2)

  let radius = 2
  const targetRadius = 6

  const grow = setInterval(() => {
    radius += 0.5
    if (radius >= targetRadius) {
      radius = targetRadius
      clearInterval(grow)
    }
    marker.setRadius(radius)
  }, 20)
}

// Update statistics
function updateStats(searches: any[]) {
  const now = Date.now()
  const oneMinuteAgo = now - 60000

  // Calculate rate
  const recentSearches = searches.filter(s => {
    const searchTime = new Date(s.timestamp).getTime()
    return searchTime > oneMinuteAgo
  })

  stats.value.rate = recentSearches.length
  stats.value.total = searches.length
}

// Update histogram
function updateHistogram(searches: any[]) {
  const now = Date.now()
  const buckets = new Array(10).fill(0)

  searches.forEach(search => {
    const age = now - new Date(search.timestamp).getTime()
    const bucketIndex = Math.floor(age / 60000) // Which minute bucket

    if (bucketIndex >= 0 && bucketIndex < 10) {
      buckets[9 - bucketIndex]++ // Reverse so newest is on right
    }
  })

  histogram.value = buckets
}

// Periodic cleanup and updates
let updateInterval: number | null = null

function startUpdateLoop() {
  updateInterval = window.setInterval(() => {
    // Remove expired markers
    if (displayMode.value === 'dots' && props.searches.length > 0) {
      // Get the latest timestamp from current searches
      let latestTime = 0
      props.searches.forEach(s => {
        const t = new Date(s.timestamp).getTime()
        if (t > latestTime) latestTime = t
      })

      const cutoffTime = latestTime - props.timeWindow

      activeMarkers.forEach((data, id) => {
        if (data.timestamp < cutoffTime) {
          // Fade out before removing
          const marker = data.marker
          marker.setStyle({ opacity: 0.3, fillOpacity: 0.1 })

          setTimeout(() => {
            marker.remove()
            markerPool.push(marker)
            activeMarkers.delete(id)
          }, 500)
        }
      })

      stats.value.active = activeMarkers.size
    }
  }, 1000) // Update every second
}

// Clear all layers
function clearAllLayers() {
  markersLayer?.clearLayers()
  heatmapLayer?.clearLayers()
  trailsLayer?.clearLayers()
  activeMarkers.clear()
  stats.value.active = 0
}

// Public method to clear map
function clearMap() {
  clearAllLayers()
  stats.value = { active: 0, rate: 0, total: 0 }
  histogram.value = new Array(10).fill(0)
}

// Get color based on search results
function getColorForResult(numFound: number): string {
  if (numFound === 0) return '#ef4444' // red
  if (numFound <= 3) return '#f59e0b' // yellow
  return '#10b981' // green
}

// Format time window
const formattedTimeWindow = computed(() => {
  const minutes = Math.floor(props.timeWindow / 60000)
  if (minutes < 60) return `Last ${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  return `Last ${hours} hour${hours > 1 ? 's' : ''}`
})

// Expose methods
defineExpose({
  clearMap
})

// Cleanup
onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  activeMarkers.forEach(data => data.marker.remove())
  activeMarkers.clear()
  if (map) {
    map.remove()
  }
})
</script>

<style>
/* Smooth animations */
.leaflet-marker-icon {
  transition: all 0.3s ease;
}

/* Pulse animation for new markers */
@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.marker-pulse {
  animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}
</style>