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

O Compose também inicia MinIO com bucket privado persistente (`agendai-local`). Para anexos na API autenticada, configure `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY` e `S3_SECRET_KEY`. Em Docker, `S3_ENDPOINT` é o endereço acessível pela API (`http://storage:9000`) e `S3_PUBLIC_ENDPOINT` é o endereço acessível pelo navegador (`http://localhost:9000` localmente). Em produção, use credenciais fortes, bucket privado, TLS e um endpoint público S3 compatível; nunca exponha as credenciais no frontend. Mantenha backups do volume MinIO e da base de dados.

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

## Anexos de planos

- `POST /schools/:schoolId/plans/:planId/attachments/upload` cria o metadado e devolve uma URL PUT assinada válida por 10 minutos.
- O navegador envia o binário diretamente para essa URL e chama `POST /schools/:schoolId/plans/:planId/attachments/:attachmentId/complete` para confirmar o tamanho.
- `GET /schools/:schoolId/plans/:planId/attachments` lista anexos; `GET .../:attachmentId/download` devolve uma URL GET assinada por 5 minutos; `DELETE .../:attachmentId` remove o objeto e o metadado.

O limite é 10 MB por ficheiro e os tipos aceites são PDF, formatos Office, CSV, PNG, JPEG e WebP. A API valida associação à escola, plano e disciplina do professor; planos privados ficam restritos ao autor e à administração. A eliminação do plano remove metadados por cascata; configure regras de ciclo de vida no bucket para limpar objetos órfãos após eliminações em cascata ou uploads abandonados. A implementação atual cobre planos; avaliações e biblioteca podem reutilizar a camada quando os respetivos fluxos forem integrados. Mensagens em tempo real, recuperação de palavra-passe, autenticação de dois fatores, billing, integrações OAuth, backups automáticos e monitorização também não estão ligados. O rate limit atual é local ao processo; use um limitador partilhado antes de executar várias instâncias.
