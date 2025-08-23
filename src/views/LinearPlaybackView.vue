<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-white mb-2">Linear Time Playback Analysis</h2>
    </div>

    <!-- Playback Controls -->
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-white/60 text-sm">From:</label>
            <input type="date" v-model="startDate"
              class="bg-white/10 text-white px-3 py-1 rounded-lg border border-white/20 focus:border-white/40">
          </div>
          <div class="flex items-center gap-2">
            <label class="text-white/60 text-sm">To:</label>
            <input type="date" v-model="endDate"
              class="bg-white/10 text-white px-3 py-1 rounded-lg border border-white/20 focus:border-white/40">
          </div>
          <!-- Show data status -->
          <div class="text-white/60 text-sm ml-4">
            <span v-if="store.loading">Loading...</span>
            <span v-else>{{ store.searches.length.toLocaleString() }} searches loaded</span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <select v-model="playbackSpeed"
            class="bg-white/10 text-white px-4 py-2 rounded-lg">
            <option :value="1">1x speed (real-time)</option>
            <option :value="2">2x speed</option>
            <option :value="5">5x speed</option>
            <option :value="10">10x speed</option>
            <option :value="60">1 min/sec</option>
            <option :value="300">5 min/sec</option>
            <option :value="1800">30 min/sec</option>
            <option :value="3600">1 hour/sec</option>
            <option :value="86400">1 day/sec</option>
          </select>

          <button @click="togglePlayback"
            class="px-6 py-2 rounded-lg font-medium transition-all"
            :class="isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'">
            {{ isPlaying ? '⏸ PAUSE' : '▶ PLAY' }}
          </button>

          <button @click="resetPlayback"
            class="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all">
            ⟲ Reset
          </button>
        </div>
      </div>

      <!-- Timeline Progress -->
      <div class="relative">
        <input type="range" min="0" max="100" :value="timelineProgress"
          @input="scrubTimeline"
          class="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer">
        <div class="flex justify-between text-xs text-white/60 mt-1">
          <span>{{ formatTime(startPlaybackTime) }}</span>
          <span>{{ formatTime(currentPlaybackTime) }}</span>
          <span>{{ formatTime(endPlaybackTime) }}</span>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white/10 backdrop-blur-lg rounded-xl p-4">
        <div class="text-4xl font-bold text-white">
          {{ currentTimeDisplay }}
        </div>
        <div class="text-white/60 text-sm">Current Time</div>
      </div>

      <div class="bg-white/10 backdrop-blur-lg rounded-xl p-4">
        <div class="text-4xl font-bold text-green-400">
          {{ searchesInLastMinute }}
        </div>
        <div class="text-white/60 text-sm">Searches/min</div>
      </div>

      <div class="bg-white/10 backdrop-blur-lg rounded-xl p-4">
        <div class="text-4xl font-bold text-yellow-400">
          {{ peakHour }}
        </div>
        <div class="text-white/60 text-sm">Peak Hour</div>
      </div>

      <div class="bg-white/10 backdrop-blur-lg rounded-xl p-4">
        <div class="text-4xl font-bold text-blue-400">
          {{ totalProcessed }}
        </div>
        <div class="text-white/60 text-sm">Total Shown</div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-3 gap-6">
      <!-- Map (2 columns) -->
      <div class="col-span-2">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 h-[800px]">
          <h3 class="text-xl font-bold text-white mb-4">
            Geographic Activity
            <span class="text-sm font-normal text-white/60 ml-2">
              (showing last {{ mapTimeWindow }} minutes)
            </span>
          </h3>
          <LinearSearchMap ref="mapRef"
            :searches="visibleSearches"
            :time-window="mapTimeWindow * 60 * 1000" />
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="col-span-1">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 h-[800px]">
          <h3 class="text-xl font-bold text-white mb-4">Activity Feed</h3>

          <!-- Hourly Stats -->
          <div class="mb-4 p-3 bg-white/5 rounded-lg">
            <div class="text-xs text-white/60 mb-2">Last Hour Breakdown</div>
            <div class="space-y-1">
              <div class="flex justify-between text-sm">
                <span class="text-green-400">Found Stores:</span>
                <span class="text-white">{{ hourlyStats.found }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-yellow-400">Limited Results:</span>
                <span class="text-white">{{ hourlyStats.limited }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-red-400">No Results:</span>
                <span class="text-white">{{ hourlyStats.failed }}</span>
              </div>
            </div>
          </div>

          <!-- Recent Searches -->
          <div class="space-y-2 overflow-y-auto h-[575px]">
            <div v-for="search in recentSearches" :key="search.qid"
              class="bg-white/5 rounded-lg p-2 text-sm">
              <div class="text-white/60 text-xs">
                {{ formatTimestamp(search.timestamp) }}
              </div>
              <div class="text-white">
                {{ search.locality || 'Unknown' }}, {{ search.administrative_area }}
              </div>
              <div class="text-xs" :class="getResultClass(search.num_found)">
                {{ search.num_found }} results • {{ search.radius_miles }}mi
              </div>
              <!-- Add IP address link -->
              <a v-if="search.ip_address"
                :href="`https://ipinfo.io/${search.ip_address}`"
                target="_blank"
                class="text-xs text-purple-400 hover:text-yellow-400 transition-colors">
                IP: {{ search.ip_address }} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Debug Info -->
    <div v-if="showDebug" class="mt-4 p-4 bg-black/50 rounded-lg text-white/60 text-xs">
      <div>Searches loaded: {{ store.searches.length }}</div>
      <div>Time slots indexed: {{ searchesBySecond.size }}</div>
      <div>Visible searches on map: {{ visibleSearches.length }}</div>
      <div>Current time: {{ currentPlaybackTime?.toISOString() }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePlaybackStore } from '../stores/playback'
import LinearSearchMap from '../components/LinearSearchMap.vue'

const store = usePlaybackStore()
const mapRef = ref()

// Debug mode
const showDebug = ref(true)

// Playback state
const startDate = ref('2023-09-12')
const endDate = ref('2025-12-31')

const playbackSpeed = ref(3600) // Default: 1 hour per second
const isPlaying = ref(false)
const mapTimeWindow = ref(5) // Show last 5 minutes of searches on map

// Timeline state
const startPlaybackTime = ref<Date | null>(null)
const endPlaybackTime = ref<Date | null>(null)
const currentPlaybackTime = ref<Date | null>(null)
const timelineProgress = ref(0)

// Indexed data structure for efficient time-based lookup
const searchesBySecond = ref<Map<number, any[]>>(new Map())
const playbackTimer = ref<number | null>(null)

// Display data
const visibleSearches = ref<any[]>([])
const recentSearches = ref<any[]>([])
const totalProcessed = ref(0)
const searchesInLastMinute = ref(0)
const peakHour = ref('--:--')

// Stats
const hourlyStats = ref({
  found: 0,
  limited: 0,
  failed: 0
})

// Watch for date changes
watch([startDate, endDate], async ([newStart, newEnd], [oldStart, oldEnd]) => {
  if (newStart !== oldStart || newEnd !== oldEnd) {
    console.log(`📅 Date range changed: ${newStart} to ${newEnd}`)

    // Stop any ongoing playback
    if (isPlaying.value) {
      stopPlayback()
    }

    // Reinitialize with new date range
    await initializeTimeline()
  }
})

// Initialize timeline data
const initializeTimeline = async () => {
  console.log('🚀 Initializing linear timeline...')
  console.log(`📅 Date range: ${startDate.value} to ${endDate.value}`)

  // Always reload data with current date range
  console.log('📥 Loading data from API...')
  await store.fetchPlaybackData(startDate.value, endDate.value)
  console.log(`✅ Loaded ${store.searches.length} searches`)

  // Clear existing index
  searchesBySecond.value.clear()
  visibleSearches.value = []
  recentSearches.value = []
  totalProcessed.value = 0

  // Index searches by second
  let minTime = Infinity
  let maxTime = -Infinity

  store.searches.forEach(search => {
    const timestamp = new Date(search.timestamp).getTime()
    const secondKey = Math.floor(timestamp / 1000) * 1000

    if (!searchesBySecond.value.has(secondKey)) {
      searchesBySecond.value.set(secondKey, [])
    }
    searchesBySecond.value.get(secondKey)!.push(search)

    minTime = Math.min(minTime, timestamp)
    maxTime = Math.max(maxTime, timestamp)
  })

  // Set timeline boundaries
  if (store.searches.length > 0) {
    startPlaybackTime.value = new Date(minTime)
    endPlaybackTime.value = new Date(maxTime)
    currentPlaybackTime.value = new Date(minTime)

    console.log(`📊 Timeline ready:`)
    console.log(`   Searches: ${store.searches.length}`)
    console.log(`   Time slots: ${searchesBySecond.value.size}`)
    console.log(`   Start: ${startPlaybackTime.value.toLocaleString()}`)
    console.log(`   End: ${endPlaybackTime.value.toLocaleString()}`)
  } else {
    console.error('❌ No searches loaded!')
  }
}


// Playback engine
const startPlayback = () => {
  console.log('▶️ Starting linear playback')
  if (!currentPlaybackTime.value || !endPlaybackTime.value) {
    console.error('Timeline not initialized!')
    return
  }

  const updateInterval = 100 // Update 10 times per second
  const timeIncrement = (playbackSpeed.value * 100) // ms to advance per update

  playbackTimer.value = window.setInterval(() => {
    if (!currentPlaybackTime.value || !endPlaybackTime.value) return

    // Calculate new time
    const newTime = new Date(currentPlaybackTime.value.getTime() + timeIncrement)

    // Check if we've reached the end
    if (newTime >= endPlaybackTime.value) {
      console.log('🏁 Playback complete!')
      stopPlayback()
      return
    }

    // Process searches in this time window
    processTimeWindow(currentPlaybackTime.value, newTime)

    // Update current time
    currentPlaybackTime.value = newTime

    // Update progress
    updateProgress()

  }, updateInterval)
}

// Process searches in a time window
const processTimeWindow = (startTime: Date, endTime: Date) => {
  const startMs = startTime.getTime()
  const endMs = endTime.getTime()
  const newSearches: any[] = []

  // Find all searches in this window
  for (let t = startMs; t < endMs; t += 1000) {
    const secondKey = Math.floor(t / 1000) * 1000
    const searches = searchesBySecond.value.get(secondKey) || []
    newSearches.push(...searches)
  }

  if (newSearches.length > 0) {
    console.log(`⏱ Processing ${newSearches.length} searches at ${currentPlaybackTime.value?.toLocaleTimeString()}`)

    // Debug: Check first search structure
    if (totalProcessed.value === 0 && newSearches.length > 0) {
      console.log('🔍 First search structure:', newSearches[0])
      console.log('  - qid:', newSearches[0].qid)
      console.log('  - latitude:', newSearches[0].latitude)
      console.log('  - longitude:', newSearches[0].longitude)
      console.log('  - timestamp:', newSearches[0].timestamp)
    }

    // Add to visible searches (for map)
    visibleSearches.value.push(...newSearches)

    console.log(`📍 Visible searches now: ${visibleSearches.value.length}`)

    // Maintain rolling window for map (e.g., last 5 minutes)
    const cutoffTime = endTime.getTime() - (mapTimeWindow.value * 60 * 1000)
    const beforeFilter = visibleSearches.value.length
    visibleSearches.value = visibleSearches.value.filter(s =>
      new Date(s.timestamp).getTime() > cutoffTime
    )
    const afterFilter = visibleSearches.value.length

    if (beforeFilter !== afterFilter) {
      console.log(`🔄 Filtered old searches: ${beforeFilter} -> ${afterFilter}`)
    }

    // Update recent searches list
    recentSearches.value.unshift(...newSearches)
    recentSearches.value = recentSearches.value.slice(0, 20)

    // Update stats
    totalProcessed.value += newSearches.length
    updateHourlyStats()
  }

  // Calculate searches per minute
  const minuteAgo = currentPlaybackTime.value.getTime() - (60 * 1000)
  searchesInLastMinute.value = visibleSearches.value.filter(s =>
    new Date(s.timestamp).getTime() > minuteAgo
  ).length
}

// Update hourly statistics
const updateHourlyStats = () => {
  if (!currentPlaybackTime.value) return

  const hourAgo = currentPlaybackTime.value.getTime() - (60 * 60 * 1000)
  const hourSearches = visibleSearches.value.filter(s =>
    new Date(s.timestamp).getTime() > hourAgo
  )

  hourlyStats.value = {
    found: hourSearches.filter(s => s.num_found > 3).length,
    limited: hourSearches.filter(s => s.num_found > 0 && s.num_found <= 3).length,
    failed: hourSearches.filter(s => s.num_found === 0).length
  }
}

// Playback controls
const togglePlayback = () => {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    isPlaying.value = true
    startPlayback()
  }
}

const stopPlayback = () => {
  console.log('⏸ Stopping playback')
  if (playbackTimer.value) {
    clearInterval(playbackTimer.value)
    playbackTimer.value = null
  }
  isPlaying.value = false
}

const resetPlayback = () => {
  console.log('🔄 Resetting playback')
  stopPlayback()
  currentPlaybackTime.value = startPlaybackTime.value
  visibleSearches.value = []
  recentSearches.value = []
  totalProcessed.value = 0
  timelineProgress.value = 0
  if (mapRef.value) {
    mapRef.value.clearMap()
  }
}

const scrubTimeline = (event: Event) => {
  if (!startPlaybackTime.value || !endPlaybackTime.value) return

  const target = event.target as HTMLInputElement
  const percent = parseFloat(target.value) / 100
  const totalTime = endPlaybackTime.value.getTime() - startPlaybackTime.value.getTime()
  const newTime = new Date(startPlaybackTime.value.getTime() + (totalTime * percent))

  currentPlaybackTime.value = newTime

  // Clear visible searches when scrubbing
  visibleSearches.value = []

  // Optional: Load searches at this point in time
  // You could call processTimeWindow here with a larger window
}

const updateProgress = () => {
  if (!startPlaybackTime.value || !endPlaybackTime.value || !currentPlaybackTime.value) {
    return
  }
  const total = endPlaybackTime.value.getTime() - startPlaybackTime.value.getTime()
  const current = currentPlaybackTime.value.getTime() - startPlaybackTime.value.getTime()
  timelineProgress.value = (current / total) * 100
}

// Computed properties
const currentTimeDisplay = computed(() => {
  if (!currentPlaybackTime.value) return '--:--:-- --'
  return currentPlaybackTime.value.toLocaleTimeString()
})

// Utility functions
const formatTime = (date: Date | null) => {
  if (!date) return '--:--'
  return date.toLocaleString()
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString()
}

const getResultClass = (numFound: number) => {
  if (numFound === 0) return 'text-red-400'
  if (numFound <= 3) return 'text-yellow-400'
  return 'text-green-400'
}

// Lifecycle
onMounted(async () => {
  console.log('🎬 LinearPlaybackView mounted')

  // Optional: First load with default range to see what's available
  await initializeTimeline()

  // If you want to auto-detect the date range from loaded data:
  /* */
  if (store.searches.length > 0) {
    // Find actual date range in data
    const dates = store.searches.map(s => new Date(s.timestamp).getTime())
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    // Update date inputs to match actual data range
    startDate.value = minDate.toISOString().split('T')[0]
    endDate.value = maxDate.toISOString().split('T')[0]

    // Reload with detected range
    await initializeTimeline()
  }
  // */
})


onUnmounted(() => {
  stopPlayback()
})
</script>