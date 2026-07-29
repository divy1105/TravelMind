export type FeaturedCity = {
  id: string
  name: string
  country: string
  lat: number
  lng: number
  /** Editorial still for mosaic (Unsplash, no API key). */
  imageUrl: string
  blurb: string
}

export const FEATURED_CITIES: FeaturedCity[] = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    imageUrl:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
    blurb: 'Neon alleys, quiet shrines, and night trains.',
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    imageUrl:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
    blurb: 'River light, museums, and long café afternoons.',
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'USA',
    lat: 40.7128,
    lng: -74.006,
    imageUrl:
      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80',
    blurb: 'Skyline energy with neighborhoods that feel like cities.',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
    imageUrl:
      'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=900&q=80',
    blurb: 'Harbor mornings and coastal walks that stretch for days.',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    lat: 30.0444,
    lng: 31.2357,
    imageUrl:
      'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=900&q=80',
    blurb: 'Ancient stone, Nile evenings, and market spice.',
  },
]
