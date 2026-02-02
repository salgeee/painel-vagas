'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/Header'
import { VagaList } from '@/components/VagaList'
import type { Vaga, UserLocation } from '@/lib/types'
import { getUserLocation } from '@/lib/distance'
import { toast } from 'sonner'

export default function Home() {
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Carregar localização do localStorage no mount
  useEffect(() => {
    const stored = getUserLocation()
    if (stored) {
      setUserLocation(stored)
    }
  }, [])
  
  // Buscar vagas da API
  const fetchVagas = useCallback(async (showToast = false) => {
    try {
      const response = await fetch('/api/vagas?mostrarVencidas=true')
      
      if (!response.ok) {
        throw new Error('Erro ao buscar vagas')
      }
      
      const data = await response.json()
      setVagas(data)
      setLastUpdate(new Date())
      
      if (showToast) {
        toast.success(`${data.length} vagas carregadas`)
      }
    } catch (error) {
      console.error('Erro ao buscar vagas:', error)
      toast.error('Erro ao carregar vagas. Tente novamente.')
    }
  }, [])
  
  // Carregar vagas no mount
  useEffect(() => {
    const loadVagas = async () => {
      setIsLoading(true)
      await fetchVagas()
      setIsLoading(false)
    }
    
    loadVagas()
  }, [fetchVagas])
  
  // Handler para refresh manual
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchVagas(true)
    setIsRefreshing(false)
  }
  
  // Handler para mudança de localização
  const handleLocationChange = (location: UserLocation | null) => {
    setUserLocation(location)
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header
        userLocation={userLocation}
        onLocationChange={handleLocationChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdate={lastUpdate}
      />
      
      <main className="flex-1 container py-6">
        <VagaList
          vagas={vagas}
          isLoading={isLoading}
          userLocation={userLocation}
        />
      </main>
      
      <footer className="border-t py-4">
        <div className="container text-center text-sm text-muted-foreground">
          <p>
            Dados obtidos do{' '}
            <a
              href="https://controlequadropessoal.educacao.mg.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Portal da Secretaria de Educação de MG
            </a>
          </p>
          <p className="mt-1">
            Atualização automática às 8:15 e 23:15
          </p>
        </div>
      </footer>
    </div>
  )
}
