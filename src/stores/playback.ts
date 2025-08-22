import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface Search {
  qid: number
  timestamp: string
  latitude: number
  longitude: number
  radius_miles: number
  num_found: number
  locality: string
  administrative_area: string
  country: string
  ip_address: string
  uid: number
}

interface Stats {
  total: number
  no_results: number
  limited: number
  successful: number
  no_results_rate: number
}

export const usePlaybackStore = defineStore('playback', () => {
  // State
  const searches = ref<Search[]>([])
  const stats = ref<Stats>({
    total: 0,
    no_results: 0,
    limited: 0,
    successful: 0,
    no_results_rate: 0
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasData = computed(() => searches.value.length > 0)

  // Actions
  const fetchPlaybackData = async (startDate: string, endDate: string) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get('/api/playback-data', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      })

      searches.value = response.data.searches
      stats.value = response.data.stats

      console.log(`✅ Loaded ${searches.value.length} searches!`)
      console.log(`📊 No Results Rate: ${stats.value.no_results_rate}%`)

    } catch (err) {
      console.error('Failed to fetch playback data:', err)
      error.value = 'Failed to load data'
    } finally {
      loading.value = false
    }
  }

  const initialize = async () => {
    // Load last 30 days by default
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    await fetchPlaybackData(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )
  }

  return {
    searches,
    stats,
    loading,
    error,
    hasData,
    fetchPlaybackData,
    initialize
  }
})