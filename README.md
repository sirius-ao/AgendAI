# AgendAI

Website em português para professores e escolas, reconstruído em componentes React a partir das cinco referências fornecidas. Inclui homepage, mega menu, funcionalidades, planos, escolas, blog e páginas auxiliares.

## Executar

Requisitos: Node.js 22 ou superior e pnpm 11.0.9.

```sh
pnpm install
pnpm dev
```

Abrir **http://localhost:3000**. Usar `localhost` também nos testes: o servidor de desenvolvimento verifica a origem das ligações de atualização.

```sh
pnpm build
pnpm --filter @agendai/website start
```

## Estrutura

```text
apps/website/                 Next.js App Router, TypeScript e Tailwind CSS
  src/app/                   Rotas, metadata, sitemap e robots
  src/components/            Layout e componentes por secção
  src/data/                  Funcionalidades, planos e artigos locais
  src/lib/site.ts            Configuração de SEO
  public/images/             Fotografias extraídas em WebP
packages/ui/                 Primitives partilhadas
packages/eslint-config/      ESLint para Next.js
packages/typescript-config/  Configuração TypeScript
scripts/crop-assets.py       Recortes reproduzíveis das referências
tests/website.spec.ts        Verificações de navegador
artifacts/screenshots/       Capturas da revisão visual
```

Os tokens de cor, tipografia, espaçamento, largura e raio estão em `apps/website/src/app/globals.css`. A fonte Inter é servida localmente, sem pedidos a serviços de fontes externos. Os ícones são Lucide; o logotipo combina um símbolo de livro com texto real.

## Conteúdo e interações

- Menu desktop acessível por clique, hover ou teclado, com Escape e fecho ao sair; menu móvel independente.
- Apresentação local em três passos. Substitui o CTA de vídeo, pois não foi fornecido um vídeo.
- Preços centralizados em `src/data/plans.ts`; a proposta anual aplica 20% de desconto e apresenta o total faturado anualmente. Valores e condições são explicitamente ilustrativos.
- FAQ nativa e comparação de planos expansível.
- Blog com pesquisa sem distinção de acentos, filtros, paginação local, categorias com contagens reais e oito artigos demonstrativos. Os dados tipados podem ser substituídos por uma integração CMS futura.
- Dashboards e documentos reconstruídos em HTML/CSS. Os números pertencem à escola de demonstração; não são métricas públicas do AgendAI.
- Os testemunhos fictícios foram substituídos por mensagens institucionais sem atribuição a clientes.
- `/entrar`, `/comecar` e `/contacto` são previews com validação local e feedback explícito. Não criam contas, enviam mensagens ou armazenam dados. A newsletter também não envia nem guarda o e-mail.
- Ícones sociais apresentados como “em breve”, sem URLs inventados. Inserir os endereços oficiais antes de disponibilizar ligações.

Não há backend, base de dados, autenticação, pagamentos, analytics ou CMS.

## SEO

Copiar `apps/website/.env.example` para `.env.local` e definir `NEXT_PUBLIC_SITE_URL` com o domínio oficial antes do build de publicação. O valor inicial é `http://localhost:3000`; não foi inventado um domínio de produção.

Inclui metadata por página, OpenGraph, Twitter, favicon SVG, sitemap, robots e JSON-LD nos artigos. As rotas de acesso não são indexáveis. As páginas de privacidade e termos explicam o âmbito demonstrativo; não substituem documentos comerciais finais.

## Verificação

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:a11y
```

Os testes iniciam o servidor quando necessário, ou reutilizam o servidor existente. Verificam as cinco páginas nas larguras 375, 390, 430, 768, 1024 e 1312 px, carregamento de imagens, ausência de overflow, navegação por teclado, apresentação, menus, planos, FAQ, comparação, blog, formulários e SEO. Geram capturas desktop/móvel em `artifacts/screenshots` e relatório em `playwright-report`.

A auditoria `test:a11y` requer o servidor ativo em `localhost:3000`, usa axe-core com regras WCAG A/AA e guarda os resultados em `artifacts/accessibility.json`. A verificação automática complementa a revisão visual e de teclado; não constitui certificação de acessibilidade.

## Fotografias das referências

As screenshots completas não fazem parte das páginas. Apenas nove regiões fotográficas foram extraídas, num total inferior a 200 KB. As fotografias mantêm a resolução disponível nas referências; para produção, originais de maior resolução permitirão melhorar a nitidez em ecrãs grandes.

Para reproduzir os recortes:

```sh
python -m pip install Pillow
python scripts/crop-assets.py "C:/caminho/AGENDAI-APP"
```

O script contém as coordenadas de cada recorte. Consultar `docs/assets.md` para a correspondência entre ficheiros e referências.
