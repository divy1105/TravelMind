export type FeaturedCity = {
  id: string
  name: string
  country: string
  lat: number
  lng: number
}

export const FEATURED_CITIES: FeaturedCity[] = [
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { id: 'new-york', name: 'New York', country: 'USA', lat: 40.7128, lng: -74.006 },
  { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 }
]
