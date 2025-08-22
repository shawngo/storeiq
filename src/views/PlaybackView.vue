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
          <input
            type="date"
            v-model="startDate"
            class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white"
          />
          <label class="text-white/70 text-sm">To:</label>
          <input
            type="date"
            v-model="endDate"
            class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white"
          />
        </div>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Speed Controls -->
        <div class="flex gap-2">
          <button
            v-for="speed in speeds"
            :key="speed"
            @click="playbackSpeed = speed"
            :class="speedButtonClass(speed)"
          >
            {{ speed }}x
          </button>
        </div>

        <!-- Play/Pause -->
        <button
          @click="togglePlayback"
          class="px-6 py-2.5 bg-storeiq-green hover:bg-green-600 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg"
        >
          <span v-if="!isPlaying">▶ PLAY</span>
          <span v-else>⏸ PAUSE</span>
        </button>
      </div>

      <!-- Filters -->
      <div class="mt-4 pt-4 border-t border-white/10 flex items-center gap-6">
        <span class="text-white/70 text-sm font-medium">Show:</span>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="filters.showSuccess"
            class="rounded bg-white/10 border-white/20 text-storeiq-green"
          />
          <span class="text-white/70 text-sm">Found Stores</span>
          <span class="text-storeiq-green font-bold text-sm">({{ mockStats.successful }})</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="filters.showLimited"
            class="rounded bg-white/10 border-white/20 text-storeiq-gold"
          />
          <span class="text-white/70 text-sm">Limited Results</span>
          <span class="text-storeiq-gold font-bold text-sm">({{ mockStats.limited }})</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="filters.showNoResults"
            class="rounded bg-white/10 border-white/20 text-storeiq-red"
          />
          <span class="text-white/70 text-sm">No Results</span>
          <span class="text-storeiq-red font-bold text-sm">({{ mockStats.noResults }})</span>
        </label>

        <div class="flex-1"></div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="persistPings"
            class="rounded bg-white/10 border-white/20 text-storeiq-purple"
          />
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
        <div class="text-2xl font-bold text-white">{{ currentTimeDisplay }}</div>
        <div class="text-sm text-white/60 mt-1">Current Position</div>
      </div>
    </div>

    <!-- Timeline Chart -->
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
      <h3 class="text-xl font-bold text-white mb-4">Search Activity Timeline</h3>
      <div class="h-64 bg-white/5 rounded-lg flex items-center justify-center">
        <div class="text-white/40">
          Timeline Chart Component
          <br />
          <span class="text-sm">(Chart.js visualization will go here)</span>
        </div>
      </div>
    </div>

    <!-- Map and Feed Grid -->
    <div class="grid grid-cols-3 gap-6">
      <!-- Map (2 columns) -->
      <div class="col-span-2">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 h-[600px]">
          <h3 class="text-xl font-bold text-white mb-4">Geographic Visualization</h3>
          <div class="h-full bg-white/5 rounded-lg flex items-center justify-center">
            <div class="text-white/40 text-center">
              <div class="text-6xl mb-4">🗺️</div>
              Map Component
              <br />
              <span class="text-sm">(Leaflet map with pings will go here)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Feed (1 column) -->
      <div class="col-span-1">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 h-[600px]">
          <h3 class="text-xl font-bold text-white mb-4">Live Search Feed</h3>
          <div class="space-y-3 overflow-y-auto h-[520px]">
            <!-- Mock feed items -->
            <div v-for="i in 5" :key="i" class="bg-white/5 rounded-lg p-3 border border-white/10">
              <div class="text-xs text-white/40 mb-1">{{ mockTime }}</div>
              <div class="text-sm text-white font-medium">
                Baton Rouge, LA
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-white/60">Radius: 50mi</span>
                <span class="text-xs text-storeiq-red">• No Results</span>
              </div>
              <a
                href="https://ipinfo.io/72.198.234.122"
                target="_blank"
                class="text-xs text-storeiq-purple hover:text-storeiq-gold mt-1 inline-block"
              >
                IP: 72.198.234.122 →
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
import { ref, computed } from 'vue'
import { format } from 'date-fns'

// State
const startDate = ref('2024-01-01')
const endDate = ref('2024-12-31')
const playbackSpeed = ref(1)
const speeds = [0.5, 1, 1.5, 2]
const isPlaying = ref(false)
const persistPings = ref(false)

const filters = ref({
  showSuccess: true,
  showLimited: true,
  showNoResults: true
})

// Mock data
const searchesPlayed = ref(4823)
const totalInRange = ref(45291)
const noResultsRate = ref(21.3)
const currentTime = ref(new Date())
const mockTime = format(new Date(), 'MMM d, yyyy h:mm:ss a')

const mockStats = {
  successful: 35842,
  limited: 3247,
  noResults: 6202
}

// Computed
const currentTimeDisplay = computed(() => {
  if (!isPlaying.value) return 'Not Playing'
  return format(currentTime.value, 'MMM d, h:mm a')
})

const speedButtonClass = computed(() => (speed: number) => {
  const base = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all'
  if (playbackSpeed.value === speed) {
    return `${base} bg-white/20 text-white`
  }
  return `${base} bg-white/10 text-white/70 hover:bg-white/15 hover:text-white`
})

// Methods
const togglePlayback = () => {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    console.log('🎬 Starting playback at', playbackSpeed.value + 'x speed')
  } else {
    console.log('⏸ Playback paused')
  }
}
</script>