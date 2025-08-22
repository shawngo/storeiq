<template>
  <div class="relative w-full h-64">
    <canvas ref="chartCanvas"></canvas>
    <!-- Playback position indicator -->
    <div
      v-if="isPlaying && playbackPosition > 0"
      class="absolute top-0 bottom-0 w-0.5 bg-yellow-400 pointer-events-none"
      :style="{ left: `${playbackPosition}%` }"
    >
      <div class="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div class="bg-yellow-400 text-black text-xs px-2 py-1 rounded font-bold">
          ▼
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import { usePlaybackStore } from '../stores/playback'

Chart.register(...registerables)

const props = defineProps<{
  isPlaying: boolean
  currentTime?: number
  placeHolderTime?: Date
}>()

const store = usePlaybackStore()
const chartCanvas = ref<HTMLCanvasElement>()
let chart: Chart | null = null

const playbackPosition = computed(() => {
  if (!props.currentTime || !chart) return 0
  return 50 // Placeholder
})

// Create chart function
const createChart = () => {
  if (!chartCanvas.value || store.searches.length === 0) return

  // Destroy existing chart if it exists
  if (chart) {
    chart.destroy()
  }

  console.log('📊 Creating chart with', store.searches.length, 'searches')

  const timelineData = processSearchesForTimeline()

  chart = new Chart(chartCanvas.value, {
    // ... your existing chart config ...
    type: 'line',
    data: {
      labels: timelineData.labels,
      datasets: [
        {
          label: 'Total Searches',
          data: timelineData.total,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          tension: 0.4
        },
        {
          label: 'Failed Searches',
          data: timelineData.failed,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      // ... your existing options ...
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff'
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            maxTicksLimit: 10 // Limit x-axis labels
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      }
    }
  })
}

// Watch for data changes!
watch(() => store.searches.length, (newLength) => {
  if (newLength > 0 && !chart) {
    console.log('📊 Data loaded, creating chart!')
    createChart()
  }
})

// Still try on mount in case data is already there
onMounted(() => {
  if (store.searches.length > 0) {
    createChart()
  }
})

function processSearchesForTimeline() {
  const searchesByDay = new Map<string, { total: number, failed: number }>()

  store.searches.forEach(search => {
    const date = new Date(search.timestamp).toLocaleDateString()
    if (!searchesByDay.has(date)) {
      searchesByDay.set(date, { total: 0, failed: 0 })
    }
    const day = searchesByDay.get(date)!
    day.total++
    if (search.num_found === 0) {
      day.failed++
    }
  })

  const sortedDates = Array.from(searchesByDay.keys()).sort()

  return {
    labels: sortedDates.slice(-30),
    total: sortedDates.slice(-30).map(date => searchesByDay.get(date)?.total || 0),
    failed: sortedDates.slice(-30).map(date => searchesByDay.get(date)?.failed || 0)
  }
}
</script>