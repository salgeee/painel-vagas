'use client'

import { useState } from 'react'
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
import { MapPin, Loader2, Trash2, CheckCircle } from 'lucide-react'
import { geocodeAddress, saveUserLocation, clearUserLocation } from '@/lib/distance'
import type { UserLocation } from '@/lib/types'
import { toast } from 'sonner'

interface AddressModalProps {
  userLocation: UserLocation | null
  onLocationChange: (location: UserLocation | null) => void
}

export function AddressModal({ userLocation, onLocationChange }: AddressModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [address, setAddress] = useState(userLocation?.address || '')
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSave = async () => {
    if (!address.trim()) {
      toast.error('Digite um endereço')
      return
    }
    
    setIsLoading(true)
    
    try {
      const coords = await geocodeAddress(address)
      
      if (!coords) {
        toast.error('Não foi possível encontrar o endereço. Tente ser mais específico.')
        return
      }
      
      const location: UserLocation = {
        address: address.trim(),
        lat: coords.lat,
        lng: coords.lng,
      }
      
      saveUserLocation(location)
      onLocationChange(location)
      toast.success('Localização salva com sucesso!')
      setIsOpen(false)
    } catch (error) {
      console.error('Erro ao geocodificar:', error)
      toast.error('Erro ao buscar endereço. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleClear = () => {
    clearUserLocation()
    onLocationChange(null)
    setAddress('')
    toast.success('Localização removida')
    setIsOpen(false)
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={userLocation ? 'default' : 'outline'} size="sm">
          <MapPin className="w-4 h-4 mr-2" />
          {userLocation ? 'Localização definida' : 'Definir localização'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sua Localização</DialogTitle>
          <DialogDescription>
            Informe seu endereço para calcular a distância até as vagas.
            Seus dados são salvos apenas no seu navegador e nunca enviados para nenhum servidor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium">
              Endereço
            </label>
            <Input
              id="address"
              placeholder="Rua, número, bairro, cidade - estado"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <p className="text-xs text-muted-foreground">
              Ex: Rua das Flores 123, Centro, Uberlândia - MG
            </p>
          </div>
          
          {userLocation && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Localização atual: {userLocation.address}</span>
            </div>
          )}
          
          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Privacidade:</strong> Seu endereço é armazenado apenas localmente
              no seu navegador (localStorage). As distâncias são calculadas usando
              um serviço público (OSRM) que recebe apenas as coordenadas, não o endereço completo.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-0">
          {userLocation && (
            <Button variant="destructive" onClick={handleClear} className="mr-auto">
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
