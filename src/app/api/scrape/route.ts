import { NextResponse } from 'next/server'
import { scrapeVagas } from '@/lib/scraper'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos (máximo para Vercel Pro)

export async function POST(request: Request) {
  try {
    // Verificar segredo de autenticação
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.SCRAPE_SECRET
    
    if (!expectedSecret) {
      console.error('SCRAPE_SECRET não configurado')
      return NextResponse.json(
        { error: 'Servidor não configurado corretamente' },
        { status: 500 }
      )
    }
    
    // Aceita tanto Bearer token quanto query param
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')
    const bearerToken = authHeader?.replace('Bearer ', '')
    
    const providedSecret = bearerToken || querySecret
    
    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    console.log('Iniciando scraping...')
    const startTime = Date.now()
    
    const result = await scrapeVagas()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`Scraping concluído em ${duration}s`)
    
    return NextResponse.json({
      ...result,
      duration: `${duration}s`,
    })
  } catch (e) {
    console.error('Erro no endpoint de scraping:', e)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(e) },
      { status: 500 }
    )
  }
}

// GET para verificar status (sem executar scraping)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Endpoint de scraping. Use POST com autenticação para executar.',
  })
}
