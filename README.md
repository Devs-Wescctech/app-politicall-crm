# PoliticAll CRM (Leads + Pipeline + Vendas + Usuários)

Monorepo com:
- **web/**: React + Vite + Tailwind (dark predominante + toggle light/dark)
- **api/**: Node + Express + Prisma + JWT + RBAC
- **infra/**: Docker Compose + Nginx reverse proxy (Postgres fica no host/SO)

## Requisitos
- Node 20+
- Docker / Docker Compose (para subir web/api)
- Postgres no host/servidor (fora do Docker)

## Configuração rápida (dev local)

1) Crie o `.env` na raiz (baseado no `.env.example`)
2) API:
```bash
cd api
npm i
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

3) Web:
```bash
cd web
npm i
npm run dev
```

A Web por padrão usa `VITE_API_URL` (no `.env` da raiz).

## Seed padrão
- Cria stages iniciais (Kanban) incluindo **Fechados**
- Cria usuário admin:
  - email: `admin@politicall.local`
  - senha: `admin123`
> Troque em produção.

## Deploy (servidor)
1) Copie a pasta `infra/` para o servidor (ex.: `/opt/politicall-crm/infra`)
2) Crie `.env` ao lado do `docker-compose.yml` (use `.env.example`)
3) Suba:
```bash
cd /opt/politicall-crm/infra
docker compose up -d --build
```

## Notas importantes
- Postgres fora do container: use `DATABASE_URL` apontando para o IP do host (ex.: `172.17.0.1`) ou `host.docker.internal`.
- CORS: travado por `CORS_ORIGIN`.
- Visibilidade de Leads no AGENT: configurável por usuário (`leadScope` = `OWN` ou `ALL`).

