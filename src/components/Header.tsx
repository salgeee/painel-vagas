'use client'

import { AddressModal } from './AddressModal'
import type { UserLocation } from '@/lib/types'
import { RefreshCw } from 'lucide-react'
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Painel de Vagas</h1>
          <p className="text-xs text-muted-foreground">
            Secretaria de Estado de Educação de MG
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Atualizado: {lastUpdate.toLocaleString('pt-BR')}
            </span>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <AddressModal
            userLocation={userLocation}
            onLocationChange={onLocationChange}
          />
        </div>
      </div>
    </header>
  )
}
