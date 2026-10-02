# API NestJS

A API vive em `apps/api`, usa NestJS com PostgreSQL e Prisma, e publica rotas sob `/api/v1`. O primeiro recorte cobre contas, sessões, escolas, turmas e alunos. O dashboard continua a usar os dados locais de demonstração; esta API ainda não foi ligada ao frontend.

## Desenvolvimento local

Requisitos: Node.js 22.12+ e pnpm 11.0.9.

```sh
cp apps/api/.env.example apps/api/.env
docker compose up -d database
pnpm install
pnpm --filter @agendai/api db:generate
pnpm --filter @agendai/api db:migrate -- --name init
pnpm --filter @agendai/api dev
```

Defina `JWT_ACCESS_SECRET` como uma string aleatória de pelo menos 32 caracteres em `apps/api/.env`. A API fica em `http://localhost:3001/api/v1`; `WEB_ORIGIN` deve corresponder exatamente à origem do frontend. `GET /api/v1/health` confirma que o processo responde.

Para executar os três serviços em Docker, defina `JWT_ACCESS_SECRET` no ambiente e execute `docker compose up --build -d`. A API aplica as migrações pendentes ao iniciar. `POSTGRES_PASSWORD` pode substituir a palavra-passe local predefinida; configure valores fortes antes de qualquer publicação.

## Autenticação

- `POST /auth/register`: cria utilizador, escola inicial e associação OWNER.
- `POST /auth/login`: valida email e palavra-passe.
- `POST /auth/refresh`: troca o cookie de renovação por um novo token de acesso e cookie rotativo.
- `POST /auth/logout`: revoga a sessão corrente.
- `GET /auth/me`: utilizador e escolas associados; requer `Authorization: Bearer <accessToken>`.

Os access tokens expiram em 15 minutos. O refresh token fica num cookie HttpOnly, SameSite Lax, e apenas o hash é guardado na base de dados. Em produção o cookie exige HTTPS.

## Escolas, turmas e alunos

- `GET /schools`, `POST /schools`, `GET /schools/:schoolId`
- `GET|POST /schools/:schoolId/classes`
- `PATCH|DELETE /schools/:schoolId/classes/:classId` (DELETE arquiva a turma)
- `GET|POST /schools/:schoolId/classes/:classId/students`

Cada rota de escola valida a associação do utilizador e filtra os dados pelo `schoolId`. OWNER, ADMIN e COORDINATOR podem gerir turmas e alunos; TEACHER pode consultar. A associação de um professor a várias escolas é suportada no modelo `SchoolMembership`.

## Limites desta fase

Ainda não há convites/gestão de membros, recuperação de palavra-passe, rate limiting, auditoria, upload, sincronização com o estado de demonstração do dashboard ou endpoints para planos, presenças, avaliações, calendário, mensagens, recursos, relatórios e biblioteca. A autenticação não deve ser publicada sem rate limiting e processo de recuperação de conta.
