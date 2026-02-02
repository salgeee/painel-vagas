'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/Header'
import { VagaList } from '@/components/VagaList'
import { StatusAlert } from '@/components/StatusAlert'
import type { Vaga, UserLocation } from '@/lib/types'
import { getUserLocation } from '@/lib/distance'
import { toast } from 'sonner'
import { GraduationCap, MapPin, Clock, ExternalLink } from 'lucide-react'

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
  
  // Estatísticas
  const hoje = new Date().toISOString().split('T')[0]
  const vagasAtivas = vagas.filter(v => !v.data || v.data >= hoje).length
  const vagasHoje = vagas.filter(v => v.data === hoje).length
  const municipiosUnicos = new Set(vagas.map(v => v.municipio).filter(Boolean)).size
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Header
        userLocation={userLocation}
        onLocationChange={handleLocationChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdate={lastUpdate}
      />
      
      <main className="flex-1 container py-6 space-y-6">
        {/* Alerta de Status do Scraping */}
        <StatusAlert />
        
        {/* Stats Cards */}
        {!isLoading && vagas.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{vagasAtivas}</p>
                  <p className="text-xs text-muted-foreground">Vagas ativas</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{vagasHoje}</p>
                  <p className="text-xs text-muted-foreground">Para hoje</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <MapPin className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{municipiosUnicos}</p>
                  <p className="text-xs text-muted-foreground">Municípios</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${userLocation ? 'bg-primary/10' : 'bg-muted'}`}>
                  <MapPin className={`w-5 h-5 ${userLocation ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium truncate max-w-[120px]">
                    {userLocation ? 'Definida' : 'Não definida'}
                  </p>
                  <p className="text-xs text-muted-foreground">Sua localização</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Aviso se localização não definida */}
        {!isLoading && !userLocation && vagas.length > 0 && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Defina sua localização</p>
              <p className="text-xs text-muted-foreground">
                Para ver a distância até as escolas, clique em &quot;Definir localização&quot; no canto superior direito.
              </p>
            </div>
          </div>
        )}
        
        {/* Lista de Vagas */}
        <VagaList
          vagas={vagas}
          isLoading={isLoading}
          userLocation={userLocation}
        />
      </main>
      
      <footer className="border-t bg-card/50">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-primary">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Painel de Vagas</p>
                <p className="text-xs text-muted-foreground">
                  Secretaria de Estado de Educação de MG
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-muted-foreground">
              <a
                href="https://controlequadropessoal.educacao.mg.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Fonte oficial dos dados
              </a>
              <span className="hidden sm:inline">|</span>
              <span>Atualização automática às 8:15 e 23:15</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
