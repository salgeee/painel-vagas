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
    
    // Query base
    let query = supabase
      .from('vagas')
      .select('*', { count: 'exact' })
      .order('data', { ascending: true })
      .order('horario', { ascending: true })
    
    // Filtro de vagas não vencidas (data >= hoje)
    if (!mostrarVencidas) {
      const agora = new Date()
      const hoje = agora.toISOString().split('T')[0]
      const horario = agora.toTimeString().slice(0, 8)
      query = query.or(`data.gt.${hoje},and(data.eq.${hoje},horario.gte.${horario})`)
    }
    
    // Filtros opcionais
    if (municipio) {
      query = query.ilike('municipio', `%${municipio}%`)
    }

    if (regional) {
      query = query.ilike('regional', `%${regional}%`)
    }
    
    if (cargo) {
      query = query.ilike('cargo', `%${cargo}%`)
    }

    if (categoria) {
      query = query.ilike('categoria', `%${categoria}%`)
    }
    
    if (turno) {
      query = query.ilike('turno', `%${turno}%`)
    }
    
    const { data, error, count } = await query.range(safeOffset, safeOffset + safeLimit - 1)
    
    if (error) {
      console.error('Erro ao buscar vagas:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar vagas' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      data: data || [],
      count: count ?? 0,
      offset: safeOffset,
      limit: safeLimit,
    })
  } catch (e) {
    console.error('Erro na API:', e)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
