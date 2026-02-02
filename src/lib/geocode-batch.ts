/**
 * Geocoding em lote (rodar depois do scrape, em chamada separada).
 * - Só processa vagas sem lat/lng.
 * - Consulta a tabela geocode_cache; se o endereço já estiver no cache, não chama Nominatim.
 * - Salva no cache todo endereço geocodificado para não ter que pegar novamente (1 req/s).
 */

import { createServiceClient } from './supabase'
import { geocodeAddress } from './distance'

const NOMINATIM_DELAY_MS = 1100 // 1 req/s conforme política do Nominatim

/** Normaliza texto para chave: remove acentos, pontuação extra e espaços duplos (unifica variantes do mesmo endereço). */
function normalizeForKey(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[\s\-_,.;:]+/g, ' ')
      .replace(/\s*(nº?|numero)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function buildAddressKey(endereco: string | null, municipio: string | null): string {
  const parts = [endereco, municipio].filter(Boolean).map(s => String(s).trim())
  const raw = parts.join(' ')
  return raw ? normalizeForKey(raw) : ''
}

function buildSearchQuery(endereco: string | null, municipio: string | null): string {
  const parts = [endereco, municipio].filter(Boolean).map(s => String(s).trim())
  return parts.join(', ') || ''
}

export interface GeocodeBatchResult {
  ok: boolean
  vagasAtualizadas: number
  enderecosNovos: number
  enderecosCache: number
  erros: string[]
  durationSeconds: number
}

export async function geocodeVagasBatch(): Promise<GeocodeBatchResult> {
  const start = Date.now()
  const errors: string[] = []
  let vagasAtualizadas = 0
  let enderecosNovos = 0
  let enderecosCache = 0

  try {
    const supabase = createServiceClient()

    // 1. Buscar vagas sem coordenadas
    const { data: vagasSemCoords, error: fetchError } = await supabase
      .from('vagas')
      .select('id, endereco, municipio')
      .is('lat', null)
      .or('endereco.not.is.null,municipio.not.is.null')

    if (fetchError) {
      errors.push(`Erro ao buscar vagas: ${fetchError.message}`)
      return {
        ok: false,
        vagasAtualizadas: 0,
        enderecosNovos: 0,
        enderecosCache: 0,
        erros: errors,
        durationSeconds: (Date.now() - start) / 1000,
      }
    }

    if (!vagasSemCoords?.length) {
      return {
        ok: true,
        vagasAtualizadas: 0,
        enderecosNovos: 0,
        enderecosCache: 0,
        erros: [],
        durationSeconds: (Date.now() - start) / 1000,
      }
    }

    // 2. Agrupar por chave normalizada (endereço + município) — variantes viram uma só chave
    const groupByKey = new Map<string, { query: string; municipio: string | null; ids: string[] }>()
    for (const v of vagasSemCoords) {
      const key = buildAddressKey(v.endereco, v.municipio)
      if (!key) continue
      const query = buildSearchQuery(v.endereco, v.municipio)
      const existing = groupByKey.get(key)
      if (existing) {
        existing.ids.push(v.id)
      } else {
        groupByKey.set(key, { query, municipio: v.municipio ?? null, ids: [v.id] })
      }
    }

    const uniqueKeys = Array.from(groupByKey.keys())
    console.log(`Geocode batch: ${vagasSemCoords.length} vagas sem coords, ${uniqueKeys.length} endereços únicos`)

    // 3. Buscar cache em lote (todos os keys de uma vez)
    const { data: cachedRows, error: cacheError } = await supabase
      .from('geocode_cache')
      .select('address_key, lat, lng')
      .in('address_key', uniqueKeys)

    if (cacheError) {
      errors.push(`Erro ao ler cache: ${cacheError.message}`)
    }

    const cache = new Map<string, { lat: number; lng: number }>()
    for (const row of cachedRows || []) {
      cache.set(row.address_key, { lat: row.lat, lng: row.lng })
    }

    // 4. Para cada key: usar cache ou chamar Nominatim (1 req/s), depois atualizar vagas
    for (const key of uniqueKeys) {
      const { query, municipio, ids } = groupByKey.get(key)!
      let lat: number
      let lng: number

      const cached = cache.get(key)
      if (cached) {
        lat = cached.lat
        lng = cached.lng
        enderecosCache += 1
      } else {
        let coords = await geocodeAddress(query)
        await new Promise(r => setTimeout(r, NOMINATIM_DELAY_MS))
        // Fallback: se endereço completo falhar, tenta só "Município, MG, Brasil"
        if (!coords && municipio) {
          const fallbackQuery = `${municipio}, MG, Brasil`
          coords = await geocodeAddress(fallbackQuery)
          await new Promise(r => setTimeout(r, NOMINATIM_DELAY_MS))
        }
        if (!coords) {
          errors.push(`Geocode falhou: ${query}`)
          continue
        }
        lat = coords.lat
        lng = coords.lng
        enderecosNovos += 1
        // Salvar no cache para não ter que chamar Nominatim de novo neste endereço
        await supabase
          .from('geocode_cache')
          .upsert({ address_key: key, lat, lng, updated_at: new Date().toISOString() }, { onConflict: 'address_key' })
      }

      const { error: updateError } = await supabase
        .from('vagas')
        .update({ lat, lng, updated_at: new Date().toISOString() })
        .in('id', ids)

      if (updateError) {
        errors.push(`Erro ao atualizar vagas: ${updateError.message}`)
      } else {
        vagasAtualizadas += ids.length
      }
    }

    const durationSeconds = (Date.now() - start) / 1000
    console.log(`Geocode batch concluído: ${vagasAtualizadas} vagas atualizadas em ${durationSeconds.toFixed(1)}s (${enderecosCache} cache, ${enderecosNovos} novos)`)

    return {
      ok: errors.length === 0,
      vagasAtualizadas,
      enderecosNovos,
      enderecosCache,
      erros: errors,
      durationSeconds,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(msg)
    console.error('Erro no geocode batch:', e)
    return {
      ok: false,
      vagasAtualizadas,
      enderecosNovos,
      enderecosCache,
      erros: errors,
      durationSeconds: (Date.now() - start) / 1000,
    }
  }
}
