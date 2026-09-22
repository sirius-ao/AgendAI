import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const routes = ['/', '/funcionalidades', '/planos', '/para-escolas', '/blog'];
test('páginas responsivas sem overflow, imagens carregadas e sem erros de JavaScript', async ({ page }) => {
  fs.mkdirSync('artifacts/screenshots', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1312, 1024, 768, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('main h1')).toHaveCount(1);
      await page.evaluate(async () => {
        await document.fonts.ready;
        const imgs = Array.from(document.images);
        for (const img of imgs) {
          img.loading = 'eager';
          await img.decode().catch(() => {});
        }
      });
      const overflow = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
      expect(overflow.scroll, `${route} at ${width}px`).toBeLessThanOrEqual(overflow.width);
      expect(await page.locator('img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).naturalWidth > 0))).toBeTruthy();
      if (width === 1312 || width === 390) {
        await page.screenshot({path: `artifacts/screenshots/${route.slice(1) || 'inicio'}-${width}.png`, fullPage: true});
      }
    }
  }
  expect(errors).toEqual([]);
});

test('mega menu, teclado, apresentação e navegação móvel', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Funcionalidades', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#features-menu .feature-link')).toHaveCount(12);
  await page.screenshot({path:'artifacts/screenshots/mega-menu-1312.png',fullPage:true});
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Ver demonstração (2 min)' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cada aluno conta.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Abrir menu'}).click();
  await page.getByRole('navigation',{name:'Navegação móvel'}).getByRole('link',{name:'Planos',exact:true}).click();
  await expect(page).toHaveURL('/planos');
  await expect(page.getByRole('button',{name:'Abrir menu'})).toHaveAttribute('aria-expanded','false');
});

test('planos mensal/anual, FAQ e comparação', async ({ page }) => {
  await page.goto('/planos');
  const pro=page.locator('.pricing-card').filter({has:page.getByRole('heading',{name:'Professor Pro',exact:true})});
  await expect(pro.locator('.price')).toContainText('3.500');
  await page.getByRole('button',{name:'Anual',exact:true}).click();
  await expect(pro.locator('.price')).toContainText('2.800');
  await expect(pro).toContainText('33.600 Kz faturados por ano');
  await expect(pro.getByRole('link',{name:'Escolher plano'})).toHaveAttribute('href','/comecar?plano=pro&periodo=anual');
  await page.getByText('Posso mudar de plano mais tarde?',{exact:true}).click();
  await expect(page.getByText(/A proposta prevê a mudança/)).toBeVisible();
  await page.getByRole('link',{name:'Ver comparação completa'}).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button',{name:'Mensal',exact:true}).click();
  await expect(pro.locator('.price')).toContainText('3.500');
});

test('blog: categorias, pesquisa, paginação, artigos e newsletter honesta', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.locator('.blog-card')).toHaveCount(6);
  await page.getByRole('button',{name:'Carregar mais artigos'}).click();
  await expect(page.locator('.blog-card')).toHaveCount(8);
  await page.locator('.category-tabs').getByRole('button',{name:'Avaliações',exact:true}).click();
  await expect(page.locator('.blog-card')).toHaveCount(1);
  await page.locator('.category-tabs').getByRole('button',{name:'Todos',exact:true}).click();
  await page.getByRole('searchbox',{name:'Pesquisar artigos',exact:true}).fill('nao-existe-artigo');
  await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Nenhum artigo encontrado.'})).toBeVisible();
  await page.getByRole('button',{name:'Limpar filtros'}).click();
  await page.getByLabel('O seu e-mail',{exact:true}).fill('demo@example.com');
  await page.getByRole('button',{name:'Subscrever'}).click();
  await expect(page.getByText(/O seu e-mail não foi guardado nem enviado/)).toBeVisible();
  await page.locator('.blog-card').first().getByRole('heading').getByRole('link').click();
  await expect(page.getByRole('heading',{name:'1. Comece pelo objetivo'})).toBeVisible();
  await page.goto('/blog?q=presencas');
  await expect(page.locator('.blog-card')).toHaveCount(1);
});

test('rotas auxiliares, SEO e formulários sem envio',async({page})=>{
  for(const route of ['/entrar','/comecar','/contacto','/privacidade','/termos']){
    await page.setViewportSize({width:375,height:812});
    expect((await page.goto(route))?.status()).toBe(200);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  }
  await page.goto('/contacto');
  await page.getByLabel('O seu nome').fill('Professor Demo');
  await page.getByLabel('O seu e-mail').fill('demo@example.com');
  await page.getByLabel('Como podemos ajudar?').fill('Conhecer a proposta para uma escola.');
  const sent:string[]=[];
  page.on('request',r=>{if(r.method()==='POST')sent.push(r.url());});
  await page.getByRole('button',{name:'Pré-visualizar pedido'}).click();
  await expect(page.getByRole('status')).toContainText('Pedido validado localmente');
  expect(sent).toEqual([]);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','pt-AO');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',/AgendAI/);
  expect((await page.request.get('/sitemap.xml')).status()).toBe(200);
  expect((await page.request.get('/robots.txt')).status()).toBe(200);
  expect((await page.request.get('/pagina-inexistente')).status()).toBe(404);
});
