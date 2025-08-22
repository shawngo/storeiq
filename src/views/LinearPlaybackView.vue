// LinearPlaybackView.vue - Brand new linear time playback component
<template>
  <div class="max-w-7xl mx-auto">
    <h2 class="text-3xl font-bold text-white mb-6">
      Linear Time Playback <span class="text-gradient">Analysis</span>
    </h2>

    <!-- Playback Controls -->
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
      <div class="flex items-center gap-4">
        <!-- Date Range Selector -->
        <div class="flex items-center gap-2">
          <label class="text-white/70 text-sm">From:</label>
          <input type="date" v-model="startDate"
            class="bg-white/10 border border-white/20 rounded px-2 py-1 text-white" />
        </div>

        <div class="flex items-center gap-2">
          <label class="text-white/70 text-sm">To:</label>
          <input type="date" v-model="endDate"
            class="bg-white/10 border border-white/20 rounded px-2 py-1 text-white" />
        </div>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Speed Selector -->
        <select v-model="playbackSpeed"
          class="bg-white/10 border border-white/20 rounded px-3 py-2 text-white">
          <option :value="1">Real-time</option>
          <option :value="60">1 min/sec</option>
          <option :value="300">5 min/sec</option>
          <option :value="900">15 min/sec</option>
          <option :value="1800">30 min/sec</option>
          <option :value="3600">1 hour/sec</option>
          <option :value="7200">2 hours/sec</option>
          <option :value="21600">6 hours/sec</option>
          <option :value="43200">12 hours/sec</option>
          <option :value="86400">1 day/sec</option>
        </select>

        <!-- Play/Pause Button -->
        <button @click="togglePlayback"
          class="px-6 py-2 bg-gradient-to-r from-storeiq-green to-storeiq-teal rounded-lg text-white font-bold hover:opacity-90 transition-all">
          {{ isPlaying ? '⏸ PAUSE' : '▶ PLAY' }}
        </button>

        <!-- Reset Button -->
        <button @click="resetPlayback"
          class="px-6 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
          🔄 Reset
        </button>
      </div>

      <!-- Timeline Progress Bar -->
      <div class="mt-6">
        <div class="flex items-center gap-4">
          <span class="text-white text-sm w-20">
            {{ formatTime(currentPlaybackTime) }}
          </span>
          <div class="flex-1 relative">
            <div class="h-2 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-storeiq-green to-storeiq-teal transition-all duration-100"
                :style="`width: ${timelineProgress}%`"></div>
            </div>
            <!-- Clickable timeline -->
            <input type="range" min="0" max="100" v-model="timelineProgress"
              @input="scrubTimeline"
              class="absolute inset-0 w-full opacity-0 cursor-pointer" />
          </div>
          <span class="text-white text-sm w-20 text-right">
            {{ formatTime(endPlaybackTime) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Current Time Display -->
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
      <div class="grid grid-cols-4 gap-4">
        <div>
          <div class="text-3xl font-bold text-white">
            {{ currentTimeDisplay }}
          </div>
          <div class="text-sm text-white/60 mt-1">Current Time</div>
        </div>

        <div>
          <div class="text-3xl font-bold text-storeiq-green">
            {{ searchesInLastMinute }}
          </div>
          <div class="text-sm text-white/60 mt-1">Searches/min</div>
        </div>

        <div>
          <div class="text-3xl font-bold text-storeiq-gold">
            {{ peakHour }}
          </div>
          <div class="text-sm text-white/60 mt-1">Peak Hour</div>
        </div>

        <div>
          <div class="text-3xl font-bold text-storeiq-purple">
            {{ totalProcessed.toLocaleString() }}
          </div>
          <div class="text-sm text-white/60 mt-1">Total Shown</div>
        </div>
      </div>
    </div>

    <!-- Map and Stats Grid -->
    <div class="grid grid-cols-3 gap-6">
      <!-- Map (2 columns) -->
      <div class="col-span-2">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 h-[600px]">
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
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 h-[600px]">
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
          <div class="space-y-2 overflow-y-auto h-[400px]">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlaybackStore } from '../stores/playback'
import LinearSearchMap from '../components/LinearSearchMap.vue'

const store = usePlaybackStore()
const mapRef = ref()

// Playback state
const startDate = ref('2024-01-01')
const endDate = ref('2024-12-31')
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

// Initialize timeline data
const initializeTimeline = async () => {
  console.log('🚀 Initializing linear timeline...')

  // Load data if not already loaded
  if (store.searches.length === 0) {
    await store.fetchSearches(startDate.value, endDate.value)
  }

  // Clear existing index
  searchesBySecond.value.clear()

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
  startPlaybackTime.value = new Date(minTime)
  endPlaybackTime.value = new Date(maxTime)
  currentPlaybackTime.value = new Date(minTime)

  console.log(`📊 Timeline ready:`)
  console.log(`   Searches: ${store.searches.length}`)
  console.log(`   Time slots: ${searchesBySecond.value.size}`)
  console.log(`   Start: ${startPlaybackTime.value.toLocaleString()}`)
  console.log(`   End: ${endPlaybackTime.value.toLocaleString()}`)
}

// Playback engine
const startPlayback = () => {
  if (!currentPlaybackTime.value || !endPlaybackTime.value) return

  const updateInterval = 100 // Update 10 times per second
  const timeIncrement = (playbackSpeed.value * 100) // ms to advance per update

  playbackTimer.value = window.setInterval(() => {
    if (!currentPlaybackTime.value || !endPlaybackTime.value) return

    // Calculate new time
    const newTime = new Date(currentPlaybackTime.value.getTime() + timeIncrement)

    // Check if we've reached the end
    if (newTime >= endPlaybackTime.value) {
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
    // Add to visible searches (for map)
    visibleSearches.value.push(...newSearches)

    // Maintain rolling window for map (e.g., last 5 minutes)
    const cutoffTime = endTime.getTime() - (mapTimeWindow.value * 60 * 1000)
    visibleSearches.value = visibleSearches.value.filter(s =>
      new Date(s.timestamp).getTime() > cutoffTime
    )

    // Update recent searches list
    recentSearches.value.unshift(...newSearches)
    recentSearches.value = recentSearches.value.slice(0, 20)

    // Update stats
    totalProcessed.value += newSearches.length
    updateHourlyStats()
  }
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

  // Calculate searches per minute
  const minuteAgo = currentPlaybackTime.value.getTime() - (60 * 1000)
  searchesInLastMinute.value = visibleSearches.value.filter(s =>
    new Date(s.timestamp).getTime() > minuteAgo
  ).length
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
  if (playbackTimer.value) {
    clearInterval(playbackTimer.value)
    playbackTimer.value = null
  }
  isPlaying.value = false
}

const resetPlayback = () => {
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

  // Optionally: Show searches from last N minutes at this point
  // loadSearchesAtTime(newTime)
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
  if (!currentPlaybackTime.value) return '--:--:--'
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
onMounted(() => {
  initializeTimeline()
})

onUnmounted(() => {
  stopPlayback()
})
</script>