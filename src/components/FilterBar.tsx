'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, SlidersHorizontal, Filter, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface Filters {
  regional: string
  municipio: string
  cargo: string
  categoria: string
  turno: string
  mostrarVencidas: boolean
  ordenarPor: 'data' | 'distancia'
}

interface FilterBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  regionais: string[]
  municipios: string[]
  cargos: string[]
  categorias: string[]
  turnos: string[]
  totalVagas: number
  vagasFiltradas: number
}

export function FilterBar({
  filters,
  onFiltersChange,
  regionais,
  municipios,
  cargos,
  categorias,
  turnos,
  totalVagas,
  vagasFiltradas,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [mobileDraft, setMobileDraft] = useState<Filters>(filters)
  const isMobilePanelOpen = showFilters
  const displayedFilters = isMobilePanelOpen ? mobileDraft : filters
  
  useEffect(() => {
    if (showFilters) {
      setMobileDraft(filters)
    }
  }, [showFilters, filters])

  useEffect(() => {
    if (!showFilters) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [showFilters])
  
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    if (isMobilePanelOpen) {
      setMobileDraft(prev => ({ ...prev, [key]: value }))
      return
    }
    onFiltersChange({ ...filters, [key]: value })
  }
  
  const clearFilters = () => {
    const reset = {
      regional: '',
      municipio: '',
      cargo: '',
      categoria: '',
      turno: '',
      mostrarVencidas: false,
      ordenarPor: 'data',
    } as Filters

    if (isMobilePanelOpen) {
      setMobileDraft(reset)
      return
    }

    onFiltersChange(reset)
  }
  
  const activeFiltersCount = [
    filters.regional,
    filters.municipio,
    filters.cargo,
    filters.categoria,
    filters.turno,
    filters.mostrarVencidas,
  ].filter(Boolean).length
  
  const hasActiveFilters = activeFiltersCount > 0

  const filtersContent = (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Regional */}
        <div className="space-y-2 min-w-0 overflow-hidden">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            Regional
          </label>
          <Select
            value={displayedFilters.regional || 'todas'}
            onValueChange={(v) => updateFilter('regional', v === 'todas' ? '' : v)}
          >
            <SelectTrigger className="w-full max-w-full bg-background min-w-0 shrink [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              <SelectItem value="todas">Todas as regionais</SelectItem>
              {regionais.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Município */}
        <div className="space-y-2 min-w-0 overflow-hidden">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            Município
          </label>
          <Select
            value={displayedFilters.municipio || 'todos'}
            onValueChange={(v) => updateFilter('municipio', v === 'todos' ? '' : v)}
          >
            <SelectTrigger className="w-full max-w-full bg-background min-w-0 shrink [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              <SelectItem value="todos">Todos os municípios</SelectItem>
              {municipios.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Cargo */}
        <div className="space-y-2 min-w-0 overflow-hidden">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            Cargo
          </label>
          <Select
            value={displayedFilters.cargo || 'todos'}
            onValueChange={(v) => updateFilter('cargo', v === 'todos' ? '' : v)}
          >
            <SelectTrigger className="w-full max-w-full bg-background min-w-0 shrink [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              <SelectItem value="todos">Todos os cargos</SelectItem>
              {cargos.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Categoria profissional */}
        <div className="space-y-2 min-w-0 overflow-hidden">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            Categoria
          </label>
          <Select
            value={displayedFilters.categoria || 'todos'}
            onValueChange={(v) => updateFilter('categoria', v === 'todos' ? '' : v)}
          >
            <SelectTrigger className="w-full max-w-full bg-background min-w-0 shrink [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              <SelectItem value="todos">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Turno */}
        <div className="space-y-2 min-w-0 overflow-hidden">
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            Turno
          </label>
          <Select
            value={displayedFilters.turno || 'todos'}
            onValueChange={(v) => updateFilter('turno', v === 'todos' ? '' : v)}
          >
            <SelectTrigger className="w-full max-w-full bg-background min-w-0 shrink [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              <SelectItem value="todos">Todos os turnos</SelectItem>
              {turnos.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Ordenação */}
        <div className="space-y-2 min-w-0 overflow-hidden">
          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            <ArrowUpDown className="w-3 h-3 shrink-0" />
            Ordenar por
          </label>
          <Select
            value={displayedFilters.ordenarPor}
            onValueChange={(v) => updateFilter('ordenarPor', v as 'data' | 'distancia')}
          >
            <SelectTrigger className="w-full max-w-full bg-background min-w-0 shrink [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:block">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              <SelectItem value="data">Data mais próxima</SelectItem>
              <SelectItem value="distancia">Mais perto de mim</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Checkbox mostrar vencidas */}
      <div className="mt-4 pt-4 border-t">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={displayedFilters.mostrarVencidas}
              onChange={(e) => updateFilter('mostrarVencidas', e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
              <svg 
                className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Mostrar vagas vencidas
          </span>
        </label>
      </div>
    </>
  )
  
  return (
    <div className="space-y-4">
      {/* Header com contagem e toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Filter className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {vagasFiltradas} {vagasFiltradas === 1 ? 'vaga' : 'vagas'}
              </p>
              {vagasFiltradas !== totalVagas && (
                <p className="text-xs text-muted-foreground">
                  de {totalVagas} no total
                </p>
              )}
            </div>
          </div>
          
          {hasActiveFilters && (
            <Badge variant="secondary" className="gap-1">
              {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
          )}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2 h-5 w-5 p-0 justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="hidden md:block">
        <div className="p-4 rounded-xl bg-card border shadow-sm">
          {filtersContent}
        </div>
      </div>

      {/* Mobile: filtros em painel deslizante */}
      {showFilters && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Filtros</p>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                Fechar
              </Button>
            </div>
            <div className="p-4 rounded-xl bg-card border shadow-sm">
              {filtersContent}
            </div>
            <div className="mt-4 pt-3 border-t flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              )}
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  onFiltersChange(mobileDraft)
                  setShowFilters(false)
                }}
              >
                Ver vagas
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
