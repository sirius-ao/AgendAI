import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const routes = [
  '',
  'planos-de-aula',
  'turmas',
  'turmas/10a',
  'presencas',
  'avaliacoes',
  'calendario',
  'recursos',
  'relatorios',
  'biblioteca',
  'mensagens',
  'configuracoes',
];
test('dashboard: páginas, imagens, navegação responsiva e pesquisa por teclado', async ({
  page,
}) => {
  fs.mkdirSync('artifacts/dashboard', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [1536, 1024, 768, 390, 375]) {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    for (const route of routes) {
      expect((await page.goto(`/dashboard${route ? '/' + route : ''}`))?.status()).toBe(200);
      await expect(page.locator('main h1')).toHaveCount(1);
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const img of document.images) {
          img.loading = 'eager';
          await img.decode().catch(() => {});
        }
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${route} at ${width}px`,
      ).toBeLessThanOrEqual(width);
      expect(
        await page
          .locator('img')
          .evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0)),
      ).toBeTruthy();
      await page.screenshot({
        path: `artifacts/dashboard/${route.replaceAll('/', '-') || 'inicio'}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('searchbox').fill('Funções');
  await expect(page.getByRole('dialog').getByRole('link').first()).toContainText('Funções');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await page
    .getByRole('navigation', { name: 'Dashboard' })
    .getByRole('link', { name: 'Planos de Aula', exact: true })
    .click();
  await expect(page).toHaveURL(/planos-de-aula/);
  expect(errors).toEqual([]);
});

test('editar plano preserva os seus atributos e criar turma liga a conversa', async ({ page }) => {
  await page.goto('/dashboard/planos-de-aula');
  await page
    .getByRole('button', { name: /Funções do 2º grau Introdução/ })
    .first()
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Editar plano', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Título da aula').fill('Plano editado E2E');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar alterações' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('agendai-dashboard-demo-v1')!).state.plans.find(
      (p: { id: string }) => p.id === 'plan-1',
    ),
  );
  expect(stored).toMatchObject({
    title: 'Plano editado E2E',
    favorite: true,
    shared: true,
    template: true,
    ai: true,
    status: 'Em utilização',
  });
  await page.goto('/dashboard/turmas');
  await page.getByRole('button', { name: 'Nova turma' }).click();
  await page.getByLabel('Nome da turma').fill('Turma integrada E2E');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  const card = page
    .locator('.dash-class-grid .dash-panel')
    .filter({ hasText: 'Turma integrada E2E' });
  await card.getByRole('link', { name: 'Ver turma' }).click();
  await page.getByRole('link', { name: 'Enviar mensagem à turma' }).click();
  await expect(page.locator('.dash-chat-panel h2')).toHaveText('Turma integrada E2E');
});

test('modais em telemóvel e recuperação explícita de armazenamento inválido', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, button] of [
    ['planos-de-aula', 'Novo plano de aula'],
    ['avaliacoes', 'Nova avaliação'],
    ['calendario', 'Novo evento'],
  ]) {
    await page.goto(`/dashboard/${route}`);
    await page.getByRole('button', { name: button, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
    await page.screenshot({ path: `artifacts/dashboard/modal-${route}-390.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
  await page.evaluate(() => localStorage.setItem('agendai-dashboard-demo-v1', 'invalid-json'));
  await page.goto('/dashboard/configuracoes');
  await expect(page.locator('.dash-error')).toContainText('Não foi possível recuperar');
  expect(await page.evaluate(() => localStorage.getItem('agendai-dashboard-demo-v1'))).toBe(
    'invalid-json',
  );
  await page.getByRole('button', { name: 'Repor dados de demonstração' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('.dash-error')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('agendai-dashboard-demo-v1')!).state.classes.length,
    ),
  ).toBe(6);
});
test('criação de plano, avaliação e evento; persistência e integração no calendário', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto('/dashboard/planos-de-aula');
  await page.getByRole('button', { name: 'Novo plano de aula', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: 'artifacts/dashboard/modal-plano.png', fullPage: true });
  await dialog.getByLabel('Título da aula').fill('Plano integrado E2E');
  await dialog.getByLabel('Disciplina', { exact: false }).selectOption('mat');
  await dialog.getByLabel('Turma', { exact: false }).selectOption('10a');
  await dialog.getByLabel('Objetivos de aprendizagem').fill('Resolver equações.');
  await dialog.getByLabel('Conteúdos programáticos').fill('Equações lineares.');
  await dialog.getByLabel('Metodologia / Estratégias de ensino').fill('Trabalho em pares.');
  await dialog.getByRole('button', { name: 'Criar plano de aula', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Pesquisar planos...' }).fill('Plano integrado E2E');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.reload();
  await page.getByRole('searchbox', { name: 'Pesquisar planos...' }).fill('Plano integrado E2E');
  await expect(page.locator('tbody')).toContainText('Plano integrado E2E');
  await page.goto('/dashboard/avaliacoes');
  await page.getByRole('button', { name: 'Nova avaliação', exact: true }).click();
  dialog = page.getByRole('dialog');
  await page.screenshot({ path: 'artifacts/dashboard/modal-avaliacao.png', fullPage: true });
  await dialog.getByLabel('Título da avaliação').fill('Avaliação integrada E2E');
  await dialog.getByLabel('Disciplina', { exact: false }).selectOption('mat');
  await dialog.getByRole('button', { name: 'Criar avaliação', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: /Avaliação integrada E2E/ })).toBeVisible();
  await page.goto('/dashboard/calendario');
  await expect(page.getByRole('button', { name: /Avaliação integrada E2E/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Novo evento', exact: true }).click();
  dialog = page.getByRole('dialog');
  await page.screenshot({ path: 'artifacts/dashboard/modal-evento.png', fullPage: true });
  await dialog.getByLabel('Título do evento').fill('Reunião E2E');
  await dialog.getByLabel('Hora de fim').fill('09:00');
  await dialog.getByRole('button', { name: 'Criar evento', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('posterior');
  await dialog.getByLabel('Hora de fim').fill('11:00');
  await dialog.getByRole('button', { name: 'Criar evento', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Reunião E2E/ }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Reunião E2E/ }).first()).toBeVisible();
});
test('presenças e notas atualizam os relatórios; aluno pertence à turma', async ({ page }) => {
  await page.goto('/dashboard/presencas?turma=10a');
  await expect(page.locator('tbody tr')).toHaveCount(28);
  await page.getByRole('button', { name: 'Marcar todos como presentes' }).click();
  await page.getByRole('button', { name: 'Guardar presenças' }).click();
  await page.goto('/dashboard/relatorios?turma=10a');
  await expect(page.locator('.dash-stat').filter({ hasText: 'Presença média' })).toContainText(
    '100%',
  );
  await page.goto('/dashboard/avaliacoes?turma=10a');
  await page.getByLabel('Teste 1 de André Manuel', { exact: true }).fill('20');
  await expect(page.locator('tbody tr').first()).toContainText('18,5');
  await page.reload();
  await expect(page.getByLabel('Teste 1 de André Manuel', { exact: true })).toHaveValue('20');
  await page.goto('/dashboard/turmas/10a');
  await page.getByRole('button', { name: 'Adicionar aluno' }).click();
  await page.getByLabel('Nome do aluno').fill('Aluno Teste E2E');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lista de alunos (29)' })).toBeVisible();
  await page.goto('/dashboard/presencas?turma=10a');
  await expect(page.locator('tbody tr')).toHaveCount(29);
  await expect(page.getByLabel('Presença de Aluno Teste E2E')).toHaveValue('Presente');
});
test('biblioteca, mensagens locais, preferências e entrada demonstrativa', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Explorar dashboard de demonstração' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto('/dashboard/biblioteca');
  await page
    .getByRole('button', { name: 'Favoritar: Apresentação — Revolução Industrial', exact: true })
    .click();
  await page.getByRole('button', { name: 'Favoritos', exact: true }).click();
  await expect(
    page.locator('.dash-resource-card').filter({ hasText: 'Revolução Industrial' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '+ Nova pasta', exact: true }).click();
  await page.getByLabel('Nome da pasta').fill('Pasta E2E');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('.dash-folder-filter')).toContainText('Pasta E2E');
  await page.goto('/dashboard/mensagens');
  await page.getByRole('textbox', { name: 'Mensagem', exact: true }).fill('Mensagem local E2E');
  await page.getByRole('button', { name: 'Enviar mensagem local' }).click();
  await expect(page.locator('.dash-message').last()).toContainText('Mensagem local E2E');
  await page.reload();
  await expect(page.locator('.dash-message').last()).toContainText('Mensagem local E2E');
  await page.goto('/dashboard/configuracoes');
  await page.getByRole('button', { name: 'Escuro', exact: true }).click();
  await expect(page.locator('.dash-app')).toHaveClass(/dash-theme-dark/);
  await page.reload();
  await expect(page.locator('.dash-app')).toHaveClass(/dash-theme-dark/);
  await page.getByRole('button', { name: 'Claro', exact: true }).click();
  await page.getByLabel('Nome completo').fill('Professor Teste');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.locator('.dash-profile')).toContainText('Professor Teste');
});
