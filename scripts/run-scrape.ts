/**
 * Roda o scrape na sua máquina (IP residencial).
 * Use quando o site SEE/MG bloquear IPs de datacenter (Vercel).
 *
 * Carrega apenas .env e .env.local (nunca .env.example), da pasta do script e do cwd.
 *
 * Uso: npm run scrape:local  (rode na raiz do projeto)
 * Ou: npx tsx scripts/run-scrape.ts
 */
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirnameScript = path.dirname(fileURLToPath(import.meta.url))
const rootFromScript = path.resolve(__dirnameScript, '..')
const rootFromCwd = process.cwd()

// Só carrega .env e .env.local (nunca .env.example). Carrega do script e do cwd; o último vence.
function loadEnvFrom(dir: string) {
  const envPath = path.join(dir, '.env')
  const envLocalPath = path.join(dir, '.env.local')
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath })
  if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath })
}

loadEnvFrom(rootFromScript)
loadEnvFrom(rootFromCwd)

async function main() {
  const { scrapeVagas } = await import('../src/lib/scraper')

  console.log('Rodando scrape localmente (IP desta máquina)...')
  const result = await scrapeVagas()

  console.log('Resultado:', JSON.stringify(result, null, 2))

  if (result.status !== 'OK' && result.status !== 'SEM_VAGAS') {
    process.exit(1)
  }

  const baseUrl = process.env.SCRAPE_URL?.replace(/\/api\/scrape\/?$/, '')
  const secret = process.env.SCRAPE_SECRET
  if (baseUrl && secret) {
    console.log('Disparando geocode na API...')
    try {
      const res = await fetch(`${baseUrl}/api/geocode?secret=${encodeURIComponent(secret)}`, {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      console.log('Geocode:', res.status, body)
    } catch (e) {
      console.warn('Geocode falhou (opcional):', e)
    }
  } else {
    console.log('SCRAPE_URL e SCRAPE_SECRET não definidos — geocode não disparado.')
    console.log('Adicione no .env.local (não no .env.example) as variáveis:')
    console.log('  SCRAPE_URL=https://seu-dominio.vercel.app/api/scrape')
    console.log('  SCRAPE_SECRET=o-mesmo-valor-da-api')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
