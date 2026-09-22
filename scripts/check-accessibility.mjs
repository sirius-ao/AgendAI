import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1312, height: 900 } });
const page = await context.newPage();
const report = [];
for (const route of ['/', '/funcionalidades', '/planos', '/para-escolas', '/blog', '/contacto']) {
  await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}${route}`);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const result = {
    route,
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  };
  report.push(result);
  console.log(JSON.stringify(result));
}
await browser.close();
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/accessibility.json', JSON.stringify(report, null, 2));
if (report.some((result) => result.violations.length)) process.exitCode = 1;
