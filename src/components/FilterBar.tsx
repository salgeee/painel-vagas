'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, SlidersHorizontal } from 'lucide-react'

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
  
  const hasActiveFilters = filters.municipio || filters.cargo || filters.turno || filters.mostrarVencidas
  
  return (
    <div className="space-y-4 bg-card p-4 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Filtros</h2>
          <span className="text-sm text-muted-foreground">
            {vagasFiltradas} de {totalVagas} vagas
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Filtros */}
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${showFilters ? 'block' : 'hidden md:grid'}`}>
        {/* Município */}
        <Select
          value={filters.municipio || 'todos'}
          onValueChange={(v) => updateFilter('municipio', v === 'todos' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Município" />
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
        
        {/* Cargo */}
        <Select
          value={filters.cargo || 'todos'}
          onValueChange={(v) => updateFilter('cargo', v === 'todos' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Cargo" />
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
        
        {/* Turno */}
        <Select
          value={filters.turno || 'todos'}
          onValueChange={(v) => updateFilter('turno', v === 'todos' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Turno" />
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
        
        {/* Ordenação */}
        <Select
          value={filters.ordenarPor}
          onValueChange={(v) => updateFilter('ordenarPor', v as 'data' | 'distancia')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="data">Data mais próxima</SelectItem>
            <SelectItem value="distancia">Mais perto de mim</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Mostrar vencidas */}
      <div className={`flex items-center gap-2 ${showFilters ? 'block' : 'hidden md:flex'}`}>
        <input
          type="checkbox"
          id="mostrarVencidas"
          checked={filters.mostrarVencidas}
          onChange={(e) => updateFilter('mostrarVencidas', e.target.checked)}
          className="rounded border-input"
        />
        <label htmlFor="mostrarVencidas" className="text-sm cursor-pointer">
          Mostrar vagas vencidas
        </label>
      </div>
    </div>
  )
}
