import { expect, test, type Page } from '@playwright/test';

/**
 * Recorrido principal en modo demo: curso de ejemplo → lección → quiz → tarjetas → Feynman →
 * nueva ruta → repaso → biblioteca. Cada prueba arranca con IndexedDB vacío (contexto nuevo).
 */

const COURSE = 'Aprender a aprender: memoria, comprensión y pensamiento científico';

async function openSampleLesson(page: Page) {
  await page.goto('./');
  await expect(page.getByText('Continuar aprendiendo')).toBeVisible();
  await page
    .getByRole('link', { name: /Empezar/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'La curva del olvido: por qué olvidamos' })).toBeVisible();
}

test('el panel muestra el curso de ejemplo y el aviso de modo demo', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: COURSE })).toBeVisible();
  await expect(page.getByText('Estás en modo demostración')).toBeVisible();
  await expect(page.getByText('Racha de estudio')).toBeVisible();
});

test('una lección renderiza Markdown enriquecido: tabla, LaTeX y Mermaid', async ({ page }) => {
  await openSampleLesson(page);
  await expect(page.locator('.prose-ol table')).toBeVisible();
  await expect(page.locator('.katex').first()).toBeVisible();
  await expect(page.locator('figure svg').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('blockquote[data-callout="concept"]').first()).toBeVisible();
});

test('aprobar el quiz completa la lección, crea tarjetas y desbloquea la siguiente', async ({ page }) => {
  await openSampleLesson(page);
  const correct = [
    'En las primeras horas y días después de aprenderlo',
    'Lo recordará todo porque solo han pasado cuatro días', // fallo a propósito → cuaderno de errores
    'El recuerdo se estabiliza tras el aprendizaje, en parte durante el sueño',
    'Ana, porque sus recuerdos son más estables aunque hoy recuerden lo mismo',
  ];
  for (const text of correct) {
    await page.getByRole('radio').filter({ hasText: text }).click();
    await page.getByRole('button', { name: 'Seguro', exact: true }).click();
    await page.getByRole('button', { name: /Siguiente|Ver resultado/ }).click();
  }
  await expect(page.getByText('¡Lección superada!')).toBeVisible();
  await expect(page.getByText('¿Qué describe la curva del olvido de Ebbinghaus?')).toBeVisible();

  await page.goto('./#/course/sample-aprender-a-aprender/lesson/1.2');
  await expect(page.getByRole('heading', { name: 'Recuperación activa: el efecto test' })).toBeVisible();
  await expect(page.getByText('Lección bloqueada')).toHaveCount(0);

  await page.goto('./#/review');
  await page.getByRole('button', { name: 'Mostrar respuesta' }).click();
  await expect(page.getByText('¿Qué tal lo recordaste?')).toBeVisible();
  await page.keyboard.press('3');
});

test('las lecciones posteriores están bloqueadas hasta demostrar dominio', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('Continuar aprendiendo')).toBeVisible();
  await page.goto('./#/course/sample-aprender-a-aprender/lesson/2.1');
  await expect(page.getByText('Lección bloqueada')).toBeVisible();
});

test('acciones rápidas y desafío Feynman', async ({ page }) => {
  await openSampleLesson(page);
  await page.getByRole('button', { name: /Más simple/ }).click();
  await expect(page.getByText('Analogía:').first()).toBeVisible();
  await page.getByLabel('Pregunta al tutor').fill('¿Por qué olvidamos tan rápido?');
  await page.getByRole('button', { name: 'Preguntar' }).click();
  await expect(page.getByText('Has preguntado:').first()).toBeVisible();

  await page
    .getByLabel('Tu explicación')
    .fill(
      'La curva del olvido muestra que olvidamos rápido al principio. Por ejemplo, es como un camino en la nieve. ' +
        'Repasar con esfuerzo aumenta la estabilidad del recuerdo y dormir ayuda a la consolidación.',
    );
  await page.getByRole('button', { name: 'Evaluar mi explicación' }).click();
  await expect(page.getByText('Lo que entendiste bien')).toBeVisible();
});

test('crear una ruta nueva con el proveedor demo y estudiar su primera lección', async ({ page }) => {
  await page.goto('./#/new');
  await page.getByLabel('Tema', { exact: true }).fill('Historia de Roma');
  await page.getByText('Práctico por proyectos').click();
  await page.getByRole('button', { name: 'Generar mapa de ruta' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu temario' })).toBeVisible();
  await page.getByText('Ver el temario en JSON').click();
  await expect(page.getByText('"lesson_id": "1.1"')).toBeVisible();
  await expect(page.getByText('"focus": "practical"')).toBeVisible();
  await page.getByRole('button', { name: 'Comenzar ruta' }).click();
  await expect(page.getByText('Modo demostración.').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[aria-label^="Pregunta 1 de"]')).toBeVisible({ timeout: 30_000 });

  await page.goto('./#/library');
  await page.getByLabel('Buscar').fill('vision global');
  await expect(page.getByText('Visión global').first()).toBeVisible();
});

test('@movil sin desbordamiento horizontal y con temario en cajón', async ({ page }) => {
  await openSampleLesson(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Temario' }).click();
  await expect(page.getByRole('dialog', { name: 'Temario' })).toBeVisible();
});
