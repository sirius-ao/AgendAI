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

### Chamada e histórico de presenças

Presenças separa Fazer chamada de Consultar histórico. A unidade continua a ser turma/data; as aulas e disciplinas no cabeçalho são contexto, não registos independentes por aula. A chamada dispõe de pesquisa, filtros com contagens, alunos por marcar primeiro, marcação coletiva e desfazer da última edição nesta página. Os totais e a confirmação consideram a lista inteira, independentemente do filtro. Transferidos com registos anteriores permanecem visíveis nas chamadas históricas; novas chamadas incluem alunos ativos.

Antes da confirmação, um resumo mostra faltas, justificações e observações. Correções a uma chamada confirmada preservam a versão anterior em versions, com a data de confirmação quando disponível. As versões são consultáveis sem edição; não são apresentadas como auditoria de servidor. O histórico permite filtrar datas, exportar CSV e imprimir apenas as chamadas confirmadas atuais. Rascunhos continuam separados dos relatórios. Implementação local, sem testes ou builds executados.

### Gestão de turmas e alunos

A lista de turmas distingue Ativas, Arquivadas e Todas, com pesquisa e filtro de ano letivo. Os cartões mostram disciplinas e alunos ativos, com edição, arquivo reversível e preparação do próximo ano no menu. O detalhe tem Resumo, Alunos, Aulas e Resultados. O resumo deriva a próxima aula, planos por terminar, chamadas incompletas e avaliações com notas em falta dos registos da turma. Cada pendência abre o módulo correspondente.

A adição por lista aceita um nome por linha, apresenta revisão com seleção individual e sinaliza nomes iguais aos existentes ou repetidos na própria lista. Homónimos são permitidos após confirmação explícita; nenhum nome é eliminado automaticamente. A ficha do aluno permite editar nome/contacto, consultar o histórico de chamadas com observações e resultados por avaliação. No telemóvel, os alunos aparecem em cartões.

Preparar outro ano cria uma turma independente com disciplinas selecionadas e, opcionalmente, novas inscrições dos alunos ativos. Não copia notas, presenças, planos ou mensagens. As referências previousClassId e previousStudentId permitem consultar a turma/inscrição anterior; o original não é alterado nem arquivado automaticamente. Arquivar é uma classificação reversível, não uma barreira de permissões nos restantes módulos. Dados locais, sem execução de testes, builds ou Docker nesta alteração.

### Modelos de planos de aula

A área Planos de Aula apresenta agora uma lista única com filtros Todos, Por terminar, Preparados e Concluídos. Os rascunhos automáticos substituem a versão guardada na listagem enquanto estão pendentes, evitando duplicação; trabalhos ainda sem plano confirmado também aparecem em Por terminar. Favoritos, reutilizáveis e partilhados passam para o filtro Coleção. A galeria abre pelo botão Criar com modelo e tem regresso à lista. No computador usa tabela; no telemóvel, cartões com Continuar/Abrir e menu de opções.

O editor está dividido em Dados da aula, Conteúdo, Etapas e Documento, com atalhos internos e opções menos frequentes recolhidas. O estado de gravação local e Continuar depois permanecem numa barra fixa durante a deslocação. Após guardar, uma confirmação permite abrir diretamente o evento na data e turma correspondentes no calendário. Alterações revistas por leitura do código, sem testes, builds ou Docker.

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


### Avaliações: preparação, correção e resultados

A lista distingue avaliações agendadas, por corrigir e concluídas, com filtros e progresso por aluno. Cada avaliação abre Detalhes, Lançar notas e Resultados. O lançamento usa tabela no computador (Enter e setas para navegar) e cartões no telemóvel.

Sem nota, Avaliado, Faltou e Dispensado são situações distintas. Zero é uma nota válida; as outras situações não introduzem zeros na média. As notas aceitam 0–20, até duas casas decimais. Os pesos positivos definidos pelo professor são normalizados sobre as avaliações com nota; o resumo de disciplina abrange a turma e o ano civil da avaliação, sem fórmula institucional ou regra trimestral configurada.

Alterações ficam em rascunho local até revisão e confirmação, inclusive correções parciais. Cada confirmação preserva os valores anteriores para consulta. Os resultados e exportações CSV/impressão usam apenas valores confirmados. Editar detalhes mantém notas e versões; avaliações com correções não podem mudar de turma. Feedback e dificuldades por critério são assinalados pelo professor, sem diagnóstico automático. As pendências do Início e Turmas respeitam as situações de falta e dispensa; médias incompletas não originam classificação de risco.

Persistência apenas neste navegador/dispositivo, sem sincronização com servidor. Nesta alteração não foram executados testes, builds ou Docker, conforme solicitado.


### Recursos e Biblioteca
Recursos permite explorar materiais; Biblioteca organiza os materiais pessoais. A pesquisa abrange título, descrição e disciplina. Os filtros recolhíveis incluem categoria, disciplina e classe, com etiquetas removíveis e limpeza conjunta. Popularidade demonstrativa foi retirada. A pré-visualização apresenta descrição, objetivos e autoria disponível, mantendo os filtros ao fechar. As imagens são ilustrativas e os ficheiros originais não são conservados; a exportação disponível é uma ficha descritiva.

“Usar numa aula” associa o recurso a um plano existente (também ao seu rascunho) ou inicia um novo plano com o recurso associado. A confirmação permite abrir o destino. Rascunhos iniciados por recurso podem ser retomados na lista de planos. Carregar material guarda metadados pessoais locais, sem publicação nem transferência do ficheiro. Cartões móveis apresentam ações grandes. Não foram executados testes, builds ou Docker.
