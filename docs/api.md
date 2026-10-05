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

Para executar os testes unitários das regras de acesso: `pnpm test:api`.

Defina `JWT_ACCESS_SECRET` como uma string aleatória de pelo menos 32 caracteres em `apps/api/.env`. A API fica em `http://localhost:3001/api/v1`; `WEB_ORIGIN` deve corresponder exatamente à origem do frontend. `NEXT_PUBLIC_API_URL` configura a URL pública usada pelo navegador e, no desenvolvimento local, usa `http://localhost:3001/api/v1`. `GET /api/v1/health` confirma que o processo responde.

Para executar a stack completa em Docker, copie `.env.example` para `.env`, defina `JWT_ACCESS_SECRET` e execute `docker compose up --build -d --wait`. A API aplica as migrações pendentes ao iniciar. `POSTGRES_PASSWORD` pode substituir a palavra-passe local predefinida; configure valores fortes antes de qualquer publicação.

O Compose também inicia MinIO com bucket privado persistente (`agendai-local`), usando uma imagem Elestio fixada por digest porque a imagem upstream `minio/minio` deixou de estar disponível no Docker Hub. Essa imagem é um snapshot legado, sem atualizações recentes; para armazenamento de produção a longo prazo, configure um serviço S3 mantido e configure `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY` e `S3_SECRET_KEY`. Em Docker, `S3_ENDPOINT` é o endereço acessível pela API (`http://storage:9000`) e `S3_PUBLIC_ENDPOINT` é o endereço acessível pelo navegador (`http://localhost:9000` localmente). Use credenciais fortes, bucket privado e TLS; nunca exponha as credenciais no frontend. Mantenha backups do volume de armazenamento e da base de dados. No Coolify, remova a variável antiga `MINIO_IMAGE`; a imagem pode ser substituída por `STORAGE_IMAGE`.

### Cópias de segurança

Com os serviços Compose ativos, `scripts/backup-database.sh` cria um dump PostgreSQL no formato custom em `backups/database/`; `scripts/backup-storage.sh` cria um snapshot dos ficheiros em `backups/object-storage/`. Ambos aceitam `AGENDAI_BACKUP_DIR` para escolher um destino. Instale `mc` e configure o alias antes da cópia do armazenamento, por exemplo em desenvolvimento local:

```sh
mc alias set agendai http://127.0.0.1:9000 agendai-local agendai-local-secret-change-me
```

Em produção, configure o alias com o endpoint e credenciais privados do serviço S3. Agende ambos os scripts e aponte `AGENDAI_BACKUP_DIR` para armazenamento independente do servidor. Teste periodicamente a restauração com `pg_restore` numa base de dados separada e a recuperação de ficheiros. Os volumes Docker, por si só, não são cópias de segurança.

## Autenticação

- `POST /auth/register`: cria utilizador, escola inicial e associação OWNER.
- `POST /auth/login`: valida email e palavra-passe.
- `POST /auth/refresh`: troca o cookie de renovação por um novo token de acesso e cookie rotativo.
- `POST /auth/logout`: revoga a sessão corrente.
- `POST /auth/password/forgot`: envia uma ligação de recuperação de uso único, válida por 30 minutos.
- `POST /auth/password/reset`: define uma nova palavra-passe e revoga as sessões de renovação existentes.
- `POST /auth/verify-email` e `POST /auth/verify-email/resend`: confirma email por ligação única válida durante 24 horas e permite pedir outra ligação.
- `GET /auth/me`: utilizador e escolas associados; requer `Authorization: Bearer <accessToken>`.
- `PATCH /auth/me`: atualiza nome e telefone. A alteração de email aguarda verificação de endereço.
- `POST /auth/register` aceita `invitationToken` para criar a conta e aderir a uma escola existente; sem convite, `schoolName` é obrigatório.

Os access tokens expiram em 15 minutos. O refresh token fica num cookie HttpOnly, SameSite Lax, e apenas o hash é guardado na base de dados. Em produção o cookie exige HTTPS.

A recuperação, a confirmação de email, os convites, o contacto e a newsletter usam a API Resend. Defina `RESEND_API_KEY`, `EMAIL_FROM` verificado, `CONTACT_EMAIL` e `NEXT_PUBLIC_SITE_URL`. Em produção, registos novos e antigos sem email confirmado ficam sem acesso até confirmarem o endereço. O Compose exige a configuração por omissão; `REQUIRE_EMAIL_CONFIG=false` permite executar localmente sem fornecedor e desativa a confirmação obrigatória. Os pedidos de recuperação e reenvio não revelam se o endereço está registado. Configure limites de envio e alertas no fornecedor antes de abrir os formulários ao público.

## Contacto e newsletter

- `POST /marketing/contact`: envia o pedido para `CONTACT_EMAIL` e define o email do visitante como reply-to.
- `POST /marketing/newsletter/subscribe`: exige `email` e `consent: true`; envia uma ligação de confirmação válida por 24 horas.
- `POST /marketing/newsletter/confirm`: ativa a subscrição com o token enviado por email.
- `POST /marketing/newsletter/unsubscribe`: remove a subscrição usando o token de cancelamento.

Os tokens são guardados apenas como hashes. Os formulários usam o limitador partilhado na base de dados (12 pedidos por IP/rota em cada janela de 15 minutos). Em produção atrás de proxy, configure `TRUST_PROXY=true` apenas se a API estiver acessível exclusivamente através do proxy confiável; caso contrário, não aceite IPs encaminhados pelo cliente.

## Escolas, turmas e alunos

- `GET /schools`, `POST /schools`, `GET /schools/:schoolId`
- `GET|POST /schools/:schoolId/classes`
- `PATCH|DELETE /schools/:schoolId/classes/:classId` (DELETE arquiva a turma)
- `GET|POST /schools/:schoolId/classes/:classId/students`

Cada rota de escola valida a associação do utilizador e filtra os dados pelo `schoolId`. OWNER, ADMIN e COORDINATOR podem gerir turmas e alunos; TEACHER só consulta turmas e alunos nas disciplinas atribuídas. A associação de um professor a várias escolas é suportada no modelo `SchoolMembership`.

## Membros e módulos do dashboard

- `GET /schools/:schoolId/members`, `POST /schools/:schoolId/invitations`, `GET /schools/:schoolId/invitations`
- `PATCH|DELETE /schools/:schoolId/members/:memberId`; `DELETE /schools/:schoolId/invitations/:invitationId`
- `POST /invitations/accept` (a conta convidada tem de usar o email do convite)
- `GET /schools/:schoolId/dashboard` devolve a escola e os registos sincronizados.
- `GET /schools/:schoolId/data/:collection`, `PUT|DELETE /schools/:schoolId/data/:collection/:recordId`

As coleções suportam disciplinas, planos, presenças, avaliações, calendário, recursos, biblioteca, relatórios, conversas/mensagens, tarefas, preferências, onboarding, turmas e alunos. Os registos JSON ficam separados por escola; limites de payload, autenticação e associação escolar são verificados. Endpoints tipados de turmas/alunos continuam disponíveis para integrações específicas.

Os convites enviam email quando o Resend está configurado e continuam a disponibilizar um link manual como alternativa. A aceitação valida o email convidado e pode criar a conta no fluxo de adesão. O rate limit é partilhado entre instâncias pela base de dados e usa o IP resolvido pelo proxy confiável.

As permissões de professores são limitadas no servidor às disciplinas e turmas atribuídas; coleções pessoais usam a autoria registada no servidor. Dados escolares e preferências gerais continuam reservados à administração. A demonstração em `/dashboard` usa dados locais e não tem autenticação; nunca introduza dados reais de alunos nesse modo.

## Anexos de planos

- `POST /schools/:schoolId/plans/:planId/attachments/upload` cria o metadado e devolve uma URL PUT assinada válida por 10 minutos.
- O navegador envia o binário diretamente para essa URL e chama `POST /schools/:schoolId/plans/:planId/attachments/:attachmentId/complete` para confirmar o tamanho.
- `GET /schools/:schoolId/plans/:planId/attachments` lista anexos; `GET .../:attachmentId/download` devolve uma URL GET assinada por 5 minutos; `DELETE .../:attachmentId` remove o objeto e o metadado.

O limite é 10 MB por ficheiro e os tipos aceites são PDF, formatos Office, CSV, PNG, JPEG e WebP. A API valida associação à escola, plano e disciplina do professor; planos privados ficam restritos ao autor e à administração. A eliminação do plano remove metadados por cascata; configure regras de ciclo de vida no bucket para limpar objetos órfãos após eliminações em cascata ou uploads abandonados. A implementação atual cobre planos; avaliações e biblioteca podem reutilizar a camada quando os respetivos fluxos forem integrados. Mensagens em tempo real, autenticação de dois fatores, billing, integrações OAuth, backups agendados e monitorização ainda precisam de integração/configuração.
