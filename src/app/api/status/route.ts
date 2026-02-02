import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ScrapeStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Buscar o último status de scraping
    const { data, error } = await supabase
      .from('scrape_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      // Se não há registros, retorna status inicial
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          status: null,
          message: 'Nenhum scraping foi executado ainda.',
          lastUpdate: null,
          isStale: true,
        })
      }
      
      console.error('Erro ao buscar status:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar status' },
        { status: 500 }
      )
    }
    
    const scrapeStatus = data as ScrapeStatus
    
    // Verificar se os dados estão desatualizados (mais de 24 horas)
    const lastUpdate = new Date(scrapeStatus.created_at)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    const isStale = hoursSinceUpdate > 24
    
    return NextResponse.json({
      status: scrapeStatus.status,
      message: scrapeStatus.message,
      vagasEncontradas: scrapeStatus.vagas_encontradas,
      httpStatus: scrapeStatus.http_status,
      durationSeconds: scrapeStatus.duration_seconds,
      lastUpdate: scrapeStatus.created_at,
      isStale,
      hoursSinceUpdate: Math.round(hoursSinceUpdate * 10) / 10,
    })
  } catch (e) {
    console.error('Erro na API de status:', e)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
