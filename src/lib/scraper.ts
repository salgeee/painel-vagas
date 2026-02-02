import { createServiceClient } from './supabase'
import type { VagaInsert } from './types'
import { createHash } from 'crypto'

const BASE_URL = 'https://controlequadropessoal.educacao.mg.gov.br'
const DIVULGACAO_PATH = '/divulgacao/7/40/7020'

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

// Busca HTML de uma URL
async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Charset': 'ISO-8859-1,utf-8',
    },
  })
  
  const buffer = await response.arrayBuffer()
  // Decode como ISO-8859-1 (latin1) para preservar acentos
  const decoder = new TextDecoder('iso-8859-1')
  return decoder.decode(buffer)
}

// Descobre quantas páginas existem
async function discoverPages(html: string): Promise<number> {
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
  // "08 hora(s)" ou "8 hora(s)"
  const m1 = horarioTexto.match(/\b(\d{1,2})\s*hora/i)
  // "8h" ou "8:00"
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

// Função principal de scraping
export async function scrapeVagas(): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = []
  const vagas: VagaInsert[] = []
  
  try {
    // 1. Buscar primeira página para descobrir total
    console.log('Buscando página inicial...')
    const firstPageHtml = await fetchHtml(`${BASE_URL}${DIVULGACAO_PATH}`)
    const totalPages = await discoverPages(firstPageHtml)
    console.log(`Total de páginas: ${totalPages}`)
    
    // 2. Coletar links de todas as páginas
    const allLinks: EditalLink[] = []
    
    for (let page = 1; page <= totalPages; page++) {
      const url = page === 1 
        ? `${BASE_URL}${DIVULGACAO_PATH}` 
        : `${BASE_URL}${DIVULGACAO_PATH}/page:${page}`
      
      console.log(`Buscando página ${page}/${totalPages}...`)
      const html = await fetchHtml(url)
      const links = extractEditalLinks(html)
      allLinks.push(...links)
      
      // Pequena pausa para não sobrecarregar o servidor
      await new Promise(r => setTimeout(r, 300))
    }
    
    console.log(`Total de editais encontrados: ${allLinks.length}`)
    
    // 3. Buscar cada edital
    for (let i = 0; i < allLinks.length; i++) {
      const link = allLinks[i]
      console.log(`Processando edital ${i + 1}/${allLinks.length}: ${link.urlEdital}`)
      
      try {
        const editalHtml = await fetchHtml(link.urlEdital)
        const vaga = parseEdital(editalHtml, link.urlEdital)
        
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
      
      // Pequena pausa
      await new Promise(r => setTimeout(r, 200))
    }
    
    // 4. Upsert no Supabase
    if (vagas.length > 0) {
      console.log(`Salvando ${vagas.length} vagas no Supabase...`)
      const supabase = createServiceClient()
      
      // Upsert em batches de 50
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
    
    return {
      success: true,
      count: vagas.length,
      errors,
    }
  } catch (e) {
    const errorMsg = `Erro fatal no scraping: ${e}`
    console.error(errorMsg)
    return {
      success: false,
      count: 0,
      errors: [errorMsg, ...errors],
    }
  }
}
