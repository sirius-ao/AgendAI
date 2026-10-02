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

No Coolify, definir `NEXT_PUBLIC_SITE_URL` com a origem pública completa, por exemplo `https://o-seu-dominio.ao`, sem barra final, e `NEXT_PUBLIC_API_URL` com a URL pública da API, terminada em `/api/v1`. Estes endereços são exemplos; usar os domínios reais do projeto.

Ativar `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_API_URL` **no build e no runtime**. O Dockerfile declara os argumentos com os mesmos nomes. O Next.js inclui a URL pública da API no bundle durante o build: mudar o endereço requer novo build/deploy.

O website define `NODE_ENV=production`, `PORT=3000` e `HOSTNAME=0.0.0.0`. Para login e dashboard autenticado, publicar também a API e uma base PostgreSQL; a instalação e variáveis estão em [docs/api.md](api.md). Configurar `WEB_ORIGIN` na API com a origem exata do website e guardar `JWT_ACCESS_SECRET` como segredo. O Dockerfile da API aplica as migrações ao arrancar.

## Saúde e verificações após deploy

O Dockerfile já define um healthcheck HTTP interno. O endpoint `/health` devolve `200` e `{"status":"ok"}`, sem informação sensível. Não é uma API de negócio nem adiciona base de dados.

Depois do deploy:

1. Confirmar que o container está `healthy`.
2. Abrir a homepage, planos, escolas e blog através do domínio público.
3. Verificar uma fotografia, a troca mensal/anual e a pesquisa do blog.
4. Confirmar o domínio em `/sitemap.xml`, `/robots.txt` e na canonical das páginas.
5. Confirmar HTTPS no proxy do Coolify.

O website serve a experiência pública e a demonstração local. As contas autenticadas usam a API e PostgreSQL publicados separadamente; a base de dados precisa de armazenamento persistente e cópias de segurança. Convites usam links para partilha; email, anexos binários e faturação ainda não estão configurados.

O mesmo container serve o website público e todas as rotas `/dashboard`. Depois do deploy, abrir `/entrar` para testar o login e `/dashboard` para a demonstração. Usar HTTPS: a API define cookies de renovação seguros em produção.

## Testar Docker localmente

```sh
cp apps/api/.env.example .env
docker compose up --build -d
docker compose ps
docker compose logs -f website
```

Abrir `http://localhost:3000`. Para usar outra porta, definir `WEBSITE_PORT` no `.env` da raiz; o serviço mantém a porta interna 3000. O `.env` não é copiado para a imagem.

Sem Compose:

```sh
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://o-seu-dominio.ao --build-arg NEXT_PUBLIC_API_URL=https://api.o-seu-dominio.ao/api/v1 -t agendai-website .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=https://o-seu-dominio.ao -e NEXT_PUBLIC_API_URL=https://api.o-seu-dominio.ao/api/v1 agendai-website
```

Se o Docker Desktop falhar antes do build com um erro de resolução do proxy, corrigir a configuração de rede/proxy do próprio Docker Desktop. Esse erro impede o download das imagens base e não é uma falha de compilação do website. Não é necessário levar um proxy local para o Coolify.

## Referências oficiais

- [Coolify: Dockerfile](https://coolify.io/docs/applications/builds/dockerfile)
- [Coolify: configuração geral, domínio e portas](https://coolify.io/docs/applications/configuration/general)
- [Next.js: output standalone e monorepos](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
