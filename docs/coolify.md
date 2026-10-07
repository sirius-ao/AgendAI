# Deploy no Coolify

O `Dockerfile` na raiz compila o monorepo e executa apenas o output `standalone` do website. O runtime não inclui pnpm, ferramentas de teste ou o código de desenvolvimento. Usa Node.js 22, utilizador sem privilégios, porta 3000 e um `HEALTHCHECK` para `/health`.

## Configuração recomendada

Criar uma aplicação a partir do repositório Git e selecionar **Dockerfile** como build pack.

| Campo                | Valor                                     |
| -------------------- | ----------------------------------------- |
| Base Directory       | `/` (raiz do repositório)                 |
| Dockerfile Location  | `/Dockerfile`                             |
| Build Stage / Target | Vazio; o último estágio é `runner`        |
| Ports Exposes        | `3000`                                    |
| Domain               | O domínio oficial com `https://`          |
| Port Mapping no host | Não é necessário; usar o proxy do Coolify |
| Volume persistente   | Não é necessário                          |

**Não usar `apps/website` como contexto de build:** os packages partilhados e o lockfile estão na raiz. Não configurar comandos Nixpacks, `pnpm dev`, nem publicação estática. O Dockerfile define os comandos de instalação, build e arranque.

## Variável obrigatória para SEO de produção

No Coolify, definir `NEXT_PUBLIC_SITE_URL` com a origem pública completa, por exemplo `https://o-seu-dominio.ao`, sem barra final. O website chama a API em `/api/v1` no mesmo domínio; o Next.js encaminha estas chamadas ao serviço `api` pela rede interna do Compose, sem expor um endereço local no browser.

Para o domínio atual do AgendAKI, usar `https://www.agendaki.net` em `NEXT_PUBLIC_SITE_URL` e `WEB_ORIGIN`. Nunca usar `localhost` nessas variáveis em produção. No Compose, o website usa a porta interna `3000` e publica por omissão a porta do host `3003` (`WEBSITE_PORT=3003`), pois a `3000` já está ocupada neste servidor. A API usa a porta interna `3001` e publica a `3002` (`API_PORT=3002`), mas o website comunica com ela pela rede interna do Compose; não configurar `NEXT_PUBLIC_API_URL` no Coolify.

Para a área `/admin`, configurar `SUPER_ADMIN_EMAILS` com o email que será usado na primeira conta super admin e criar duas chaves independentes com `openssl rand -hex 32`: `ADMIN_BACKUP_ENCRYPTION_KEY` para os backups e `ADMIN_MFA_ENCRYPTION_KEY` para os segredos TOTP dos administradores. `ADMIN_MFA_REQUIRED` controla a exigência global de MFA e assume `true` por padrão; use `false` para desligá-la. Desligar a exigência não apaga configurações existentes, que voltam a ser obrigatórias ao definir `true`. Criar e confirmar a conta desse email; no primeiro acesso com MFA obrigatória, ativá-la com uma aplicação autenticadora. Guardar as duas chaves num gestor de segredos e numa cópia de recuperação separada do servidor. Sem a chave de backups não é possível abrir os dumps, e sem a chave MFA os administradores terão de reconfigurar a autenticação. A migração da API cria os campos e tabelas administrativos no arranque.

Ativar `NEXT_PUBLIC_SITE_URL` **no build e no runtime**. O Dockerfile declara o argumento com esse nome. A rota relativa `/api/v1` não depende do domínio durante o build.

O website define `NODE_ENV=production`, `PORT=3000` e `HOSTNAME=0.0.0.0`. Para login e dashboard autenticado, publicar também a API e uma base PostgreSQL; a instalação e variáveis estão em [docs/api.md](api.md). Configurar `WEB_ORIGIN` na API com a origem exata do website e guardar `JWT_ACCESS_SECRET` como segredo. O Dockerfile da API aplica as migrações ao arrancar.

## Saúde e verificações após deploy

O Dockerfile já define um healthcheck HTTP interno. O endpoint `/health` devolve `200` e `{"status":"ok"}`, sem informação sensível. Não é uma API de negócio nem adiciona base de dados.

Depois do deploy:

1. Confirmar que o container está `healthy`.
2. Abrir a homepage, planos, escolas e blog através do domínio público.
3. Verificar uma fotografia, a troca mensal/anual e a pesquisa do blog.
4. Confirmar o domínio em `/sitemap.xml`, `/robots.txt` e na canonical das páginas.
5. Confirmar HTTPS no proxy do Coolify.

O website serve a experiência pública e a demonstração local. As contas autenticadas usam a API e PostgreSQL publicados separadamente; a base de dados precisa de armazenamento persistente e cópias de segurança. Configure também o armazenamento S3 compatível para anexos de planos (`S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY` e `S3_SECRET_KEY`) no serviço da API. `S3_PUBLIC_ENDPOINT` tem de ser acessível pelo navegador e o bucket deve permanecer privado. O Compose usa uma imagem Elestio MinIO fixada por digest apenas como compatibilidade; para produção duradoura, use um serviço S3 com atualizações de segurança. Remova qualquer variável Coolify antiga `MINIO_IMAGE`; para substituir a imagem do container, use `STORAGE_IMAGE`. Configure `RESEND_API_KEY`, `EMAIL_FROM` com domínio verificado, `CONTACT_EMAIL`, `NEXT_PUBLIC_SITE_URL` e `REQUIRE_EMAIL_CONFIG=true`; sem fornecedor e endereço de contacto configurados, a API não inicia. Recuperação, confirmação de email, convites, contacto e newsletter usam Resend. Defina `TRUST_PROXY=true` somente se a API só receber tráfego do proxy confiável do Coolify. Faturação não está configurada.

O mesmo container serve o website público e todas as rotas `/dashboard`. Depois do deploy, abrir `/entrar` para testar o login e `/dashboard` para a demonstração. Usar HTTPS: a API define cookies de renovação seguros em produção.

## Testar Docker localmente

```sh
cp .env.example .env
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs -f website
```

Abrir `http://localhost:3000`. Para usar outra porta, definir `WEBSITE_PORT` no `.env` da raiz; o serviço mantém a porta interna 3000. O `.env` não é copiado para a imagem.

Sem Compose:

```sh
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://o-seu-dominio.ao -t agendai-website .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=https://o-seu-dominio.ao agendai-website
```

Se o Docker Desktop falhar antes do build com um erro de resolução do proxy, corrigir a configuração de rede/proxy do próprio Docker Desktop. Esse erro impede o download das imagens base e não é uma falha de compilação do website. Não é necessário levar um proxy local para o Coolify.

## Referências oficiais

- [Coolify: Dockerfile](https://coolify.io/docs/applications/builds/dockerfile)
- [Coolify: configuração geral, domínio e portas](https://coolify.io/docs/applications/configuration/general)
- [Next.js: output standalone e monorepos](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
