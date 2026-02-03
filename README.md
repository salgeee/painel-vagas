# Painel de Vagas - SEE/MG

Aplicação web para acompanhar as vagas disponíveis na rede estadual de educação de Minas Gerais.

## Funcionalidades

- Lista de vagas com filtros (município, cargo, turno)
- Cálculo de distância até as vagas (via OSRM)
- Localização do usuário salva no localStorage (privacidade)
- Atualização automática via GitHub Actions
- Interface moderna e responsiva

## Stack Tecnológica

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: API Routes do Next.js
- **Banco de Dados**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Scraping**: GitHub Actions (cron)

## Configuração

### 1. Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em SQL Editor e execute o conteúdo de `supabase/schema.sql`
4. Vá em Settings > API e copie:
   - Project URL
   - anon public key
   - service_role key (secreto!)

### 2. Variáveis de Ambiente

Crie um arquivo `.env.local` baseado no `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_KEY=sua-service-role-key
SCRAPE_SECRET=uma-string-aleatoria-segura
```

### 3. Vercel

1. Conecte seu repositório à Vercel
2. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `SCRAPE_SECRET`

### 4. GitHub Actions

Configure os seguintes secrets no repositório:

- `SCRAPE_URL`: URL completa do endpoint (ex: `https://seu-app.vercel.app/api/scrape`)
- `SCRAPE_SECRET`: Mesmo valor de `SCRAPE_SECRET` nas variáveis de ambiente

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build
npm start
```

## Executar Scraping Manualmente

```bash
curl -X POST "http://localhost:3000/api/scrape?secret=SEU_SCRAPE_SECRET"
```

Ou vá em Actions no GitHub e execute manualmente o workflow "Scrape Vagas".

---

## Quando o site SEE/MG retorna 403 (IP bloqueado)

O site da SEE/MG pode bloquear requisições vindas de datacenters (Vercel, AWS, etc.). Se o scraping na Vercel/GitHub falhar com **HTTP 403**, use uma destas opções:

### Opção 1: Scrape na sua máquina (recomendado)

Rode o scrape no seu PC (IP residencial). Os dados vão direto para o Supabase; depois você pode disparar o geocode na API em produção.

```bash
# Na raiz do projeto, com .env.local configurado (Supabase + SCRAPE_SECRET)
npm run scrape:local
```

O script:
1. Carrega `.env` e `.env.local`
2. Executa o scraper (requisições saem do **seu IP**)
3. Se existir `SCRAPE_URL` e `SCRAPE_SECRET`, dispara o geocode na sua API (Vercel) para preencher lat/lng

Para agendar no Windows: use o **Agendador de Tarefas** para rodar `npm run scrape:local` no horário desejado (ex.: a cada 30 min). No Mac/Linux: `crontab -e` e adicione algo como `*/30 * * * * cd /caminho/do/projeto && npm run scrape:local`.

### Opção 2: GitHub Actions com self-hosted runner

Rode o workflow na **sua máquina** em vez de `ubuntu-latest`:

1. Em Settings > Actions > Runners, adicione um **self-hosted runner** (PC ou Raspberry Pi em casa).
2. No `.github/workflows/scrape.yml`, troque `runs-on: ubuntu-latest` por `runs-on: self-hosted`.
3. Ajuste o job para **rodar o scraper localmente** (checkout, `npm ci`, `npm run scrape:local`) em vez de chamar a API na Vercel. Assim as requisições à SEE/MG saem do IP da sua casa.

(Se quiser, posso te passar o conteúdo exato do workflow para self-hosted.)

### Opção 3: Proxy residencial (pago)

Usar um serviço de proxy residencial (ex.: Bright Data, Oxylabs) e configurar o scraper para enviar as requisições por esse proxy. Funciona de qualquer host, mas tem custo e pode conflitar com os termos de uso do site.

## Estrutura do Projeto

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── vagas/route.ts    # GET vagas
│   │   │   └── scrape/route.ts   # POST scraping
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn/ui
│   │   ├── AddressModal.tsx
│   │   ├── FilterBar.tsx
│   │   ├── Header.tsx
│   │   ├── VagaCard.tsx
│   │   └── VagaList.tsx
│   └── lib/
│       ├── distance.ts           # Cálculo OSRM
│       ├── scraper.ts            # Lógica de scraping
│       ├── supabase.ts           # Cliente Supabase
│       ├── types.ts              # TypeScript types
│       └── utils.ts              # Utilitários
├── supabase/
│   └── schema.sql                # Schema do banco
└── .github/
    └── workflows/
        └── scrape.yml            # Cron job
```

## Privacidade

- O endereço do usuário é salvo **apenas no localStorage** do navegador
- Nunca é enviado para nossos servidores
- O cálculo de distância usa coordenadas (lat/lng), não o endereço completo
- O serviço OSRM é público e não armazena dados

## Licença

MIT
