# Dashboard AgendAI

## Integração no projeto existente

O dashboard foi acrescentado ao app Next.js `apps/website` do monorepo. Não foi criado outro app, backend ou sistema de autenticação. O website público, os packages partilhados e o Dockerfile continuam a ser utilizados.

`SiteFrame` escolhe o enquadramento público ou o dashboard. O layout `/dashboard` instala `DashboardProvider` e `DashboardShell`: sidebar, topbar, pesquisa global (`Ctrl/Cmd+K`), notificações locais, perfil, footer e modais. A sidebar adapta-se a tablet e torna-se um menu móvel. O shell preserva o estado entre navegações.

## Rotas e referências

| Rota                        | Página / referência                          |
| --------------------------- | -------------------------------------------- |
| `/dashboard`                | Início, referência 1                         |
| `/dashboard/planos-de-aula` | Lista e filtros, referência 2                |
| `/dashboard/turmas`         | Lista de turmas, complemento da referência 3 |
| `/dashboard/turmas/[id]`    | Alunos e informações, referência 3           |
| `/dashboard/presencas`      | Chamada, referência 4                        |
| `/dashboard/avaliacoes`     | Notas e médias, referência 5                 |
| `/dashboard/calendario`     | Semana, mês e lista, referência 6            |
| `/dashboard/recursos`       | Descoberta de materiais, referência 7        |
| `/dashboard/relatorios`     | Indicadores calculados, referência 8         |
| `/dashboard/biblioteca`     | Materiais pessoais, referência 9             |
| `/dashboard/mensagens`      | Conversas locais, referência 10              |
| `/dashboard/configuracoes`  | Perfil e preferências, referência 11         |

Os modais de plano, avaliação e evento correspondem às referências 12, 13 e 14. `?turma=10a`, `?q=...` e `?conversa=chat-10a` ligam os módulos. A entrada demonstrativa em `/entrar` ou `/comecar` encaminha para `/dashboard`, sem criar uma sessão autenticada. Todas as rotas do dashboard têm `noindex` e estão excluídas do robots.

## Ficheiros e componentes

Os caminhos seguintes são relativos a `apps/website/src`, salvo indicação contrária.

- `app/dashboard/`: layout, 12 páginas, loading, error e `dashboard.css`, com tokens e regras isoladas do website.
- `components/dashboard/DashboardShell.tsx`: estrutura global e pesquisa.
- `components/dashboard/state/DashboardProvider.tsx`: estado partilhado, persistência, feedback e controlo dos modais.
- `components/dashboard/ui/Primitives.tsx`: `PageHeader`, `Panel`, `StatCard`, `Tabs`, `StatusBadge`, `SearchInput`, `SelectField`, `Field`, `Switch`, `Avatar`, `Pagination`, `EmptyState`, `QuickActions`, `ActionMenu`, `Modal`, `ConfirmDialog` e `Attachments`.
- `components/dashboard/ui/Charts.tsx`: gráficos de barras, anel e linha em HTML/CSS/SVG, sem biblioteca de gráficos.
- `components/dashboard/forms/CreationModals.tsx`: formulários de criação/edição com campos obrigatórios, validação de datas, anexos locais e preferências.
- `components/dashboard/pages/`: componentes separados para início, planos, turmas, presenças, avaliações, calendário, recursos/biblioteca, relatórios, mensagens e configurações.
- `types/dashboard.ts`: entidades e relações tipadas.
- `data/dashboard/seed.ts` e `navigation.ts`: exemplos coerentes e navegação.
- `lib/dashboard/repository.ts`, `selectors.ts`, `export.ts`: adapter local, cálculos, pesquisa, datas, CSV e impressão.
- Na raiz: `tests/dashboard.spec.ts`, `scripts/check-dashboard-accessibility.mjs` e `scripts/crop-dashboard-assets.py`.

Ficheiros existentes ajustados: `app/layout.tsx` e `components/layout/SiteFrame.tsx` para integrar o shell; `components/common/AccessPreview.tsx` para entrar na demonstração; `app/robots.ts` para excluir o dashboard; páginas de privacidade/termos para explicar o armazenamento local; README e documentação do Coolify. A configuração Next.js standalone e Docker continua a servir as duas áreas no mesmo processo.

## Dados e comportamentos ligados

A seed contém 6 turmas, 186 alunos (28 na 10ª A), 7 disciplinas, 24 planos, 24 avaliações, 36 chamadas, 19 eventos, 12 recursos, 7 conversas, 3 relatórios e 5 tarefas. Datas de exemplo concentram-se em setembro/outubro de 2026; o botão Hoje do calendário indica explicitamente a data de demonstração. Números de cards, categorias, médias e presenças derivam desses registos. Pequenas inconsistências dos conceitos visuais foram corrigidas em favor dos cálculos reais.

- Planos: pesquisa, filtros, paginação, favoritos, visualização, edição, duplicação, eliminação confirmada, CSV e impressão/PDF pelo navegador.
- Turmas: criar/editar turmas, pesquisar/paginar/adicionar alunos, alterar situação, exportar lista e abrir módulos no contexto da turma. Criar uma turma cria também a sua conversa local.
- Presenças: seleção de turma/data, estados e observações, marcar todos, guardar/cancelar, histórico e exportação. As estatísticas e relatórios usam os registos guardados.
- Avaliações: criação/edição, disciplinas/períodos, notas de 0 a 20, médias ponderadas normalizadas pelos pesos com nota, resultados e exportação. Criar uma avaliação acrescenta um evento ao calendário.
- Calendário: navegação por datas, semana/mês/lista, filtro de turma e eventos editáveis. Eventos simultâneos ocupam colunas; o horário amplia-se para eventos fora da faixa escolar.
- Recursos e biblioteca: pesquisa, categorias, disciplina, nível, ordenação, favoritos, pastas, referências de ficheiros até 10 MB, associação a planos, lixeira/restauro e marca de partilha local. As fotografias são previews, não ficheiros descarregáveis; o botão de exportação fornece uma ficha descritiva identificada.
- Relatórios: presença, notas, disciplinas, alunos em risco/destaque e atividades; filtros por turma/período e exports dos dados atuais.
- Mensagens: conversas de turma/individuais, pesquisa, filtros, favoritos, arquivo, texto e nomes de anexos, membros e exportação. Envio apenas para o estado local.
- Configurações: perfil/escola, tema claro/escuro/sistema, preferências locais, fuso para mensagens, exportação JSON e reposição confirmada.

## Persistência e backend futuro

### Modelos de planos de aula

Incrementos: o editor conserva rascunhos automáticos locais por plano, por cópia e por exemplo; a lista apresenta atalhos para retomar. Fechar preserva o rascunho; descartar exige confirmação. Confirmar o plano limpa o rascunho e cria/atualiza um único evento ligado por `sourceId`, incluindo turma, disciplina, data, hora e duração. A edição dessa aula pelo calendário abre o editor do plano. Eliminar um plano remove também o evento ligado; a chamada histórica não é eliminada.

“Usar noutra turma” e “Duplicar e rever” abrem uma cópia independente, pedindo nova turma e data. Os exemplos ilustrativos de Matemática e Português incluem objetivos, conteúdos, recursos, avaliação e quatro etapas de 50 minutos no total; precisam de revisão pelo professor antes de uso. Estão disponíveis na galeria de modelos.

A impressão dedicada de planos abre um documento A4, com cabeçalho, secções, tabela de etapas e assinaturas. A numeração usa margens de página CSS quando suportadas; os cabeçalhos/rodapés do diálogo de impressão são a alternativa do navegador. A persistência mantém-se local e não inclui sincronização entre dispositivos. Os controlos móveis foram revistos no CSS; não houve validação visual no navegador nem execução de testes ou builds nesta alteração.

Em Planos de Aula, a secção Modelos apresenta Simplificado, Detalhado e Da escola, com pré-visualização antes da escolha. O editor inclui identificação preenchida com os dados locais, objetivos, conteúdos, atividades, recursos e avaliação. O Detalhado acrescenta pré-requisitos e etapas com minutos e ações do professor/alunos. O Da escola acrescenta campos com nomes, conteúdo e ordem editáveis. A preferência de modelo e os nomes dos campos podem ser reutilizados em novas aulas; o conteúdo de cada aula é independente.

Os planos guardam uma cópia do cabeçalho e dos campos, sem alterar retroativamente os existentes. Mudar de modelo no editor preserva os dados adicionais, mostrando na pré-visualização apenas os campos relevantes. A secção Reutilizáveis reúne planos marcados para duplicação, distinguindo conteúdo reutilizável de estrutura de modelo. A duplicação preserva todos os campos e cria um rascunho independente. Pré-visualização e impressão/PDF usam os mesmos dados, incluindo identificação, etapas e campos da escola. A impressão continua a usar o navegador. Rascunhos permitem completar objetivos e atividades mais tarde; planos prontos exigem esses dados e duração coerente com as etapas. Funcionalidade apenas frontend, sem testes ou builds executados nesta alteração.

### Início guiado e rotina diária

O Início foi reorganizado em torno da próxima aula e das pendências calculadas. Abre na data atual do fuso configurado (Africa/Luanda como alternativa), atualizada a cada minuto; os exemplos de outubro de 2026 são selecionados explicitamente. A saudação usa o primeiro nome e o período do dia. Meteorologia ilustrativa, assistente destacado, tarefas estáticas e gráfico semanal fixo foram retirados deste ecrã.

A próxima aula privilegia preparação do plano, chamada ou conclusão, com as restantes ações secundárias. As pendências incluem rascunhos automáticos, planos em rascunho, chamadas incompletas por turma/data e avaliações realizadas com notas em falta para alunos ativos. Os atalhos abrem o plano, a chamada ou a avaliação específica. A agenda inclui também eventos não letivos. Indicadores compactos, turmas e recursos ficam abaixo. O início guiado concluído fica recolhido; no telemóvel, a rotina aparece na ordem próxima aula, pendências e restante agenda. Alteração revista no código, sem execução de testes, builds ou Docker.

O início inclui três passos: criar turma com disciplina, colar nomes de alunos (um por linha) e guardar a primeira aula como rascunho. O progresso fica no mesmo armazenamento local do dashboard. A aula é acrescentada ao calendário; a turma recebe uma conversa local. Os dados de demonstração existentes são preservados.

As aulas do dia permitem selecionar uma data, abrir/preparar o plano, marcar presenças com turma e data preenchidas, criar avaliação com disciplina e concluir um plano após confirmar a chamada. A data inicial continua a ser a de demonstração; o botão Hoje usa a data local.

As chamadas começam por marcar, sem assumir presença. Os rascunhos são guardados por turma/data e recuperados ao regressar, sem afetar relatórios até à confirmação. No telemóvel, cada aluno tem botões Presente/Falta/Justificada e observações recolhidas; o resumo e as ações ficam fixos durante a deslocação. Só é possível confirmar depois de marcar todos os alunos. Descartar o rascunho exige confirmação.

O aviso de ligação explica o modo local. Uma página carregada pode continuar a receber alterações sem rede, mas abrir/recarregar a aplicação offline ainda não é suportado. Não foi implementada sincronização com servidor. Estes incrementos foram revistos no código, sem executar testes ou builds, conforme pedido do utilizador.

`localDashboardRepository` guarda `{version: 1, state}` na chave `agendai-dashboard-demo-v1` de `localStorage`. Os dados pertencem à origem e ao navegador; não são partilhados entre utilizadores ou dispositivos. Dados ilegíveis não são sobrescritos automaticamente. Falhas de armazenamento mostram feedback. A interface do repository permite substituir o adapter por uma API.

Continuam dependentes de backend: autenticação e permissões, base de dados multiutilizador, uploads/downloads originais, mensagens em tempo real, e-mails/push, recorrência executada de eventos, IA real, OAuth/integrações, pagamentos, faturação e segurança de contas. Estas funcionalidades não são apresentadas como ligações reais na demonstração. Preferências de lembretes/recorrência ficam guardadas, mas não são executadas.

CSV abre em Excel; PDF usa a impressão do navegador. Não há geração binária de XLSX/PDF, envio automático de relatórios ou ficheiros de exemplo completos. Os relatórios não são snapshots históricos imutáveis. A meteorologia é ilustrativa, sem consulta externa.

## Assets

Treze recortes WebP em `public/images/dashboard/`: 5 avatares das referências 10/11 e 8 fotografias de materiais da referência 9. `scripts/crop-dashboard-assets.py` regista origem e coordenadas. Os recortes excluem etiquetas, botões e restante interface. Tabelas, documentos, gráficos, layouts e formulários são componentes, não screenshots completas.

```sh
python scripts/crop-dashboard-assets.py "C:/caminho/Dashboard AgendAI"
```

## Validação e deployment

Resultados das verificações já executadas em 25/09/2026: lint, TypeScript, build e build Docker concluídos com sucesso; configuração Docker Compose válida. A auditoria axe terminou com 15 verificações sem violações detetadas. A última suite de navegador terminou com 9 testes aprovados e 2 falhados: tempo limite ao encerrar o contexto da navegação responsiva e um seletor de alerta ambíguo com o anunciador de rotas do Next.js. O seletor foi corrigido, mas não reexecutado. Por pedido do utilizador, não foram iniciados mais testes; a suite completa não está confirmada como aprovada.

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
node scripts/check-dashboard-accessibility.mjs
docker build -t agendai-website:dashboard .
```

Testes de navegador verificam rotas, ausência de overflow, imagens, teclado, modais, persistência e relações entre módulos. Capturas em `artifacts/dashboard/` e resultados axe em `artifacts/dashboard-accessibility.json`. A auditoria automática não constitui certificação de acessibilidade.

O Dockerfile multi-stage da raiz inclui o dashboard no output standalone. Porta interna `3000`, utilizador `nextjs`, endpoint `/health`. Não precisa de volumes porque os dados desta versão ficam no navegador. Para o Coolify, seguir [coolify.md](coolify.md); não configurar uma aplicação separada para o dashboard.
