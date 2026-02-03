import { createServiceClient } from './supabase'
import type { VagaInsert, ScrapeResult, ScrapeStatusType } from './types'
import { createHash } from 'crypto'

const BASE_URL = 'https://controlequadropessoal.educacao.mg.gov.br'
const DIVULGACAO_PATH = '/divulgacao/7/40/7020'
const FETCH_TIMEOUT = 30000 // 30 segundos

// Helper para limpar texto HTML
function clean(s: string = ''): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Helper para normalizar string (remove acentos e uppercase)
function normalize(s: string = ''): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

// Converte data BR para ISO
function toISODateBR(d: string = ''): string {
  const m = String(d).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d
}

// Gera hash SHA1 para UID
function makeHash(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 16)
}

// Resultado do fetch com informações de erro
interface FetchResult {
  ok: boolean
  status: number
  html: string
  error?: string
}

// Headers idênticos ao Chrome ao acessar o site (copiados do DevTools)
const BROWSER_HEADERS: Record<string, string> = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'max-age=0',
  'Sec-Ch-Ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
}

// --- Cookie Jar (sessão real dentro da mesma execução) ---
type CookieJar = Record<string, string>

function parseSetCookieHeader(headerValue: string): { name: string; value: string } | null {
  const eq = headerValue.indexOf('=')
  if (eq === -1) return null
  const name = headerValue.slice(0, eq).trim()
  const valueOnly = headerValue.slice(eq + 1).split(';')[0].trim()
  return { name, value: valueOnly }
}

function updateJarFromResponse(jar: CookieJar, response: Response): void {
  const setCookies: string[] =
    typeof (response.headers as Headers & { getSetCookie?(): string[] }).getSetCookie === 'function'
      ? (response.headers as Headers & { getSetCookie(): string[] }).getSetCookie()
      : []
  if (setCookies.length === 0) {
    const single = response.headers.get('set-cookie')
    if (single) setCookies.push(single)
  }
  for (const raw of setCookies) {
    const parsed = parseSetCookieHeader(raw)
    if (parsed) jar[parsed.name] = parsed.value
  }
}

function buildCookieHeader(jar: CookieJar): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
}

/** Headers para cada fetch (Cookie: do jar ou SCRAPE_COOKIE se definido) */
function getFetchHeaders(jar?: CookieJar): Record<string, string> {
  const headers = { ...BROWSER_HEADERS }
  const envCookie = process.env.SCRAPE_COOKIE?.trim()
  if (envCookie) {
    headers['Cookie'] = envCookie
  } else if (jar && Object.keys(jar).length > 0) {
    headers['Cookie'] = buildCookieHeader(jar)
  }
  return headers
}

// Busca HTML de uma URL com timeout e tratamento de erros. Se jar for passado, envia Cookie e atualiza com Set-Cookie.
async function fetchHtml(url: string, jar?: CookieJar): Promise<FetchResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const response = await fetch(url, {
      headers: getFetchHeaders(jar),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (jar) {
      updateJarFromResponse(jar, response)
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        html: '',
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const buffer = await response.arrayBuffer()
    const decoder = new TextDecoder('iso-8859-1')
    const html = decoder.decode(buffer)

    return {
      ok: true,
      status: response.status,
      html,
    }
  } catch (e) {
    clearTimeout(timeoutId)

    const error = e as Error

    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 0,
        html: '',
        error: 'Timeout: servidor não respondeu em 30 segundos',
      }
    }

    return {
      ok: false,
      status: 0,
      html: '',
      error: `Erro de conexão: ${error.message}`,
    }
  }
}

// Verifica se o HTML contém a estrutura esperada do site
function isValidStructure(html: string): boolean {
  const hasTable = html.includes('class="tabela') || html.includes('class=\'tabela')
  const hasEducacao = html.toLowerCase().includes('educacao') || html.toLowerCase().includes('educação')
  const hasDivulgacao = html.toLowerCase().includes('divulgacao') || html.toLowerCase().includes('divulgação')
  
  return hasTable || (hasEducacao && hasDivulgacao)
}

// Descobre quantas páginas existem
function discoverPages(html: string): number {
  const m = html.match(/Página\s+(\d+)\s+de\s+(\d+)/i)
  if (m) {
    return parseInt(m[2], 10) || 1
  }
  
  const pages = [...html.matchAll(/\/page:(\d+)/gi)].map(x => parseInt(x[1], 10))
  if (pages.length) {
    return Math.max(...pages)
  }
  
  return 1
}

// Extrai links de editais de uma página
interface EditalLink {
  urlEdital: string
  regional?: string
  municipio?: string
  escola?: string
  cargo?: string
  categoria?: string
  conteudo?: string
}

function extractEditalLinks(html: string): EditalLink[] {
  const links: EditalLink[] = []
  
  const tbMatch = html.match(/<table[^>]*class="tabela\s+seletor"[^>]*>([\s\S]*?)<\/table>/i)
  if (!tbMatch) return links
  
  const tb = tbMatch[1]
  const rows = [...tb.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)]
  
  for (const r of rows) {
    const tds = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => clean(m[1]))
    if (tds.length < 7) continue
    
    const urlMatch = r[1].match(/<a[^>]*class="icone\s+popup"[^>]*\surl="([^"]+)"/i)
    if (!urlMatch) continue
    
    links.push({
      urlEdital: urlMatch[1],
      regional: tds[0],
      municipio: tds[1],
      escola: tds[2],
      cargo: tds[3],
      categoria: tds[4],
      conteudo: tds[5],
    })
  }
  
  return links
}

// Parseia o HTML de um edital individual
function parseEdital(html: string, urlEdital: string): VagaInsert | null {
  const municipio = clean(html.match(/<b>\s*Munic[^:]*:\s*<\/b>\s*([^<]+)/i)?.[1] || '')
  
  const unidRaw = clean(html.match(/<b>\s*Unidade\s+de\s+Ensino:\s*<\/b>\s*([^<]+)/i)?.[1] || '')
  let escolaCodigo = ''
  let escola = unidRaw
  const mUE = unidRaw.match(/^(\d+)\s*-\s*(.*)$/)
  if (mUE) {
    escolaCodigo = mUE[1]
    escola = mUE[2]
  }
  
  const data = html.match(/<b>\s*Data\s*:\s*<\/b>\s*([\d/]+)/i)?.[1] || ''
  
  let horarioTexto = clean(html.match(/<b>\s*Hor[^<]*?rio\s*:\s*<\/b>\s*([^<]+)/i)?.[1] || '')
  if (!horarioTexto) {
    const near = html.match(/Hor[^<]{0,10}rio\s*:\s*<\/b>\s*([^<]+)/i)
    if (near) horarioTexto = clean(near[1])
  }
  
  let horario = ''
  const m1 = horarioTexto.match(/\b(\d{1,2})\s*hora/i)
  const m2 = horarioTexto.match(/\b(\d{1,2})(?:[:h](\d{2}))?\b/)
  
  let hh: string | null = null
  let mm = '00'
  if (m1) {
    hh = m1[1]
  } else if (m2) {
    hh = m2[1]
    if (m2[2]) mm = m2[2]
  }
  if (hh != null) {
    horario = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  
  const endereco = clean(html.match(/<b>\s*Endere[^:]*:\s*<\/b>\s*([\s\S]*?)<\/td>/i)?.[1] || '')
  
  let cargo = '', categoria = '', natureza = '', conteudo = '', nivel = ''
  let turno = '', periodoInicial = '', periodoFinal = '', observacoes = ''
  
  const row = html.match(/<table\s+class="tabela">[\s\S]*?<tr>[\s\S]*?<\/tr>\s*<tr>[\s\S]*?<\/tr>\s*<tr>([\s\S]*?)<\/tr>/i)
  if (row) {
    const tds = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => clean(m[1]))
    cargo = tds[0] || ''
    categoria = tds[1] || ''
    natureza = tds[2] || ''
    conteudo = tds[4] || ''
    nivel = tds[5] || ''
    turno = tds[6] || ''
    periodoInicial = tds[9] || ''
    periodoFinal = tds[10] || ''
    observacoes = tds[11] || ''
  }
  
  if (!horarioTexto && !horario) {
    console.log('Horário não encontrado para:', urlEdital)
    return null
  }
  
  // Gera UID único baseado nos campos principais
  const base = [
    normalize(escolaCodigo),
    normalize(toISODateBR(data)),
    normalize(horario),
    normalize(cargo),
    normalize(categoria),
    normalize(natureza),
    normalize(turno),
    normalize(conteudo),
  ].join('|')
  
  const uid = makeHash(base)
  
  return {
    uid,
    escola_codigo: escolaCodigo || null,
    escola: escola || null,
    municipio: municipio || null,
    data: data ? toISODateBR(data) : null,
    horario: horario || null,
    endereco: endereco || null,
    cargo: cargo || null,
    categoria: categoria || null,
    natureza: natureza || null,
    conteudo: conteudo || null,
    nivel: nivel || null,
    turno: turno || null,
    periodo_inicial: periodoInicial ? toISODateBR(periodoInicial) : null,
    periodo_final: periodoFinal ? toISODateBR(periodoFinal) : null,
    observacoes: observacoes || null,
    url_edital: urlEdital,
  }
}

// Salva o status do scraping no Supabase
async function saveScrapingStatus(
  status: ScrapeStatusType,
  message: string,
  vagasEncontradas: number,
  httpStatus: number | null,
  durationSeconds: number
): Promise<void> {
  try {
    const supabase = createServiceClient()
    
    await supabase.from('scrape_status').insert({
      status,
      message,
      vagas_encontradas: vagasEncontradas,
      http_status: httpStatus,
      duration_seconds: durationSeconds,
    })
  } catch (e) {
    console.error('Erro ao salvar status:', e)
  }
}

// Função principal de scraping
export async function scrapeVagas(): Promise<ScrapeResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const vagasMap = new Map<string, VagaInsert>() // Usa Map para deduplicar por UID
  let httpStatus: number | undefined
  
  const getDuration = () => (Date.now() - startTime) / 1000
  
  try {
    // 0. Cookie jar: sessão real — visita a homepage para obter DESIGNACAO/ROUTEID e reutiliza em todas as requisições
    const cookieJar: CookieJar = {}
    console.log('Obtendo cookies de sessão (homepage)...')
    await fetchHtml(`${BASE_URL}/`, cookieJar)
    if (Object.keys(cookieJar).length > 0) {
      console.log('Cookies obtidos:', Object.keys(cookieJar).join(', '))
    }

    // 1. Buscar primeira página para descobrir total
    console.log('Buscando página inicial...')
    const firstPageResult = await fetchHtml(`${BASE_URL}${DIVULGACAO_PATH}`, cookieJar)
    httpStatus = firstPageResult.status
    
    if (!firstPageResult.ok) {
      const result: ScrapeResult = {
        status: 'FONTE_INDISPONIVEL',
        message: `Não foi possível acessar o site da SEE/MG: ${firstPageResult.error}`,
        count: 0,
        httpStatus: firstPageResult.status,
        errors: [firstPageResult.error || 'Erro desconhecido'],
        durationSeconds: getDuration(),
      }
      
      await saveScrapingStatus(result.status, result.message, result.count, result.httpStatus || null, result.durationSeconds!)
      return result
    }
    
    if (!isValidStructure(firstPageResult.html)) {
      const result: ScrapeResult = {
        status: 'ESTRUTURA_INVALIDA',
        message: 'O site da SEE/MG retornou uma página com estrutura inesperada. O site pode estar em manutenção.',
        count: 0,
        httpStatus: firstPageResult.status,
        errors: ['Estrutura HTML não reconhecida'],
        durationSeconds: getDuration(),
      }
      
      await saveScrapingStatus(result.status, result.message, result.count, result.httpStatus || null, result.durationSeconds!)
      return result
    }
    
    const totalPages = discoverPages(firstPageResult.html)
    console.log(`Total de páginas: ${totalPages}`)
    
    // 2. Coletar links de todas as páginas
    const allLinks: EditalLink[] = []
    
    // Processar primeira página
    const firstPageLinks = extractEditalLinks(firstPageResult.html)
    allLinks.push(...firstPageLinks)
    
    // Processar páginas restantes (em paralelo, máximo 3 de cada vez)
    const pagePromises: Promise<EditalLink[]>[] = []
    
    for (let page = 2; page <= totalPages; page++) {
      const url = `${BASE_URL}${DIVULGACAO_PATH}/page:${page}`
      
      pagePromises.push(
        (async () => {
          console.log(`Buscando página ${page}/${totalPages}...`)
          const pageResult = await fetchHtml(url, cookieJar)
          if (pageResult.ok) {
            return extractEditalLinks(pageResult.html)
          } else {
            errors.push(`Erro na página ${page}: ${pageResult.error}`)
            return []
          }
        })()
      )
      
      // Executar em batches de 3 páginas
      if (pagePromises.length >= 3 || page === totalPages) {
        const results = await Promise.all(pagePromises)
        results.forEach(links => allLinks.push(...links))
        pagePromises.length = 0
        await new Promise(r => setTimeout(r, 100)) // Pequena pausa entre batches
      }
    }
    
    console.log(`Total de editais encontrados: ${allLinks.length}`)
    
    if (allLinks.length === 0) {
      const result: ScrapeResult = {
        status: 'SEM_VAGAS',
        message: 'Não há vagas disponíveis no momento no site da SEE/MG.',
        count: 0,
        httpStatus,
        errors,
        durationSeconds: getDuration(),
      }
      
      await saveScrapingStatus(result.status, result.message, result.count, result.httpStatus || null, result.durationSeconds!)
      return result
    }
    
    // 3. Buscar editais em paralelo (batches de 5)
    const editalBatchSize = 5
    for (let i = 0; i < allLinks.length; i += editalBatchSize) {
      const batch = allLinks.slice(i, i + editalBatchSize)
      
      const batchPromises = batch.map(async (link, idx) => {
        console.log(`Processando edital ${i + idx + 1}/${allLinks.length}`)
        try {
          const editalResult = await fetchHtml(link.urlEdital, cookieJar)
          if (!editalResult.ok) {
            errors.push(`Erro ao buscar edital: ${editalResult.error}`)
            return null
          }
          return parseEdital(editalResult.html, link.urlEdital)
        } catch (e) {
          errors.push(`Erro ao processar edital: ${e}`)
          return null
        }
      })
      
      const results = await Promise.all(batchPromises)
      
      // Adiciona ao Map (deduplica automaticamente pelo UID)
      results.forEach(vaga => {
        if (vaga) {
          vagasMap.set(vaga.uid, vaga)
        }
      })
      
      // Pequena pausa entre batches de editais
      if (i + editalBatchSize < allLinks.length) {
        await new Promise(r => setTimeout(r, 50))
      }
    }
    
    // Converter Map para array
    const vagas = Array.from(vagasMap.values())
    
    // 4. Upsert no Supabase (deduplicado)
    if (vagas.length > 0) {
      console.log(`Salvando ${vagas.length} vagas no Supabase...`)
      const supabase = createServiceClient()
      
      // Salvar em batches de 50
      const saveBatchSize = 50
      for (let i = 0; i < vagas.length; i += saveBatchSize) {
        const batch = vagas.slice(i, i + saveBatchSize)
        
        const { error } = await supabase
          .from('vagas')
          .upsert(batch, { onConflict: 'uid' })
        
        if (error) {
          console.error('Erro ao salvar batch:', error)
          errors.push(`Erro ao salvar: ${error.message}`)
        }
      }
    }
    
    const duration = getDuration()
    console.log(`Scraping concluído em ${duration.toFixed(1)}s`)
    
    const result: ScrapeResult = {
      status: 'OK',
      message: `Scraping concluído com sucesso. ${vagas.length} vagas encontradas.`,
      count: vagas.length,
      httpStatus,
      errors,
      durationSeconds: duration,
    }
    
    await saveScrapingStatus(result.status, result.message, result.count, result.httpStatus || null, result.durationSeconds!)
    return result
    
  } catch (e) {
    const errorMsg = `Erro fatal no scraping: ${e}`
    console.error(errorMsg)
    
    const result: ScrapeResult = {
      status: 'ERRO',
      message: 'Ocorreu um erro interno durante o scraping.',
      count: 0,
      httpStatus,
      errors: [errorMsg, ...errors],
      durationSeconds: getDuration(),
    }
    
    await saveScrapingStatus(result.status, result.message, result.count, result.httpStatus || null, result.durationSeconds!)
    return result
  }
}
