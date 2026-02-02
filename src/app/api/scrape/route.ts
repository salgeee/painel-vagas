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
    
    const result = await scrapeVagas()
    
    console.log(`Scraping concluído: ${result.status} - ${result.count} vagas`)
    
    // Geocode roda em chamada separada (POST /api/geocode) para o site já exibir as vagas sem esperar lat/lng
    
    // Determinar código HTTP baseado no status
    let httpCode = 200
    
    switch (result.status) {
      case 'OK':
        httpCode = 200
        break
      case 'SEM_VAGAS':
        // 200 porque funcionou, só não tinha dados
        httpCode = 200
        break
      case 'FONTE_INDISPONIVEL':
        // 502 Bad Gateway - o upstream (site da SEE) falhou
        httpCode = 502
        break
      case 'ESTRUTURA_INVALIDA':
        // 502 Bad Gateway - resposta do upstream inválida
        httpCode = 502
        break
      case 'ERRO':
        // 500 Internal Server Error - erro nosso
        httpCode = 500
        break
    }
    
    return NextResponse.json({
      status: result.status,
      message: result.message,
      count: result.count,
      httpStatus: result.httpStatus,
      errors: result.errors,
      duration: `${result.durationSeconds?.toFixed(2)}s`,
    }, { status: httpCode })
    
  } catch (e) {
    console.error('Erro no endpoint de scraping:', e)
    return NextResponse.json(
      { 
        status: 'ERRO',
        error: 'Erro interno do servidor', 
        details: String(e) 
      },
      { status: 500 }
    )
  }
}

// GET para verificar status (sem executar scraping)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Endpoint de scraping. Use POST com autenticação para executar.',
    documentation: {
      method: 'POST',
      authentication: 'Bearer token ou query param ?secret=',
      responses: {
        200: 'OK ou SEM_VAGAS - scraping executou com sucesso',
        401: 'Não autorizado - secret inválido',
        500: 'Erro interno do servidor',
        502: 'Bad Gateway - site fonte indisponível ou com estrutura inválida',
      }
    }
  })
}
