import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
const page = await context.newPage();
const report = [];
const routes = [
  '',
  'planos-de-aula',
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
async function check(name) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.push({
    name,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
  console.log(name, result.violations.map((v) => `${v.id}: ${v.nodes.length}`).join(', ') || 'OK');
}
for (const route of routes) {
  await page.goto(
    `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/dashboard${route ? '/' + route : ''}`,
  );
  await page.locator('main h1').waitFor();
  await check(route || 'inicio');
}
for (const [route, button] of [
  ['planos-de-aula', 'Novo plano de aula'],
  ['avaliacoes', 'Nova avaliação'],
  ['calendario', 'Novo evento'],
]) {
  await page.goto(
    `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/dashboard/${route}`,
  );
  await page.getByRole('button', { name: button, exact: true }).click();
  await check(`modal-${route}`);
  await page.keyboard.press('Escape');
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/dashboard`);
await page.locator('main h1').waitFor();
await check('inicio-mobile');
await browser.close();
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/dashboard-accessibility.json', JSON.stringify(report, null, 2));
if (report.some((r) => r.violations.length)) process.exitCode = 1;
