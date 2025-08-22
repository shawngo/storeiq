export interface Search {
  qid: number
  timestamp: number
  latitude: number
  longitude: number
  radiusMiles: number
  numFound: number
  locality?: string
  administrativeArea?: string
  country?: string
  ipAddress: string
  uid?: number
}

export interface PlaybackState {
  isPlaying: boolean
  speed: number
  currentTime: number
  startDate: Date
  endDate: Date
  filters: {
    showSuccess: boolean
    showLimited: boolean
    showNoResults: boolean
  }
}

export interface Stats {
  total: number
  played: number
  successful: number
  limited: number
  noResults: number
  noResultsRate: number
}