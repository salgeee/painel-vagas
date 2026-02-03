import type { UserLocation } from './types'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
const OSRM_URL = 'https://router.project-osrm.org'

// Geocodifica um endereço usando Nominatim (gratuito)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null
  
  try {
    const query = encodeURIComponent(address)
    const url = `${NOMINATIM_URL}/search?q=${query}&format=json&limit=1&countrycodes=br`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PainelVagas/1.0 (https://github.com/user/painel-vagas)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
    }
    
    const data = await response.json()
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }
    }
  } catch (e) {
    console.error('Erro geocoding:', e)
  }
  
  return null
}

// Calcula distância de carro usando OSRM (gratuito)
export async function getRouteDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<number | null> {
  try {
    // OSRM usa formato: longitude,latitude
    const url = `${OSRM_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`OSRM error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      // Retorna distância em km
      return data.routes[0].distance / 1000
    }
  } catch (e) {
    console.error('Erro OSRM:', e)
  }
  
  return null
}

// Calcula distância em linha reta (Haversine) - fallback
export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Raio da Terra em km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Salva localização do usuário no localStorage
export function saveUserLocation(location: UserLocation): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userLocation', JSON.stringify(location))
  }
}

// Recupera localização do usuário do localStorage
export function getUserLocation(): UserLocation | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('userLocation')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
  }
  return null
}

// Remove localização do usuário
export function clearUserLocation(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userLocation')
  }
}

// --- Cache de distâncias no localStorage ---
const DISTANCE_CACHE_PREFIX = 'distanceCache_'
const CACHE_KEY_PRECISION = 5 // casas decimais para lat/lng

function getLocationCacheKey(location: UserLocation): string {
  return `${location.lat.toFixed(CACHE_KEY_PRECISION)}_${location.lng.toFixed(CACHE_KEY_PRECISION)}`
}

/** Retorna o cache de distâncias para a localização do usuário (vagaId -> km) */
export function getDistanceCache(location: UserLocation): Record<string, number> | null {
  if (typeof window === 'undefined') return null
  try {
    const key = DISTANCE_CACHE_PREFIX + getLocationCacheKey(location)
    const stored = localStorage.getItem(key)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Record<string, number>
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

/** Salva/atualiza o cache de distâncias para a localização do usuário */
export function setDistanceCache(location: UserLocation, cache: Record<string, number>): void {
  if (typeof window === 'undefined') return
  try {
    const key = DISTANCE_CACHE_PREFIX + getLocationCacheKey(location)
    // Manter limite razoável para não estourar localStorage (~5MB)
    const entries = Object.entries(cache)
    const toKeep = entries.length > 800 ? entries.slice(-800) : entries
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(toKeep)))
  } catch {
    // Ignora falha (quota excedida, etc.)
  }
}
