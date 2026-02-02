'use client'

import { useState, useEffect, useMemo } from 'react'
import { VagaCard } from './VagaCard'
import { FilterBar, type Filters } from './FilterBar'
import { Skeleton } from '@/components/ui/skeleton'
import type { Vaga, VagaWithDistance, UserLocation } from '@/lib/types'
import { getRouteDistance, getHaversineDistance } from '@/lib/distance'

interface VagaListProps {
  vagas: Vaga[]
  isLoading: boolean
  userLocation: UserLocation | null
}

export function VagaList({ vagas, isLoading, userLocation }: VagaListProps) {
  const [filters, setFilters] = useState<Filters>({
    municipio: '',
    cargo: '',
    turno: '',
    mostrarVencidas: false,
    ordenarPor: 'data',
  })
  
  const [vagasComDistancia, setVagasComDistancia] = useState<VagaWithDistance[]>([])
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false)
  
  // Extrair opções únicas para os filtros
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
  
  // Calcular distâncias quando userLocation mudar
  useEffect(() => {
    async function calculateDistances() {
      if (!userLocation) {
        setVagasComDistancia(vagas.map(v => ({ ...v, distanceKm: null })))
        return
      }
      
      setIsCalculatingDistances(true)
      
      const results: VagaWithDistance[] = []
      
      for (const vaga of vagas) {
        let distanceKm: number | null = null
        
        if (vaga.lat && vaga.lng) {
          // Tentar OSRM primeiro
          try {
            distanceKm = await getRouteDistance(
              userLocation.lat,
              userLocation.lng,
              vaga.lat,
              vaga.lng
            )
          } catch {
            // Fallback para Haversine
            distanceKm = getHaversineDistance(
              userLocation.lat,
              userLocation.lng,
              vaga.lat,
              vaga.lng
            )
          }
        }
        
        results.push({ ...vaga, distanceKm })
      }
      
      setVagasComDistancia(results)
      setIsCalculatingDistances(false)
    }
    
    calculateDistances()
  }, [vagas, userLocation])
  
  // Filtrar e ordenar vagas
  const vagasFiltradas = useMemo(() => {
    let resultado = [...vagasComDistancia]
    
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
    
    // Filtrar por turno
    if (filters.turno) {
      resultado = resultado.filter(v => 
        v.turno?.toLowerCase().includes(filters.turno.toLowerCase())
      )
    }
    
    // Filtrar vencidas
    if (!filters.mostrarVencidas) {
      const hoje = new Date().toISOString().split('T')[0]
      resultado = resultado.filter(v => !v.data || v.data >= hoje)
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
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
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
        municipios={municipios}
        cargos={cargos}
        turnos={turnos}
        totalVagas={vagas.length}
        vagasFiltradas={vagasFiltradas.length}
      />
      
      {isCalculatingDistances && userLocation && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Calculando distâncias...
        </p>
      )}
      
      {vagasFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhuma vaga encontrada com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vagasFiltradas.map((vaga) => (
            <VagaCard key={vaga.id} vaga={vaga} />
          ))}
        </div>
      )}
    </div>
  )
}
