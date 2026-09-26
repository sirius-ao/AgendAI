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

No Coolify, definir `NEXT_PUBLIC_SITE_URL` com a origem pública completa, por exemplo `https://o-seu-dominio.ao`, sem barra final. Este endereço é um exemplo; usar o domínio real do projeto.

Ativar a variável **no build e no runtime**. O Dockerfile declara o argumento com o mesmo nome. O Next.js gera parte da metadata durante o build: mudar o domínio requer novo build/deploy, não apenas reiniciar o container.

O container define `NODE_ENV=production`, `PORT=3000` e `HOSTNAME=0.0.0.0`. Não precisa de credenciais de base de dados, pagamentos ou outros serviços.

## Saúde e verificações após deploy

O Dockerfile já define um healthcheck HTTP interno. O endpoint `/health` devolve `200` e `{"status":"ok"}`, sem informação sensível. Não é uma API de negócio nem adiciona base de dados.

Depois do deploy:

1. Confirmar que o container está `healthy`.
2. Abrir a homepage, planos, escolas e blog através do domínio público.
3. Verificar uma fotografia, a troca mensal/anual e a pesquisa do blog.
4. Confirmar o domínio em `/sitemap.xml`, `/robots.txt` e na canonical das páginas.
5. Confirmar HTTPS no proxy do Coolify.

O cache de imagens é gravável pelo utilizador do container e pode ser descartado num novo deploy. O servidor não guarda dados de utilizadores. O dashboard guarda alterações em `localStorage`, no navegador de cada visitante; não requer volumes nem base de dados. A interface continua demonstrativa após publicação: não existe autenticação, envio externo de mensagens ou faturação.

O mesmo container serve o website público e todas as rotas `/dashboard`. Depois do deploy, abrir `/entrar` e escolher **Explorar dashboard de demonstração**, criar um plano e recarregar para verificar a persistência local. Usar HTTPS: a criação dos identificadores utiliza `crypto.randomUUID()`, disponível em contextos seguros (HTTPS ou localhost).

## Testar Docker localmente

```sh
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
