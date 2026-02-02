'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Navigation
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
  
  // Cor do badge de distância
  const getDistanceColor = (km: number | null) => {
    if (km === null) return 'secondary'
    if (km < 5) return 'default' // verde
    if (km < 15) return 'secondary' // amarelo
    return 'destructive' // vermelho
  }
  
  // Classe de cor customizada para distância
  const getDistanceClass = (km: number | null) => {
    if (km === null) return ''
    if (km < 5) return 'bg-green-500 hover:bg-green-600'
    if (km < 15) return 'bg-yellow-500 hover:bg-yellow-600 text-black'
    return 'bg-red-500 hover:bg-red-600'
  }
  
  return (
    <Card className={`transition-all hover:shadow-lg ${isVencida ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">
            {vaga.escola || 'Escola não informada'}
          </CardTitle>
          <div className="flex gap-2 flex-shrink-0">
            {isVencida && (
              <Badge variant="destructive">Vencida</Badge>
            )}
            {vaga.distanceKm !== null && (
              <Badge className={getDistanceClass(vaga.distanceKm)}>
                <Navigation className="w-3 h-3 mr-1" />
                {vaga.distanceKm.toFixed(1)} km
              </Badge>
            )}
          </div>
        </div>
        {vaga.escola_codigo && (
          <p className="text-sm text-muted-foreground">
            Código: {vaga.escola_codigo}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Data e Horário */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{formatDate(vaga.data)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{vaga.horario || '-'}</span>
          </div>
        </div>
        
        {/* Localização */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span>
            {vaga.endereco || vaga.municipio || 'Endereço não informado'}
            {vaga.municipio && vaga.endereco && ` - ${vaga.municipio}`}
          </span>
        </div>
        
        {/* Cargo e Categoria */}
        <div className="flex flex-wrap gap-2">
          {vaga.cargo && (
            <Badge variant="outline" className="gap-1">
              <Building2 className="w-3 h-3" />
              {vaga.cargo}
            </Badge>
          )}
          {vaga.categoria && (
            <Badge variant="outline">{vaga.categoria}</Badge>
          )}
          {vaga.turno && (
            <Badge variant="outline">{vaga.turno}</Badge>
          )}
        </div>
        
        {/* Conteúdo/Disciplina */}
        {vaga.conteudo && (
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <span>{vaga.conteudo}</span>
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
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
            {vaga.observacoes}
          </p>
        )}
        
        {/* Link do Edital */}
        {vaga.url_edital && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <a href={vaga.url_edital} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Edital Completo
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
