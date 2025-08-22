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

        <div class="text-white/60 text-sm ml-2">
          Playing at <span class="font-bold text-white">{{ playbackSpeed }}x</span> speed
        </div>
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
          <SearchMap :current-searches="visibleSearches" :persist-pings="persistPings"
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
                {{ search.locality || 'Unknown' }}, {{ search.administrative_area || search.country }}
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { format } from 'date-fns'
import { usePlaybackStore } from '../stores/playback'
import TimelineChart from '../components/TimelineChart.vue'
import SearchMap from '../components/SearchMap.vue'

const store = usePlaybackStore()

// State
const startDate = ref('2024-01-01')
const endDate = ref('2024-12-31')
const playbackSpeed = ref(1)
const speeds = [0.25, 0.5, 1, 1.5, 2, 5, 10]
const isPlaying = ref(false)
const persistPings = ref(false)

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

const recentSearches = computed(() => {
  // Show last 10 searches that have been played
  const played = store.searches.slice(0, currentPlaybackIndex.value)
  return played.slice(-10).reverse()
})

// PLAYBACK ENGINE!!!
const startPlayback = () => {
  console.log('🎮 STARTING PLAYBACK!')

  if (currentPlaybackIndex.value >= store.searches.length) {
    currentPlaybackIndex.value = 0
    visibleSearches.value = []
  }

  // More reasonable speed calculation
  // At 1x speed, play through all data in 2 minutes (120 seconds)
  const totalDuration = 120000 // 2 minutes at 1x
  const searchesPerSecond = store.searches.length / 120
  const searchesPerInterval = Math.max(1, Math.floor(searchesPerSecond / 4)) // Update 4 times per second
  const interval = 250 / playbackSpeed.value // Update every 250ms, adjusted by speed

  playbackInterval.value = window.setInterval(() => {
    // Process batch of searches
    const batchSize = Math.ceil(searchesPerInterval * playbackSpeed.value)

    for (let i = 0; i < batchSize; i++) {
      if (currentPlaybackIndex.value >= store.searches.length) {
        stopPlayback()
        console.log('🏁 Playback complete!')
        return
      }

      const search = store.searches[currentPlaybackIndex.value]
      currentTime.value = new Date(search.timestamp)

      // Sample the searches (don't show EVERY one or map explodes)
      // At high speeds, sample less frequently
      const sampleRate = playbackSpeed.value > 2 ? 20 : 10

      if (currentPlaybackIndex.value % sampleRate === 0) {
        const shouldShow =
          (filters.value.showNoResults && search.num_found === 0) ||
          (filters.value.showLimited && search.num_found > 0 && search.num_found <= 3) ||
          (filters.value.showSuccess && search.num_found > 3)

        if (shouldShow && search.latitude && search.longitude) {
          visibleSearches.value.push({
            ...search,
            addedAt: Date.now()
          })
        }
      }

      currentPlaybackIndex.value++
    }

    // Limit visible searches to prevent memory issues
    if (!persistPings.value && visibleSearches.value.length > 50) {
      visibleSearches.value = visibleSearches.value.slice(-50)
    }

  }, interval)
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