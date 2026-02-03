'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/Header'
import { VagaList } from '@/components/VagaList'
import type { Filters } from '@/components/FilterBar'
import { StatusAlert } from '@/components/StatusAlert'
import type { Vaga, UserLocation } from '@/lib/types'
import { getUserLocation } from '@/lib/distance'
import { toast } from 'sonner'
import { GraduationCap, MapPin, Clock, ExternalLink } from 'lucide-react'

export default function Home() {
  const INITIAL_PAGE_SIZE = 200
  const FILTERED_PAGE_SIZE = 1000
  const hasLoadedOnce = useRef(false)
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [totalVagas, setTotalVagas] = useState<number>(0)
  const [stats, setStats] = useState({
    total: 0,
    ativas: 0,
    hoje: 0,
    municipios: 0,
  })
  const [filterOptions, setFilterOptions] = useState<{
    regionais: string[]
    municipios: string[]
    municipiosByRegional: Record<string, string[]>
  }>({
    regionais: [],
    municipios: [],
    municipiosByRegional: {},
  })
  const [filters, setFilters] = useState<Filters>({
    regional: '',
    municipio: '',
    cargo: '',
    categoria: '',
    turno: '',
    mostrarVencidas: false,
    ordenarPor: 'data',
  })
  
  // Carregar localização do localStorage no mount
  useEffect(() => {
    const stored = getUserLocation()
    if (stored) {
      setUserLocation(stored)
    }
  }, [])
  
  const hasActiveFilters = Boolean(
    filters.regional ||
    filters.municipio ||
    filters.cargo ||
    filters.categoria ||
    filters.turno
  )
  const pageSize = hasActiveFilters ? FILTERED_PAGE_SIZE : INITIAL_PAGE_SIZE

  // Buscar vagas da API
  const fetchVagas = useCallback(async ({
    showToast = false,
    append = false,
    offset = 0,
  }: { showToast?: boolean; append?: boolean; offset?: number } = {}) => {
    try {
      const params = new URLSearchParams()
      params.set('mostrarVencidas', String(filters.mostrarVencidas))
      params.set('limit', String(pageSize))
      params.set('offset', String(offset))
      if (filters.regional) params.set('regional', filters.regional)
      if (filters.municipio) params.set('municipio', filters.municipio)
      if (filters.cargo) params.set('cargo', filters.cargo)
      if (filters.categoria) params.set('categoria', filters.categoria)
      if (filters.turno) params.set('turno', filters.turno)

      const response = await fetch(`/api/vagas?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar vagas')
      }
      
      const payload = await response.json()
      const data = Array.isArray(payload) ? payload : payload.data || []
      const total = Array.isArray(payload) ? data.length : (payload.count ?? data.length)
      setTotalVagas(total)
      setVagas(prev => (append ? [...prev, ...data] : data))
      if (!Array.isArray(payload) && payload.stats) {
        setStats({
          total: payload.stats.total ?? total,
          ativas: payload.stats.ativas ?? 0,
          hoje: payload.stats.hoje ?? 0,
          municipios: payload.stats.municipios ?? 0,
        })
        if (payload.stats.filters) {
          setFilterOptions({
            regionais: payload.stats.filters.regionais ?? [],
            municipios: payload.stats.filters.municipios ?? [],
            municipiosByRegional: payload.stats.filters.municipiosByRegional ?? {},
          })
        }
      }
      setLastUpdate(new Date())
      
      if (showToast) {
        toast.success(`${data.length} vagas carregadas`)
      }
    } catch (error) {
      console.error('Erro ao buscar vagas:', error)
      toast.error('Erro ao carregar vagas. Tente novamente.')
    }
  }, [filters, pageSize])
  
  // Carregar vagas no mount e quando filtros mudarem
  useEffect(() => {
    const loadVagas = async () => {
      const shouldShowSkeleton = !hasLoadedOnce.current
      if (shouldShowSkeleton) {
        setIsLoading(true)
      }
      await fetchVagas({ offset: 0 })
      hasLoadedOnce.current = true
      setIsLoading(false)
    }
    
    loadVagas()
  }, [fetchVagas])
  
  // Handler para refresh manual
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchVagas({ showToast: true, offset: 0 })
    setIsRefreshing(false)
  }

  const handleLoadMore = async () => {
    if (isLoadingMore || isLoading) return
    setIsLoadingMore(true)
    await fetchVagas({ append: true, offset: vagas.length })
    setIsLoadingMore(false)
  }
  
  // Handler para mudança de localização
  const handleLocationChange = (location: UserLocation | null) => {
    setUserLocation(location)
  }
  
  // Estatísticas
  const vagasAtivas = stats.ativas
  const vagasHoje = stats.hoje
  const municipiosUnicos = stats.municipios
  const hasMore = totalVagas > 0 && vagas.length < totalVagas
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Header
        userLocation={userLocation}
        onLocationChange={handleLocationChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdate={lastUpdate}
      />
      
      <main className="flex-1 container py-6 space-y-6">
        {/* Alerta de Status do Scraping */}
        <StatusAlert />
        
        {/* Stats Cards */}
        {!isLoading && vagas.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{vagasAtivas}</p>
                  <p className="text-xs text-muted-foreground">Vagas ativas</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{vagasHoje}</p>
                  <p className="text-xs text-muted-foreground">Total hoje</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <MapPin className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{municipiosUnicos}</p>
                  <p className="text-xs text-muted-foreground">Municípios</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${userLocation ? 'bg-primary/10' : 'bg-muted'}`}>
                  <MapPin className={`w-5 h-5 ${userLocation ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium truncate max-w-[120px]">
                    {userLocation ? 'Definida' : 'Não definida'}
                  </p>
                  <p className="text-xs text-muted-foreground">Sua localização</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Aviso se localização não definida */}
        {!isLoading && !userLocation && vagas.length > 0 && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Defina sua localização</p>
              <p className="text-xs text-muted-foreground">
                Para ver a distância até as escolas, clique em &quot;Definir localização&quot; no canto superior direito.
              </p>
            </div>
          </div>
        )}
        
        {/* Lista de Vagas */}
        <VagaList
          vagas={vagas}
          isLoading={isLoading}
          userLocation={userLocation}
          filters={filters}
          onFiltersChange={setFilters}
          totalVagas={totalVagas}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          filterOptions={filterOptions}
        />
      </main>
      
      <footer className="border-t bg-card/50">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-primary">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Painel de Vagas</p>
                <p className="text-xs text-muted-foreground">
                  Secretaria de Estado de Educação de MG
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-muted-foreground">
              <a
                href="https://controlequadropessoal.educacao.mg.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Fonte oficial dos dados
              </a>
              <span className="hidden sm:inline">|</span>
              <span>Atualização automática às 8:15 e 23:15</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
