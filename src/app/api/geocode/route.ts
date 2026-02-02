import { NextResponse } from 'next/server'
import { geocodeVagasBatch } from '@/lib/geocode-batch'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos (Nominatim 1 req/s pode demorar)

/**
 * Geocode em lote: só vagas sem lat/lng.
 * Usa e preenche o cache (geocode_cache) para não repetir Nominatim.
 * Chamar depois do scrape para o site já ter as vagas disponíveis.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.SCRAPE_SECRET

    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'SCRAPE_SECRET não configurado' },
        { status: 500 }
      )
    }

    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const providedSecret = bearerToken || querySecret

    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('Iniciando geocode em lote...')
    const result = await geocodeVagasBatch()
    console.log(
      `Geocode concluído: ${result.vagasAtualizadas} vagas (${result.enderecosCache} cache, ${result.enderecosNovos} novos) em ${result.durationSeconds.toFixed(1)}s`
    )

    return NextResponse.json({
      ok: result.ok,
      vagasAtualizadas: result.vagasAtualizadas,
      enderecosNovos: result.enderecosNovos,
      enderecosCache: result.enderecosCache,
      erros: result.erros,
      duration: `${result.durationSeconds.toFixed(2)}s`,
    }, { status: result.ok ? 200 : 500 })
  } catch (e) {
    console.error('Erro no endpoint de geocode:', e)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(e) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Geocode em lote. Use POST com autenticação (mesmo secret do scrape).',
  })
}
