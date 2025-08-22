<template>
  <div class="min-h-screen gradient-storeiq">
    <!-- Development Mode Banner -->
    <div v-if="isDev" class="bg-storeiq-gold text-black text-center py-2 font-semibold">
      🚧 Development Mode - API: {{ apiUrl }}
    </div>

    <!-- Main Navigation -->
    <nav class="bg-black/20 backdrop-blur-lg border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-white">
              Store<span class="text-gradient">IQ</span>.io
            </h1>
            <span class="ml-3 text-sm text-white/60">Revenue Intelligence Platform</span>
          </div>

          <div class="flex items-center space-x-4">
            <button @click="currentView = 'dashboard'" :class="viewButtonClass('dashboard')">
              📊 Dashboard
            </button>
            <button @click="currentView = 'playback'" :class="viewButtonClass('playback')">
              ▶️ Playback (Original)
            </button>
            <button @click="currentView = 'linear'" :class="viewButtonClass('linear')">
              ⏰ Linear Time
            </button>
            <button @click="currentView = 'insights'" :class="viewButtonClass('insights')">
              💡 Insights
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- View Container -->
    <div class="flex-1">
      <!-- Dashboard View -->
      <div v-if="currentView === 'dashboard'" class="p-6">
        <DashboardView />
      </div>

      <!-- Playback View -->
      <div v-else-if="currentView === 'playback'" class="p-6">
        <PlaybackView />
      </div>

      <!-- Linear Playback View -->
      <div v-else-if="currentView === 'linear'" class="p-6">
        <LinearPlaybackView />
      </div>

      <!-- Insights View -->
      <div v-else-if="currentView === 'insights'" class="p-6">
        <InsightsView />
      </div>
    </div>

    <!-- Footer -->
    <footer class="bg-black/20 backdrop-blur-lg border-t border-white/10 mt-auto">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between text-white/60 text-sm">
          <div>
            Found <span class="text-storeiq-green font-bold">${{ totalRevenue }}M</span> in opportunities
          </div>
          <div>
            Analyzing <span class="font-bold">{{ totalSearches.toLocaleString() }}</span> searches
          </div>
          <div>
            <span class="text-storeiq-red font-bold">{{ failureRate }}%</span> failure rate
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePlaybackStore } from './stores/playback'
import DashboardView from './views/DashboardView.vue'
import PlaybackView from './views/PlaybackView.vue'
import LinearPlaybackView from './views/LinearPlaybackView.vue'
import InsightsView from './views/InsightsView.vue'

// Store
const store = usePlaybackStore()

// State
const currentView = ref<'dashboard' | 'playback' | 'linear' | 'insights'>('linear')
const isDev = import.meta.env.DEV
const apiUrl = import.meta.env.VITE_API_URL

// Mock data for now
const totalRevenue = ref(14.9)
const totalSearches = ref(229558)
const failureRate = ref(20.6)

// Computed
const viewButtonClass = computed(() => (view: string) => {
  const base = 'px-4 py-2 rounded-lg font-medium transition-all'
  if (currentView.value === view) {
    return `${base} bg-white/20 text-white`
  }
  return `${base} text-white/70 hover:text-white hover:bg-white/10`
})

// Lifecycle
onMounted(async () => {
  // Initialize store with data
  await store.initialize()

  // Update stats from store
  if (store.stats) {
    totalSearches.value = store.stats.total
    failureRate.value = store.stats.noResultsRate
  }
})
</script>

<style scoped>
/* Any component-specific styles */
</style>