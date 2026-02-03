export interface Vaga {
  id: string
  uid: string
  escola_codigo: string | null
  escola: string | null
  regional: string | null
  sre_codigo: string | null
  municipio: string | null
  data: string | null
  horario: string | null
  endereco: string | null
  cargo: string | null
  categoria: string | null
  natureza: string | null
  conteudo: string | null
  nivel: string | null
  turno: string | null
  periodo_inicial: string | null
  periodo_final: string | null
  observacoes: string | null
  url_edital: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export interface VagaInsert {
  uid: string
  escola_codigo?: string | null
  escola?: string | null
  regional?: string | null
  sre_codigo?: string | null
  municipio?: string | null
  data?: string | null
  horario?: string | null
  endereco?: string | null
  cargo?: string | null
  categoria?: string | null
  natureza?: string | null
  conteudo?: string | null
  nivel?: string | null
  turno?: string | null
  periodo_inicial?: string | null
  periodo_final?: string | null
  observacoes?: string | null
  url_edital?: string | null
  lat?: number | null
  lng?: number | null
}

export interface Database {
  public: {
    Tables: {
      vagas: {
        Row: Vaga
        Insert: VagaInsert
        Update: Partial<VagaInsert>
      }
    }
  }
}

export interface UserLocation {
  address: string
  lat: number
  lng: number
}

export interface VagaWithDistance extends Vaga {
  distanceKm: number | null
}

// Status do Scraping
export type ScrapeStatusType = 
  | 'OK' 
  | 'FONTE_INDISPONIVEL' 
  | 'ESTRUTURA_INVALIDA' 
  | 'SEM_VAGAS' 
  | 'ERRO'

export interface ScrapeStatus {
  id: number
  status: ScrapeStatusType
  message: string | null
  vagas_encontradas: number
  http_status: number | null
  duration_seconds: number | null
  created_at: string
}

export interface ScrapeResult {
  status: ScrapeStatusType
  message: string
  count: number
  httpStatus?: number
  errors: string[]
  durationSeconds?: number
}
