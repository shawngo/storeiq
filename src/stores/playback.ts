import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlaybackStore = defineStore('playback', () => {
  const stats = ref({
    total: 229558,
    noResultsRate: 20.6
  })

  const initialize = async () => {
    console.log('Store initialized')
  }

  return { stats, initialize }
})
