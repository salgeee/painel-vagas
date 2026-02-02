'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { VagaWithDistance } from '@/lib/types'
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Building2, 
  GraduationCap,
  ExternalLink,
  Navigation,
  AlertTriangle
} from 'lucide-react'

interface VagaCardProps {
  vaga: VagaWithDistance
}

export function VagaCard({ vaga }: VagaCardProps) {
  const isVencida = vaga.data ? new Date(vaga.data) < new Date(new Date().toDateString()) : false
  
  // Formata data para exibição
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }
  
  // Formata data relativa
  const getRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diff === 0) return 'Hoje'
    if (diff === 1) return 'Amanhã'
    if (diff > 1 && diff <= 7) return `Em ${diff} dias`
    return null
  }
  
  const relativeDate = getRelativeDate(vaga.data)
  
  // Cor do badge de distância
  const getDistanceStyle = (km: number | null) => {
    if (km === null) return { bg: 'bg-muted', text: 'text-muted-foreground' }
    if (km < 5) return { bg: 'bg-emerald-500', text: 'text-white' }
    if (km < 15) return { bg: 'bg-amber-500', text: 'text-white' }
    return { bg: 'bg-rose-500', text: 'text-white' }
  }
  
  const distanceStyle = getDistanceStyle(vaga.distanceKm)
  
  return (
    <Card className={`group overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 ${isVencida ? 'opacity-60 grayscale-[30%]' : ''}`}>
      {/* Header colorido */}
      <div className={`h-2 ${isVencida ? 'bg-muted' : 'gradient-primary'}`} />
      
      <CardContent className="p-5 space-y-4">
        {/* Título e badges */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {vaga.escola || 'Escola não informada'}
            </h3>
          </div>
          
          {/* Badges de status */}
          <div className="flex flex-wrap gap-2">
            {isVencida && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" />
                Vencida
              </Badge>
            )}
            {relativeDate && !isVencida && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                {relativeDate}
              </Badge>
            )}
            {vaga.distanceKm !== null && (
              <Badge className={`text-xs gap-1 ${distanceStyle.bg} ${distanceStyle.text} border-0`}>
                <Navigation className="w-3 h-3" />
                {vaga.distanceKm.toFixed(1)} km
              </Badge>
            )}
          </div>
        </div>
        
        {/* Informações principais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Calendar className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-medium">{formatDate(vaga.data)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-medium">{vaga.horario || '-'}</span>
          </div>
        </div>
        
        {/* Localização */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            {vaga.endereco || vaga.municipio || 'Endereço não informado'}
            {vaga.municipio && vaga.endereco && ` - ${vaga.municipio}`}
          </span>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {vaga.cargo && (
            <Badge variant="outline" className="text-xs gap-1 bg-background">
              <Building2 className="w-3 h-3" />
              {vaga.cargo}
            </Badge>
          )}
          {vaga.turno && (
            <Badge variant="outline" className="text-xs bg-background">
              {vaga.turno}
            </Badge>
          )}
          {vaga.categoria && (
            <Badge variant="outline" className="text-xs bg-background">
              {vaga.categoria}
            </Badge>
          )}
        </div>
        
        {/* Conteúdo/Disciplina */}
        {vaga.conteudo && (
          <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
            <GraduationCap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground line-clamp-1">{vaga.conteudo}</span>
          </div>
        )}
        
        {/* Período */}
        {(vaga.periodo_inicial || vaga.periodo_final) && (
          <p className="text-xs text-muted-foreground">
            Período: {formatDate(vaga.periodo_inicial)} a {formatDate(vaga.periodo_final)}
          </p>
        )}
        
        {/* Observações */}
        {vaga.observacoes && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200 line-clamp-3">
              {vaga.observacoes}
            </p>
          </div>
        )}
        
        {/* Link do Edital */}
        {vaga.url_edital && (
          <Button
            variant="outline"
            size="sm"
            className="w-full group/btn hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
            asChild
          >
            <a href={vaga.url_edital} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2 group-hover/btn:animate-pulse" />
              Ver Edital Completo
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
