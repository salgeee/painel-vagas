'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, WifiOff, Info, CheckCircle, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ScrapeStatusType } from '@/lib/types'

interface StatusResponse {
  status: ScrapeStatusType | null
  message: string | null
  vagasEncontradas?: number
  lastUpdate: string | null
  isStale: boolean
  hoursSinceUpdate?: number
}

export function StatusAlert() {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/status')
        if (response.ok) {
          const data = await response.json()
          setStatusData(data)
        }
      } catch (error) {
        console.error('Erro ao buscar status:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStatus()
  }, [])
  
  if (isLoading || isDismissed || !statusData) {
    return null
  }
  
  // Não mostrar alerta se tudo está OK e dados recentes
  if (statusData.status === 'OK' && !statusData.isStale) {
    return null
  }
  
  // Configuração do alerta baseado no status
  const getAlertConfig = () => {
    // Dados desatualizados
    if (statusData.isStale) {
      return {
        icon: Clock,
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        iconColor: 'text-amber-600 dark:text-amber-400',
        textColor: 'text-amber-800 dark:text-amber-200',
        title: 'Dados podem estar desatualizados',
        message: `Última atualização há ${statusData.hoursSinceUpdate?.toFixed(0)} horas. O scraping automático pode ter falhado.`,
      }
    }
    
    switch (statusData.status) {
      case 'FONTE_INDISPONIVEL':
        return {
          icon: WifiOff,
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          textColor: 'text-red-800 dark:text-red-200',
          title: 'Site da SEE/MG indisponível',
          message: 'O site fonte está temporariamente fora do ar. Exibindo dados da última atualização disponível.',
        }
      
      case 'ESTRUTURA_INVALIDA':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-50 dark:bg-orange-950/30',
          borderColor: 'border-orange-200 dark:border-orange-800',
          iconColor: 'text-orange-600 dark:text-orange-400',
          textColor: 'text-orange-800 dark:text-orange-200',
          title: 'Site da SEE/MG em manutenção',
          message: 'O site fonte retornou uma página inesperada. Pode estar em manutenção. Exibindo dados anteriores.',
        }
      
      case 'SEM_VAGAS':
        return {
          icon: Info,
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          textColor: 'text-blue-800 dark:text-blue-200',
          title: 'Nenhuma vaga disponível',
          message: 'No momento não há vagas publicadas no site da SEE/MG para esta regional.',
        }
      
      case 'ERRO':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          textColor: 'text-red-800 dark:text-red-200',
          title: 'Erro na atualização',
          message: 'Ocorreu um erro ao atualizar as vagas. A equipe técnica foi notificada.',
        }
      
      default:
        return null
    }
  }
  
  const config = getAlertConfig()
  
  if (!config) {
    return null
  }
  
  const Icon = config.icon
  
  // Formatar data da última atualização
  const formatLastUpdate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  return (
    <div className={`relative p-4 rounded-xl border ${config.bgColor} ${config.borderColor} animate-slide-up`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${config.textColor}`}>
            {config.title}
          </h4>
          <p className={`text-sm mt-1 ${config.textColor} opacity-90`}>
            {config.message}
          </p>
          {statusData.lastUpdate && (
            <p className={`text-xs mt-2 ${config.textColor} opacity-70`}>
              Última atualização: {formatLastUpdate(statusData.lastUpdate)}
            </p>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${config.textColor} hover:bg-transparent opacity-70 hover:opacity-100`}
          onClick={() => setIsDismissed(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
