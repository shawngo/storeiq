<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-4xl font-bold text-white mb-2">
        Search Playback Analysis
      </h2>
      <p class="text-gray-400">
        Watch 2 years of customer searches replay in real-time
      </p>
    </div>

    <!-- Control Panel -->
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <!-- Date Range -->
        <div class="flex items-center gap-3">
          <label class="text-white/70 text-sm">From:</label>
          <input type="date" v-model="startDate"
            class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white" />
          <label class="text-white/70 text-sm">To:</label>
          <input type="date" v-model="endDate"
            class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white" />
        </div>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Speed Controls -->
        <div class="flex gap-2">
          <button v-for="speed in speeds" :key="speed" @click="setSpeed(speed)" :class="speedButtonClass(speed)">
            {{ speed }}x
          </button>
        </div>

        <!-- Play/Pause -->
        <button @click="togglePlayback"
          class="px-6 py-2.5 bg-storeiq-green hover:bg-green-600 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg">
          <span v-if="!isPlaying">▶ PLAY</span>
          <span v-else>⏸ PAUSE</span>
        </button>

        <button @click="resetPlayback"
          class="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium transition-all">
          🔄 Reset
        </button>

        <!-- <div class="text-white/60 text-sm ml-2">
          Playing at <span class="font-bold text-white">{{ playbackSpeed }}x</span> speed
        </div> -->
      </div>

      <!-- Filters -->
      <div class="mt-4 pt-4 border-t border-white/10 flex items-center gap-6">
        <span class="text-white/70 text-sm font-medium">Show:</span>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="filters.showSuccess"
            class="rounded bg-white/10 border-white/20 text-storeiq-green" />
          <span class="text-white/70 text-sm">Found Stores</span>
          <span class="text-storeiq-green font-bold text-sm">({{ store.stats.successful }})</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="filters.showLimited"
            class="rounded bg-white/10 border-white/20 text-storeiq-gold" />
          <span class="text-white/70 text-sm">Limited Results</span>
          <span class="text-storeiq-gold font-bold text-sm">({{ store.stats.limited }})</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="filters.showNoResults"
            class="rounded bg-white/10 border-white/20 text-storeiq-red" />
          <span class="text-white/70 text-sm">No Results</span>
          <span class="text-storeiq-red font-bold text-sm">({{ store.stats.no_results }})</span>
        </label>

        <div class="flex-1"></div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="persistPings"
            class="rounded bg-white/10 border-white/20 text-storeiq-purple" />
          <span class="text-white/70 text-sm">Persist pings</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="useHeatmap" class="rounded bg-white/10 border-white/20 text-storeiq-purple" />
          <span class="text-white/70 text-sm">Heatmap mode</span>
        </label>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white/10 backdrop-blur-lg rounded-xl p-4">
        <div class="text-3xl font-bold text-white">{{ searchesPlayed.toLocaleString() }}</div>
        <div class="text-sm text-white/60 mt-1">Searches Played</div>
      </div>

      <div class="bg-white/10 backdrop-blur-lg rounded-xl p-4">
        <div class="text-3xl font-bold text-white">{{ totalInRange.toLocaleString() }}</div>
        <div class="text-sm text-white/60 mt-1">Total in Range</div>
      </div>

      <div class="bg-white/10 backdrop-blur-lg rounded-xl p-4">
        <div class="text-3xl font-bold text-storeiq-red">{{ noResultsRate }}%</div>
        <div class="text-sm text-white/60 mt-1">No Results Rate</div>
      </div>

      <div class="bg-white/10 backdrop-blur-lg rounded-xl p-4">
        <div class="text-2xl font-bold text-white">
          {{ currentTimeDisplay }}
        </div>
        <div class="text-sm text-white/60 mt-1">
          {{ currentDateDisplay }}
        </div>
      </div>
    </div>

    <!-- Timeline Chart -->
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
      <h3 class="text-xl font-bold text-white mb-4">Search Activity Timeline</h3>
      <TimelineChart :is-playing="isPlaying" :current-time="currentTime" />
    </div>

    <!-- Map and Feed Grid -->
    <div class="grid grid-cols-3 gap-6">
      <!-- Map (2 columns) -->
      <div class="col-span-2">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 h-[600px]">
          <h3 class="text-xl font-bold text-white mb-4">Geographic Visualization</h3>
          <SearchMap ref="searchMapRef" :current-searches="visibleSearches" :persist-pings="persistPings"
            :use-heatmap="useHeatmap"
            :show-success="filters.showSuccess" :show-limited="filters.showLimited"
            :show-no-results="filters.showNoResults" />
        </div>
      </div>

      <!-- Live Feed (1 column) -->
      <div class="col-span-1">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 h-[600px]">
          <h3 class="text-xl font-bold text-white mb-4">Live Search Feed</h3>
          <div class="space-y-3 overflow-y-auto h-[520px]">
            <!-- Show last 10 searches from the store -->
            <div v-for="search in recentSearches" :key="search.qid"
              class="bg-white/5 rounded-lg p-3 border border-white/10">
              <div class="text-xs text-white/40 mb-1">
                {{ formatTimestamp(search.timestamp) }}
              </div>
              <div class="text-sm text-white font-medium">
                {{ search.locality || 'Unknown' }}<span v-if="search.administrative_area">, {{
                  search.administrative_area }}</span>
                <span v-if="!search.administrative_area && search.country">, {{ search.country }}</span>
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-white/60">Radius: {{ search.radius_miles }}mi</span>
                <span :class="getResultClass(search.num_found)">
                  • {{ getResultText(search.num_found) }}
                </span>
              </div>
              <a :href="`https://ipinfo.io/${search.ip_address}`" target="_blank"
                class="text-xs text-purple-400 hover:text-yellow-400 mt-1 inline-block">
                IP: {{ search.ip_address }} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="mt-6 flex justify-center gap-4">
      <button class="px-6 py-3 bg-white/10 backdrop-blur-lg rounded-lg text-white hover:bg-white/20 transition-all">
        📊 Export Statistics
      </button>
      <button class="px-6 py-3 bg-white/10 backdrop-blur-lg rounded-lg text-white hover:bg-white/20 transition-all">
        🎥 Record Playback
      </button>
      <button class="px-6 py-3 bg-white/10 backdrop-blur-lg rounded-lg text-white hover:bg-white/20 transition-all">
        📧 Email Report
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { format } from 'date-fns'
import { usePlaybackStore } from '../stores/playback'
import TimelineChart from '../components/TimelineChart.vue'
import SearchMap from '../components/SearchMap.vue'

const store = usePlaybackStore()
const searchMapRef = ref()

// State
const startDate = ref('2024-01-01')
const endDate = ref('2024-12-31')
const playbackSpeed = ref(1)
const speeds = [0.25, 0.5, 1, 1.5, 2, 5, 10]
const isPlaying = ref(false)
const persistPings = ref(false)
const useHeatmap = ref(false)

// PLAYBACK STATE
const currentPlaybackIndex = ref(0)
const currentTime = ref<Date | null>(null)
const playbackInterval = ref<number | null>(null)
const visibleSearches = ref<any[]>([])  // Searches currently visible on map

const filters = ref({
  showSuccess: true,
  showLimited: true,
  showNoResults: true
})

const resetPlayback = () => {
  // Stop playback
  stopPlayback()

  // Reset indices
  currentPlaybackIndex.value = 0
  currentTime.value = null
  visibleSearches.value = []

  // Clear the map
  if (searchMapRef.value) {
    searchMapRef.value.clearAllMarkers()
  }

  console.log('🔄 Playback reset!')
}

watch(useHeatmap, (newValue) => {
  if (searchMapRef.value) {
    if (newValue) {
      searchMapRef.value.enableHeatmap()
    } else {
      searchMapRef.value.disableHeatmap()
    }
  }
})

// Computed
const searchesPlayed = computed(() => currentPlaybackIndex.value)
const totalInRange = computed(() => store.stats.total)
const noResultsRate = computed(() => {
  if (currentPlaybackIndex.value === 0) return 0
  const played = store.searches.slice(0, currentPlaybackIndex.value)
  const failed = played.filter(s => s.num_found === 0).length
  return Math.round((failed / played.length) * 100 * 10) / 10
})

const currentTimeDisplay = computed(() => {
  if (!currentTime.value) return '--:--'
  return format(currentTime.value, 'h:mm:ss a')
})

const currentDateDisplay = computed(() => {
  if (!currentTime.value) return 'Not Playing'
  return format(currentTime.value, 'EEEE, MMMM d, yyyy')
})

// Update the recentSearches computed to use currentPlaybackIndex
const recentSearches = computed(() => {
  // Get the last 10 searches UP TO current playback index
  if (currentPlaybackIndex.value === 0) return []

  const endIndex = Math.min(currentPlaybackIndex.value, store.searches.length)
  const startIndex = Math.max(0, endIndex - 10)

  return store.searches.slice(startIndex, endIndex).reverse()
})

// PLAYBACK ENGINE!!!
const startPlayback = () => {
  console.log('🎮 STARTING PLAYBACK!')

  // Clear visible searches when restarting
  if (currentPlaybackIndex.value >= store.searches.length) {
    currentPlaybackIndex.value = 0
    visibleSearches.value = []
  }

  const interval = 100 / playbackSpeed.value // Simple interval calculation

  playbackInterval.value = window.setInterval(() => {
    // Process a reasonable batch
    const batchSize = Math.ceil(10 * playbackSpeed.value) // 10 searches per interval at 1x

    let addedToMap = 0

    for (let i = 0; i < batchSize && currentPlaybackIndex.value < store.searches.length; i++) {
      const search = store.searches[currentPlaybackIndex.value]


      if (currentPlaybackIndex.value === 275) {
        console.log('🔍 At index 275, search:', search)
      }

      // Check for invalid data
      if (!search || typeof search !== 'object') {
        console.error('❌ Invalid search object at index:', currentPlaybackIndex.value)
        currentPlaybackIndex.value++
        continue
      }

      if (!search.timestamp) {
        console.error('❌ Search missing timestamp at index:', currentPlaybackIndex.value)
        currentPlaybackIndex.value++
        continue
      }

      // Safely handle the timestamp
      try {
        currentTime.value = new Date(search.timestamp)
      } catch (e) {
        console.error('❌ Invalid timestamp at index:', currentPlaybackIndex.value, e)
        currentPlaybackIndex.value++
        continue
      }

      currentTime.value = new Date(search.timestamp)

      // Only add some searches to map to prevent overwhelming it
      if (addedToMap < 3) { // Max 3 per batch to map
        const shouldShow =
          (filters.value.showNoResults && search.num_found === 0) ||
          (filters.value.showLimited && search.num_found > 0 && search.num_found <= 3) ||
          (filters.value.showSuccess && search.num_found > 3)

        if (shouldShow && search.latitude && search.longitude) {
          const safeSearch = {
            ...search,
            locality: search.locality || 'Unknown',
            administrative_area: search.administrative_area || '',
            country: search.country || 'US',
            ip_address: search.ip_address || 'Unknown',
            radius_miles: search.radius_miles || 50,
            num_found: search.num_found || 0
          }
          visibleSearches.value.push(safeSearch)
          addedToMap++
        }
      }

      currentPlaybackIndex.value++

      // Log progress every 50 searches
      if (currentPlaybackIndex.value % 50 === 0) {
        console.log(`📍 Playback Progress:`)
        console.log(`  - Index: ${currentPlaybackIndex.value} / ${store.searches.length}`)
        console.log(`  - Visible searches array: ${visibleSearches.value.length}`)
        console.log(`  - Should be showing on map: ${addedToMap} new in this batch`)
      }

      // Log every 100 searches
      if (currentPlaybackIndex.value % 100 === 0) {
        console.log(`📍 Playback at ${currentPlaybackIndex.value} / ${store.searches.length}`)
      }
    }

    // Keep array size manageable
    if (visibleSearches.value.length > 500) {
      visibleSearches.value = visibleSearches.value.slice(-500)
    }

    if (visibleSearches.value.length > 500) {
      console.log('⚠️ Trimming visible searches array from', visibleSearches.value.length, 'to 500')
    }

    if (currentPlaybackIndex.value >= store.searches.length) {
      stopPlayback()
      console.log('🏁 Playback complete!')
    }

  }, interval)

  // Do we need this!?
  isPlaying.value = true
}


const stopPlayback = () => {
  console.log('⏸ STOPPING PLAYBACK')
  if (playbackInterval.value) {
    clearInterval(playbackInterval.value)
    playbackInterval.value = null
  }
  isPlaying.value = false
}

const togglePlayback = () => {
  isPlaying.value = !isPlaying.value

  if (isPlaying.value) {
    startPlayback()
  } else {
    stopPlayback()
  }
}

// Speed change handler
const setSpeed = (speed: number) => {
  playbackSpeed.value = speed
  // If playing, restart with new speed
  if (isPlaying.value) {
    stopPlayback()
    isPlaying.value = true
    startPlayback()
  }
}

// Cleanup on unmount
onUnmounted(() => {
  stopPlayback()
})

// Load data on mount
onMounted(async () => {
  console.log('🎬 PlaybackView mounted')
  await store.fetchPlaybackData(startDate.value, endDate.value)
  console.log('✅ Ready to play', store.searches.length, 'searches!')

  for (let i = 300; i < 323; i++) {
    console.log(`🔍 Search at index ${i}:`, store.searches[i])
  }

})

// Format helpers for the feed
const formatTimestamp = (timestamp: string) => {
  return format(new Date(timestamp), 'MMM d, yyyy h:mm:ss a')
}

const getResultClass = (numFound: number) => {
  if (numFound === 0) return 'text-xs text-red-400'
  if (numFound <= 3) return 'text-xs text-yellow-400'
  return 'text-xs text-green-400'
}

const getResultText = (numFound: number) => {
  if (numFound === 0) return 'No Results'
  if (numFound <= 3) return `${numFound} Results`
  return 'Found Stores'
}

const speedButtonClass = computed(() => (speed: number) => {
  const base = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all'
  if (playbackSpeed.value === speed) {
    return `${base} bg-white/20 text-white`
  }
  return `${base} bg-white/10 text-white/70 hover:bg-white/15 hover:text-white`
})
</script>