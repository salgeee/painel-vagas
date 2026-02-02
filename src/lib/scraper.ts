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

// Busca HTML de uma URL com timeout e tratamento de erros
async function fetchHtml(url: string): Promise<FetchResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Charset': 'ISO-8859-1,utf-8',
        'User-Agent': 'PainelVagas/1.0',
      },
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
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
  // Verifica se tem elementos característicos do site
  const hasTable = html.includes('class="tabela') || html.includes('class=\'tabela')
  const hasEducacao = html.toLowerCase().includes('educacao') || html.toLowerCase().includes('educação')
  const hasDivulgacao = html.toLowerCase().includes('divulgacao') || html.toLowerCase().includes('divulgação')
  
  return hasTable || (hasEducacao && hasDivulgacao)
}

// Descobre quantas páginas existem
function discoverPages(html: string): number {
  // Tenta "Página X de Y"
  const m = html.match(/Página\s+(\d+)\s+de\s+(\d+)/i)
  if (m) {
    return parseInt(m[2], 10) || 1
  }
  
  // Fallback: pega o maior /page:K nos links
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
  // Município
  const municipio = clean(html.match(/<b>\s*Munic[^:]*:\s*<\/b>\s*([^<]+)/i)?.[1] || '')
  
  // Unidade de Ensino
  const unidRaw = clean(html.match(/<b>\s*Unidade\s+de\s+Ensino:\s*<\/b>\s*([^<]+)/i)?.[1] || '')
  let escolaCodigo = ''
  let escola = unidRaw
  const mUE = unidRaw.match(/^(\d+)\s*-\s*(.*)$/)
  if (mUE) {
    escolaCodigo = mUE[1]
    escola = mUE[2]
  }
  
  // Data
  const data = html.match(/<b>\s*Data\s*:\s*<\/b>\s*([\d/]+)/i)?.[1] || ''
  
  // Horário (tolerante a encoding quebrado)
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
  
  // Endereço
  const endereco = clean(html.match(/<b>\s*Endere[^:]*:\s*<\/b>\s*([\s\S]*?)<\/td>/i)?.[1] || '')
  
  // Características da vaga (tabela)
  let cargo = '', categoria = '', natureza = '', conteudo = '', nivel = ''
  let turno = '', cargaHorariaRB = '', periodoInicial = '', periodoFinal = '', observacoes = ''
  
  const row = html.match(/<table\s+class="tabela">[\s\S]*?<tr>[\s\S]*?<\/tr>\s*<tr>[\s\S]*?<\/tr>\s*<tr>([\s\S]*?)<\/tr>/i)
  if (row) {
    const tds = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => clean(m[1]))
    cargo = tds[0] || ''
    categoria = tds[1] || ''
    natureza = tds[2] || ''
    conteudo = tds[4] || ''
    nivel = tds[5] || ''
    turno = tds[6] || ''
    cargaHorariaRB = tds[7] || ''
    periodoInicial = tds[9] || ''
    periodoFinal = tds[10] || ''
    observacoes = tds[11] || ''
  }
  
  // Validação: horário é obrigatório
  if (!horarioTexto && !horario) {
    console.log('Horário não encontrado para:', urlEdital)
    return null
  }
  
  // Gera UID único
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

// Geocodifica um endereço usando Nominatim (gratuito)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null
  
  try {
    const query = encodeURIComponent(`${address}, Minas Gerais, Brasil`)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PainelVagas/1.0',
      },
    })
    
    const data = await response.json()
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }
    }
  } catch (e) {
    console.error('Erro geocoding:', e)
  }
  
  return null
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
  const vagas: VagaInsert[] = []
  let httpStatus: number | undefined
  
  const getDuration = () => (Date.now() - startTime) / 1000
  
  try {
    // 1. Buscar primeira página para descobrir total
    console.log('Buscando página inicial...')
    const firstPageResult = await fetchHtml(`${BASE_URL}${DIVULGACAO_PATH}`)
    httpStatus = firstPageResult.status
    
    // Verificar se conseguiu acessar o site
    if (!firstPageResult.ok) {
      const result: ScrapeResult = {
        status: 'FONTE_INDISPONIVEL',
        message: `Não foi possível acessar o site da SEE/MG: ${firstPageResult.error}`,
        count: 0,
        httpStatus: firstPageResult.status,
        errors: [firstPageResult.error || 'Erro desconhecido'],
        durationSeconds: getDuration(),
      }
      
      await saveScrapingStatus(
        result.status,
        result.message,
        result.count,
        result.httpStatus || null,
        result.durationSeconds!
      )
      
      return result
    }
    
    // Verificar se a estrutura do HTML é válida
    if (!isValidStructure(firstPageResult.html)) {
      const result: ScrapeResult = {
        status: 'ESTRUTURA_INVALIDA',
        message: 'O site da SEE/MG retornou uma página com estrutura inesperada. O site pode estar em manutenção.',
        count: 0,
        httpStatus: firstPageResult.status,
        errors: ['Estrutura HTML não reconhecida'],
        durationSeconds: getDuration(),
      }
      
      await saveScrapingStatus(
        result.status,
        result.message,
        result.count,
        result.httpStatus || null,
        result.durationSeconds!
      )
      
      return result
    }
    
    const totalPages = discoverPages(firstPageResult.html)
    console.log(`Total de páginas: ${totalPages}`)
    
    // 2. Coletar links de todas as páginas
    const allLinks: EditalLink[] = []
    
    // Processar primeira página
    const firstPageLinks = extractEditalLinks(firstPageResult.html)
    allLinks.push(...firstPageLinks)
    
    // Processar páginas restantes
    for (let page = 2; page <= totalPages; page++) {
      const url = `${BASE_URL}${DIVULGACAO_PATH}/page:${page}`
      
      console.log(`Buscando página ${page}/${totalPages}...`)
      const pageResult = await fetchHtml(url)
      
      if (pageResult.ok) {
        const links = extractEditalLinks(pageResult.html)
        allLinks.push(...links)
      } else {
        errors.push(`Erro na página ${page}: ${pageResult.error}`)
      }
      
      await new Promise(r => setTimeout(r, 300))
    }
    
    console.log(`Total de editais encontrados: ${allLinks.length}`)
    
    // Se não encontrou nenhum edital
    if (allLinks.length === 0) {
      const result: ScrapeResult = {
        status: 'SEM_VAGAS',
        message: 'Não há vagas disponíveis no momento no site da SEE/MG.',
        count: 0,
        httpStatus,
        errors,
        durationSeconds: getDuration(),
      }
      
      await saveScrapingStatus(
        result.status,
        result.message,
        result.count,
        result.httpStatus || null,
        result.durationSeconds!
      )
      
      return result
    }
    
    // 3. Buscar cada edital
    for (let i = 0; i < allLinks.length; i++) {
      const link = allLinks[i]
      console.log(`Processando edital ${i + 1}/${allLinks.length}: ${link.urlEdital}`)
      
      try {
        const editalResult = await fetchHtml(link.urlEdital)
        
        if (!editalResult.ok) {
          errors.push(`Erro ao buscar edital ${link.urlEdital}: ${editalResult.error}`)
          continue
        }
        
        const vaga = parseEdital(editalResult.html, link.urlEdital)
        
        if (vaga) {
          // Geocodificar se tiver endereço
          if (vaga.endereco || vaga.escola) {
            const addressToGeocode = vaga.endereco 
              ? `${vaga.endereco}, ${vaga.municipio || 'Uberlândia'}`
              : `${vaga.escola}, ${vaga.municipio || 'Uberlândia'}`
            
            const coords = await geocodeAddress(addressToGeocode)
            if (coords) {
              vaga.lat = coords.lat
              vaga.lng = coords.lng
            }
          }
          
          vagas.push(vaga)
        }
      } catch (e) {
        const errorMsg = `Erro ao processar ${link.urlEdital}: ${e}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
      
      await new Promise(r => setTimeout(r, 200))
    }
    
    // 4. Upsert no Supabase
    if (vagas.length > 0) {
      console.log(`Salvando ${vagas.length} vagas no Supabase...`)
      const supabase = createServiceClient()
      
      const batchSize = 50
      for (let i = 0; i < vagas.length; i += batchSize) {
        const batch = vagas.slice(i, i + batchSize)
        
        const { error } = await supabase
          .from('vagas')
          .upsert(batch, { onConflict: 'uid' })
        
        if (error) {
          console.error('Erro ao salvar batch:', error)
          errors.push(`Erro ao salvar batch: ${error.message}`)
        }
      }
    }
    
    const result: ScrapeResult = {
      status: 'OK',
      message: `Scraping concluído com sucesso. ${vagas.length} vagas encontradas.`,
      count: vagas.length,
      httpStatus,
      errors,
      durationSeconds: getDuration(),
    }
    
    await saveScrapingStatus(
      result.status,
      result.message,
      result.count,
      result.httpStatus || null,
      result.durationSeconds!
    )
    
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
    
    await saveScrapingStatus(
      result.status,
      result.message,
      result.count,
      result.httpStatus || null,
      result.durationSeconds!
    )
    
    return result
  }
}
