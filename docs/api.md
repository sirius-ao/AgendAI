# API NestJS

A API vive em `apps/api`, usa NestJS com PostgreSQL e Prisma, e publica rotas sob `/api/v1`. Inclui contas, sessões, escolas, membros, turmas, alunos e persistência para os módulos atuais do dashboard. O login, o registo e a sincronização do dashboard autenticado usam a API; a rota de demonstração continua no armazenamento local do navegador.

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

Defina `JWT_ACCESS_SECRET` como uma string aleatória de pelo menos 32 caracteres em `apps/api/.env`. A API fica em `http://localhost:3001/api/v1`; `WEB_ORIGIN` deve corresponder exatamente à origem do frontend. `NEXT_PUBLIC_API_URL` configura a URL pública usada pelo navegador e, no desenvolvimento local, usa `http://localhost:3001/api/v1`. `GET /api/v1/health` confirma que o processo responde.

Para executar os três serviços em Docker, defina `JWT_ACCESS_SECRET` no ambiente e execute `docker compose up --build -d`. A API aplica as migrações pendentes ao iniciar. `POSTGRES_PASSWORD` pode substituir a palavra-passe local predefinida; configure valores fortes antes de qualquer publicação.

## Autenticação

- `POST /auth/register`: cria utilizador, escola inicial e associação OWNER.
- `POST /auth/login`: valida email e palavra-passe.
- `POST /auth/refresh`: troca o cookie de renovação por um novo token de acesso e cookie rotativo.
- `POST /auth/logout`: revoga a sessão corrente.
- `GET /auth/me`: utilizador e escolas associados; requer `Authorization: Bearer <accessToken>`.
- `PATCH /auth/me`: atualiza nome e telefone. A alteração de email aguarda verificação de endereço.
- `POST /auth/register` aceita `invitationToken` para criar a conta e aderir a uma escola existente; sem convite, `schoolName` é obrigatório.

Os access tokens expiram em 15 minutos. O refresh token fica num cookie HttpOnly, SameSite Lax, e apenas o hash é guardado na base de dados. Em produção o cookie exige HTTPS.

## Escolas, turmas e alunos

- `GET /schools`, `POST /schools`, `GET /schools/:schoolId`
- `GET|POST /schools/:schoolId/classes`
- `PATCH|DELETE /schools/:schoolId/classes/:classId` (DELETE arquiva a turma)
- `GET|POST /schools/:schoolId/classes/:classId/students`

Cada rota de escola valida a associação do utilizador e filtra os dados pelo `schoolId`. OWNER, ADMIN e COORDINATOR podem gerir turmas e alunos; TEACHER pode consultar. A associação de um professor a várias escolas é suportada no modelo `SchoolMembership`.

## Membros e módulos do dashboard

- `GET /schools/:schoolId/members`, `POST /schools/:schoolId/invitations`, `GET /schools/:schoolId/invitations`
- `PATCH|DELETE /schools/:schoolId/members/:memberId`; `DELETE /schools/:schoolId/invitations/:invitationId`
- `POST /invitations/accept` (a conta convidada tem de usar o email do convite)
- `GET /schools/:schoolId/dashboard` devolve a escola e os registos sincronizados.
- `GET /schools/:schoolId/data/:collection`, `PUT|DELETE /schools/:schoolId/data/:collection/:recordId`

As coleções suportam disciplinas, planos, presenças, avaliações, calendário, recursos, biblioteca, relatórios, conversas/mensagens, tarefas, preferências, onboarding, turmas e alunos. Os registos JSON ficam separados por escola; limites de payload, autenticação e associação escolar são verificados. Endpoints tipados de turmas/alunos continuam disponíveis para integrações específicas.

Os convites não enviam email: a API devolve um token uma única vez e o administrador partilha o link apresentado em Configurações. A aceitação valida o email convidado e pode criar a conta no fluxo de adesão. O rate limit de login, registo e renovação é por IP e processo.

## Limites desta fase

Ainda não foram ligados envio de email/push, armazenamento binário de anexos, mensagens em tempo real, recuperação de palavra-passe, autenticação de dois fatores, billing, integrações OAuth, backups automáticos e monitorização. As alterações de registos e membros são auditadas em `GET /schools/:schoolId/audit`. Os dados de anexos no dashboard ainda são metadados; não constituem upload de ficheiros. O rate limit atual é local ao processo; use um limitador partilhado antes de executar várias instâncias.
