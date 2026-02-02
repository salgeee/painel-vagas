'use client'

import { useState } from 'react'
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
  municipio: string
  cargo: string
  turno: string
  mostrarVencidas: boolean
  ordenarPor: 'data' | 'distancia'
}

interface FilterBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  municipios: string[]
  cargos: string[]
  turnos: string[]
  totalVagas: number
  vagasFiltradas: number
}

export function FilterBar({
  filters,
  onFiltersChange,
  municipios,
  cargos,
  turnos,
  totalVagas,
  vagasFiltradas,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false)
  
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }
  
  const clearFilters = () => {
    onFiltersChange({
      municipio: '',
      cargo: '',
      turno: '',
      mostrarVencidas: false,
      ordenarPor: 'data',
    })
  }
  
  const activeFiltersCount = [
    filters.municipio,
    filters.cargo,
    filters.turno,
    filters.mostrarVencidas,
  ].filter(Boolean).length
  
  const hasActiveFilters = activeFiltersCount > 0
  
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
      <div className={`space-y-4 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="p-4 rounded-xl bg-card border shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Município */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Município
              </label>
              <Select
                value={filters.municipio || 'todos'}
                onValueChange={(v) => updateFilter('municipio', v === 'todos' ? '' : v)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cargo
              </label>
              <Select
                value={filters.cargo || 'todos'}
                onValueChange={(v) => updateFilter('cargo', v === 'todos' ? '' : v)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os cargos</SelectItem>
                  {cargos.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Turno */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Turno
              </label>
              <Select
                value={filters.turno || 'todos'}
                onValueChange={(v) => updateFilter('turno', v === 'todos' ? '' : v)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />
                Ordenar por
              </label>
              <Select
                value={filters.ordenarPor}
                onValueChange={(v) => updateFilter('ordenarPor', v as 'data' | 'distancia')}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                  checked={filters.mostrarVencidas}
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
        </div>
      </div>
    </div>
  )
}
