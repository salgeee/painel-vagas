import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const municipio = searchParams.get('municipio')
    const cargo = searchParams.get('cargo')
    const turno = searchParams.get('turno')
    const mostrarVencidas = searchParams.get('mostrarVencidas') === 'true'
    
    // Query base
    let query = supabase
      .from('vagas')
      .select('*')
      .order('data', { ascending: true })
      .order('horario', { ascending: true })
    
    // Filtro de vagas não vencidas (data >= hoje)
    if (!mostrarVencidas) {
      const hoje = new Date().toISOString().split('T')[0]
      query = query.gte('data', hoje)
    }
    
    // Filtros opcionais
    if (municipio) {
      query = query.ilike('municipio', `%${municipio}%`)
    }
    
    if (cargo) {
      query = query.ilike('cargo', `%${cargo}%`)
    }
    
    if (turno) {
      query = query.ilike('turno', `%${turno}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Erro ao buscar vagas:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar vagas' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data || [])
  } catch (e) {
    console.error('Erro na API:', e)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
