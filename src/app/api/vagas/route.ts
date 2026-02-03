import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type FiltersCacheValue = {
  regionais: string[]
  municipios: string[]
  municipiosByRegional: Record<string, string[]>
}

const FILTERS_CACHE_TTL_MS = 5 * 60 * 1000
const filtersCache = new Map<string, { expiresAt: number; value: FiltersCacheValue }>()

const getCachedFilters = (key: string): FiltersCacheValue | null => {
  const entry = filtersCache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    filtersCache.delete(key)
    return null
  }
  return entry.value
}

const setCachedFilters = (key: string, value: FiltersCacheValue) => {
  filtersCache.set(key, { expiresAt: Date.now() + FILTERS_CACHE_TTL_MS, value })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const municipio = searchParams.get('municipio')
    const regional = searchParams.get('regional')
    const cargo = searchParams.get('cargo')
    const categoria = searchParams.get('categoria')
    const turno = searchParams.get('turno')
    const mostrarVencidas = searchParams.get('mostrarVencidas') === 'true'
    const limitParam = Number(searchParams.get('limit') || '10000')
    const offsetParam = Number(searchParams.get('offset') || '0')
    const safeLimit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 10000) : 10000
    const safeOffset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0

    const getBrazilDateTime = () => {
      const now = new Date()
      const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      const timeFormatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      return {
        hoje: dateFormatter.format(now),
        horario: timeFormatter.format(now),
      }
    }
    
    const { hoje, horario } = getBrazilDateTime()
    const activeFilter = `data.gt.${hoje},and(data.eq.${hoje},horario.gte.${horario})`

    type Filterable<T> = {
      eq: (column: string, value: string) => T
    }

    const normalizeFilterValue = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()

    const applyFilters = <T extends Filterable<T>>(query: T): T => {
      let q = query
      if (municipio) q = q.eq('municipio_norm', normalizeFilterValue(municipio))
      if (regional) q = q.eq('regional_norm', normalizeFilterValue(regional))
      if (cargo) q = q.eq('cargo_norm', normalizeFilterValue(cargo))
      if (categoria) q = q.eq('categoria_norm', normalizeFilterValue(categoria))
      if (turno) q = q.eq('turno_norm', normalizeFilterValue(turno))
      return q
    }
    
    // Query base
    let query = applyFilters(
      supabase
        .from('vagas')
        .select('*', { count: 'exact' })
        .order('data', { ascending: true })
        .order('horario', { ascending: true })
    )
    
    // Filtro de vagas não vencidas (data >= hoje)
    if (!mostrarVencidas) {
      query = query.or(activeFilter)
    }

    const { data, error, count } = await query.range(safeOffset, safeOffset + safeLimit - 1)
    
    if (error) {
      console.error('Erro ao buscar vagas:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar vagas' },
        { status: 500 }
      )
    }

    const [{ count: ativasCount, error: ativasError }, { count: hojeCount, error: hojeError }] =
      await Promise.all([
        supabase
          .from('vagas')
          .select('id', { count: 'exact', head: true })
          .or(activeFilter),
        supabase
          .from('vagas')
          .select('id', { count: 'exact', head: true })
          .eq('data', hoje),
      ])

    if (ativasError || hojeError) {
      console.error('Erro ao calcular stats:', ativasError || hojeError)
    }

    const cacheKey = 'global'
    let cachedFilters = getCachedFilters(cacheKey)

    if (!cachedFilters) {
      const municipiosSet = new Set<string>()
      const regionaisSet = new Set<string>()
      const municipiosByRegionalMap = new Map<string, Set<string>>()
      const statsPageSize = 1000
      let statsOffset = 0
      while (true) {
        const statsQuery = supabase
          .from('vagas')
          .select('municipio, regional')
          .order('municipio', { ascending: true })
          .range(statsOffset, statsOffset + statsPageSize - 1)

        const { data: municipiosData, error: municipiosError } = await statsQuery
        if (municipiosError) {
          console.error('Erro ao calcular municípios:', municipiosError)
          break
        }
        if (!municipiosData || municipiosData.length === 0) break
        for (const row of municipiosData) {
          if (row.municipio) municipiosSet.add(row.municipio)
          if (row.regional) regionaisSet.add(row.regional)
          if (row.regional && row.municipio) {
            if (!municipiosByRegionalMap.has(row.regional)) {
              municipiosByRegionalMap.set(row.regional, new Set())
            }
            municipiosByRegionalMap.get(row.regional)?.add(row.municipio)
          }
        }
        if (municipiosData.length < statsPageSize) break
        statsOffset += statsPageSize
      }
      
      const regionais = Array.from(regionaisSet).sort()
      const municipios = Array.from(municipiosSet).sort()
      const municipiosByRegional: Record<string, string[]> = {}
      for (const [regional, municipiosSet] of municipiosByRegionalMap.entries()) {
        municipiosByRegional[regional] = Array.from(municipiosSet).sort()
      }

      cachedFilters = { regionais, municipios, municipiosByRegional }
      setCachedFilters(cacheKey, cachedFilters)
    }

    return NextResponse.json({
      data: data || [],
      count: count ?? 0,
      offset: safeOffset,
      limit: safeLimit,
      stats: {
        total: count ?? 0,
        ativas: ativasCount ?? 0,
        hoje: hojeCount ?? 0,
        municipios: cachedFilters.municipios.length,
        hojeData: hoje,
        horarioAgora: horario,
        filters: {
          regionais: cachedFilters.regionais,
          municipios: cachedFilters.municipios,
          municipiosByRegional: cachedFilters.municipiosByRegional,
        },
      },
    })
  } catch (e) {
    console.error('Erro na API:', e)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
