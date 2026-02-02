'use client'

import { AddressModal } from './AddressModal'
import type { UserLocation } from '@/lib/types'
import { RefreshCw, MapPin, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  userLocation: UserLocation | null
  onLocationChange: (location: UserLocation | null) => void
  onRefresh: () => void
  isRefreshing: boolean
  lastUpdate: Date | null
}

export function Header({
  userLocation,
  onLocationChange,
  onRefresh,
  isRefreshing,
  lastUpdate,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b glass">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo e título */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-primary shadow-lg shadow-primary/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Painel de Vagas
            </h1>
            <p className="text-xs text-muted-foreground">
              SEE - Minas Gerais
            </p>
          </div>
          <h1 className="sm:hidden text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Vagas
          </h1>
        </div>
        
        {/* Localização atual (quando definida) - visível em telas maiores */}
        {userLocation && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 max-w-xs">
            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-medium text-primary truncate">
              {userLocation.address}
            </span>
          </div>
        )}
        
        {/* Ações */}
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground hidden lg:block">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 w-9"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <AddressModal
            userLocation={userLocation}
            onLocationChange={onLocationChange}
          />
        </div>
      </div>
      
      {/* Localização em mobile - barra separada */}
      {userLocation && (
        <div className="md:hidden border-t bg-primary/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-medium text-primary truncate">
              {userLocation.address}
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
