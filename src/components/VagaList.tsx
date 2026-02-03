'use client'

import { useState, useEffect, useMemo } from 'react'
import { VagaCard } from './VagaCard'
import { FilterBar, type Filters } from './FilterBar'
import { Skeleton } from '@/components/ui/skeleton'
import type { Vaga, VagaWithDistance, UserLocation } from '@/lib/types'
import { getRouteDistance, getHaversineDistance, getDistanceCache, setDistanceCache } from '@/lib/distance'
import { SearchX, Loader2 } from 'lucide-react'

interface VagaListProps {
  vagas: Vaga[]
  isLoading: boolean
  userLocation: UserLocation | null
}

function VagaCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="h-2 bg-muted animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function VagaList({ vagas, isLoading, userLocation }: VagaListProps) {
  const [filters, setFilters] = useState<Filters>({
    regional: '',
    municipio: '',
    cargo: '',
    categoria: '',
    turno: '',
    mostrarVencidas: false,
    ordenarPor: 'data',
  })
  
  const [vagasComDistancia, setVagasComDistancia] = useState<VagaWithDistance[]>([])
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false)
  const [distanceProgress, setDistanceProgress] = useState(0)
  
  // Extrair opções únicas para os filtros
  const regionais = useMemo(() => {
    const unique = [...new Set(vagas.map(v => v.regional).filter(Boolean))]
    return unique.sort() as string[]
  }, [vagas])
  
  const municipios = useMemo(() => {
    const unique = [...new Set(vagas.map(v => v.municipio).filter(Boolean))]
    return unique.sort() as string[]
  }, [vagas])
  
  const cargos = useMemo(() => {
    const unique = [...new Set(vagas.map(v => v.cargo).filter(Boolean))]
    return unique.sort() as string[]
  }, [vagas])
  
  const turnos = useMemo(() => {
    const unique = [...new Set(vagas.map(v => v.turno).filter(Boolean))]
    return unique.sort() as string[]
  }, [vagas])
  
  const categorias = useMemo(() => {
    const unique = [...new Set(vagas.map(v => v.categoria).filter(Boolean))]
    return unique.sort() as string[]
  }, [vagas])
  
  // Calcular distâncias (usa cache do localStorage quando existir)
  useEffect(() => {
    async function calculateDistances() {
      if (!userLocation) {
        setVagasComDistancia(vagas.map(v => ({ ...v, distanceKm: null })))
        return
      }

      const cache = getDistanceCache(userLocation) ?? {}
      // Monta lista inicial com distâncias do cache (aparece na hora)
      const initialResults: VagaWithDistance[] = vagas.map(v => {
        const cached = v.lat != null && v.lng != null ? cache[v.id] : undefined
        return { ...v, distanceKm: cached ?? null }
      })
      setVagasComDistancia(initialResults)

      // Quais vagas ainda precisam de cálculo (têm lat/lng e não estão no cache)
      const toCalculate = vagas.filter(
        v => v.lat != null && v.lng != null && cache[v.id] === undefined
      )
      if (toCalculate.length === 0) {
        setIsCalculatingDistances(false)
        return
      }

      setIsCalculatingDistances(true)
      setDistanceProgress(0)
      const results = [...initialResults]
      const total = toCalculate.length
      const updatedCache = { ...cache }

      for (let i = 0; i < toCalculate.length; i++) {
        const vaga = toCalculate[i]
        let distanceKm: number | null = null

        if (vaga.lat != null && vaga.lng != null) {
          try {
            distanceKm = await getRouteDistance(
              userLocation.lat,
              userLocation.lng,
              vaga.lat,
              vaga.lng
            )
          } catch {
            distanceKm = getHaversineDistance(
              userLocation.lat,
              userLocation.lng,
              vaga.lat,
              vaga.lng
            )
          }
          if (distanceKm != null) updatedCache[vaga.id] = distanceKm
          if (i < toCalculate.length - 1) {
            await new Promise(r => setTimeout(r, 50))
          }
        }

        const idx = results.findIndex(r => r.id === vaga.id)
        if (idx >= 0) results[idx] = { ...vaga, distanceKm }
        setVagasComDistancia([...results])
        setDistanceProgress(Math.round(((i + 1) / total) * 100))
      }

      setDistanceCache(userLocation, updatedCache)
      setIsCalculatingDistances(false)
    }

    calculateDistances()
  }, [vagas, userLocation])
  
  // Filtrar e ordenar vagas
  const vagasFiltradas = useMemo(() => {
    let resultado = [...vagasComDistancia]
    
    // Filtrar vencidas primeiro (data+horário < agora = vencida)
    if (!filters.mostrarVencidas) {
      const agora = new Date()
      
      resultado = resultado.filter(v => {
        if (!v.data) return false // Sem data = não mostra
        
        // Pega só a parte da data no formato YYYY-MM-DD
        const dataStr = String(v.data).split('T')[0]
        const [ano, mes, dia] = dataStr.split('-').map(Number)
        
        // Pega horário se existir, senão usa 00:00
        const horarioStr = v.horario || '00:00'
        const [hora, minuto] = horarioStr.split(':').map(Number)
        
        // Cria objeto Date com a data+hora da vaga
        const dataVaga = new Date(ano, mes - 1, dia, hora || 0, minuto || 0)
        
        // Vaga vencida = data+hora anterior a agora
        return dataVaga >= agora
      })
    }
    
    // Filtrar por regional
    if (filters.regional) {
      resultado = resultado.filter(v =>
        v.regional?.toLowerCase().includes(filters.regional.toLowerCase())
      )
    }
    
    // Filtrar por município
    if (filters.municipio) {
      resultado = resultado.filter(v => 
        v.municipio?.toLowerCase().includes(filters.municipio.toLowerCase())
      )
    }
    
    // Filtrar por cargo
    if (filters.cargo) {
      resultado = resultado.filter(v => 
        v.cargo?.toLowerCase().includes(filters.cargo.toLowerCase())
      )
    }
    
    // Filtrar por categoria profissional
    if (filters.categoria) {
      resultado = resultado.filter(v => 
        v.categoria?.toLowerCase().includes(filters.categoria.toLowerCase())
      )
    }
    
    // Filtrar por turno
    if (filters.turno) {
      resultado = resultado.filter(v => 
        v.turno?.toLowerCase().includes(filters.turno.toLowerCase())
      )
    }
    
    // Ordenar
    if (filters.ordenarPor === 'distancia') {
      resultado.sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0
        if (a.distanceKm === null) return 1
        if (b.distanceKm === null) return -1
        return a.distanceKm - b.distanceKm
      })
    } else {
      // Ordenar por data
      resultado.sort((a, b) => {
        if (!a.data && !b.data) return 0
        if (!a.data) return 1
        if (!b.data) return -1
        const dateCompare = a.data.localeCompare(b.data)
        if (dateCompare !== 0) return dateCompare
        // Se mesma data, ordenar por horário
        if (!a.horario && !b.horario) return 0
        if (!a.horario) return 1
        if (!b.horario) return -1
        return a.horario.localeCompare(b.horario)
      })
    }
    
    return resultado
  }, [vagasComDistancia, filters])
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filter skeleton */}
        <div className="p-4 rounded-xl bg-card border">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        
        {/* Cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <VagaCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        regionais={regionais}
        municipios={municipios}
        cargos={cargos}
        categorias={categorias}
        turnos={turnos}
        totalVagas={vagas.length}
        vagasFiltradas={vagasFiltradas.length}
      />
      
      {/* Aviso: ordenar por distância sem local definida */}
      {filters.ordenarPor === 'distancia' && !userLocation && vagasFiltradas.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200">
          <p className="text-sm font-medium">
            Defina sua localização no cabeçalho (ícone de pin) para ordenar as vagas por distância.
          </p>
        </div>
      )}
      
      {/* Progress de cálculo de distâncias */}
      {isCalculatingDistances && userLocation && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium">Calculando distâncias...</p>
              <div className="mt-2 h-2 bg-primary/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${distanceProgress}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-primary">{distanceProgress}%</span>
          </div>
        </div>
      )}
      
      {vagasFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <SearchX className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma vaga encontrada</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Não encontramos vagas com os filtros selecionados. Tente ajustar os filtros ou limpe-os para ver todas as vagas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vagasFiltradas.map((vaga, index) => (
            <div 
              key={vaga.id} 
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
            >
              <VagaCard vaga={vaga} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
