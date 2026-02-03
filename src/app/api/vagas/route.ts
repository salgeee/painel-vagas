import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    const applyFilters = (query: ReturnType<typeof supabase.from>) => {
      let q = query
      if (municipio) q = q.ilike('municipio', `%${municipio}%`)
      if (regional) q = q.ilike('regional', `%${regional}%`)
      if (cargo) q = q.ilike('cargo', `%${cargo}%`)
      if (categoria) q = q.ilike('categoria', `%${categoria}%`)
      if (turno) q = q.ilike('turno', `%${turno}%`)
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
        applyFilters(
          supabase
            .from('vagas')
            .select('id', { count: 'exact', head: true })
        ).or(activeFilter),
        applyFilters(
          supabase
            .from('vagas')
            .select('id', { count: 'exact', head: true })
        ).eq('data', hoje),
      ])

    if (ativasError || hojeError) {
      console.error('Erro ao calcular stats:', ativasError || hojeError)
    }

    const municipiosSet = new Set<string>()
    const statsPageSize = 1000
    let statsOffset = 0
    while (true) {
      let statsQuery = applyFilters(
        supabase
          .from('vagas')
          .select('municipio')
          .order('municipio', { ascending: true })
          .range(statsOffset, statsOffset + statsPageSize - 1)
      )
      if (!mostrarVencidas) statsQuery = statsQuery.or(activeFilter)

      const { data: municipiosData, error: municipiosError } = await statsQuery
      if (municipiosError) {
        console.error('Erro ao calcular municípios:', municipiosError)
        break
      }
      if (!municipiosData || municipiosData.length === 0) break
      for (const row of municipiosData) {
        if (row.municipio) municipiosSet.add(row.municipio)
      }
      if (municipiosData.length < statsPageSize) break
      statsOffset += statsPageSize
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
        municipios: municipiosSet.size,
        hojeData: hoje,
        horarioAgora: horario,
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
