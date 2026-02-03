'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2, Trash2, CheckCircle, Search, Navigation, AlertCircle } from 'lucide-react'
import { geocodeAddress, saveUserLocation, clearUserLocation } from '@/lib/distance'
import type { UserLocation } from '@/lib/types'
import { toast } from 'sonner'

interface AddressModalProps {
  userLocation: UserLocation | null
  onLocationChange: (location: UserLocation | null) => void
}

interface GeocodingResult {
  address: string
  lat: number
  lng: number
  displayName: string
  municipio: string | null
}

// Geocodifica com mais detalhes
async function geocodeWithDetails(address: string): Promise<GeocodingResult | null> {
  if (!address) return null
  
  try {
    const query = encodeURIComponent(address)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&countrycodes=br&addressdetails=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PainelVagas/1.0 (https://github.com/user/painel-vagas)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
    }
    
    const data = await response.json()
    if (data && data[0]) {
      const addressDetails = data[0].address || {}
      const municipio =
        addressDetails.city ||
        addressDetails.town ||
        addressDetails.village ||
        addressDetails.municipality ||
        addressDetails.county ||
        null

      return {
        address: address,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        municipio: municipio ? String(municipio) : null,
      }
    }
  } catch (e) {
    console.error('Erro geocoding:', e)
  }
  
  return null
}

export function AddressModal({ userLocation, onLocationChange }: AddressModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchResult, setSearchResult] = useState<GeocodingResult | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAddress(userLocation?.address || '')
      setSearchResult(null)
      setSearchError(null)
    }
  }, [isOpen, userLocation])
  
  const handleSearch = async () => {
    if (!address.trim()) {
      setSearchError('Digite um endereço para buscar')
      return
    }
    
    setIsSearching(true)
    setSearchError(null)
    setSearchResult(null)
    
    try {
      const result = await geocodeWithDetails(address)
      
      if (!result) {
        setSearchError('Endereço não encontrado. Tente ser mais específico (ex: adicione cidade, estado).')
        return
      }
      
      setSearchResult(result)
    } catch (error) {
      console.error('Erro ao geocodificar:', error)
      setSearchError('Erro ao buscar endereço. Tente novamente.')
    } finally {
      setIsSearching(false)
    }
  }
  
  const handleSave = async () => {
    if (!searchResult) {
      toast.error('Busque um endereço primeiro')
      return
    }
    
    setIsSaving(true)
    
    try {
      const location: UserLocation = {
        address: address.trim(),
        lat: searchResult.lat,
        lng: searchResult.lng,
        municipio: searchResult.municipio,
      }
      
      saveUserLocation(location)
      onLocationChange(location)
      toast.success('Localização salva com sucesso!')
      setIsOpen(false)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar localização.')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleClear = () => {
    clearUserLocation()
    onLocationChange(null)
    setAddress('')
    setSearchResult(null)
    toast.success('Localização removida')
    setIsOpen(false)
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={userLocation ? 'default' : 'outline'} 
          size="sm"
          className={userLocation ? 'gradient-primary border-0 shadow-lg shadow-primary/25' : ''}
        >
          <MapPin className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">
            {userLocation ? 'Localização definida' : 'Definir localização'}
          </span>
          <span className="sm:hidden">
            {userLocation ? 'Local' : 'Local'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            Sua Localização
          </DialogTitle>
          <DialogDescription>
            Informe seu endereço para calcular a distância até as vagas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Campo de busca */}
          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium">
              Endereço
            </label>
            <div className="flex gap-2">
              <Input
                id="address"
                placeholder="Rua, número, bairro, cidade - estado"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setSearchResult(null)
                  setSearchError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !address.trim()}
                variant="secondary"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ex: Rua das Flores 123, Centro, Uberlândia - MG
            </p>
          </div>
          
          {/* Erro de busca */}
          {searchError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive animate-slide-up">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{searchError}</p>
            </div>
          )}
          
          {/* Resultado da busca */}
          {searchResult && (
            <div className="p-4 rounded-lg border-2 border-primary/50 bg-primary/5 animate-slide-up">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-primary">Endereço encontrado!</p>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {searchResult.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    Coordenadas: {searchResult.lat.toFixed(6)}, {searchResult.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Localização atual salva */}
          {userLocation && !searchResult && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Localização atual salva
              </p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm font-medium truncate">{userLocation.address}</p>
              </div>
            </div>
          )}
          
          {/* Nota de privacidade */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
            <div className="p-1 rounded bg-muted">
              <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Privacidade:</strong> Seu endereço é armazenado apenas no seu navegador.
              Nunca é enviado para nossos servidores.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {userLocation && (
            <Button 
              variant="destructive" 
              onClick={handleClear} 
              className="w-full sm:w-auto sm:mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !searchResult}
            className="w-full sm:w-auto gradient-primary border-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar localização
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
