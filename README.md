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
