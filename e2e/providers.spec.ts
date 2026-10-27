import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';
// @ts-expect-error -- módulo JS sin tipos
import { createProxyServer } from '../server/proxy.mjs';
import { startFakeLLM, type RecordedRequest } from './fake-llm';

/**
 * Valida los adaptadores reales (OpenAI-compatible y Claude con el SDK oficial) dentro del navegador,
 * pasando por el proxy de server/proxy.mjs hacia un servidor LLM falso.
 */

let fake: Awaited<ReturnType<typeof startFakeLLM>>;
let proxy: Server;
let proxyUrl = '';

test.beforeAll(async () => {
  fake = await startFakeLLM();
  proxy = createProxyServer({
    OPENAI_API_KEY: 'sk-servidor',
    OPENAI_BASE_URL: `${fake.url}/v1`,
    ANTHROPIC_API_KEY: 'sk-ant-servidor',
    ANTHROPIC_BASE_URL: fake.url,
    ALLOWED_ORIGINS: 'http://localhost:4173',
    RATE_LIMIT_PER_MIN: '500',
  });
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  proxyUrl = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
});

test.afterAll(() => {
  fake.close();
  proxy.close();
});

function settingsFor(provider: 'openai' | 'anthropic', baseUrl: string) {
  const config = {
    id: provider,
    apiKey: '',
    model: provider === 'openai' ? 'gpt-falso' : 'claude-sonnet-5-5',
    baseUrl,
  };
  return {
    state: {
      theme: 'dark',
      activeProvider: provider,
      providers: { [provider]: { ...config, structuredMode: 'json_schema', effort: 'low' } },
    },
    version: 1,
  };
}

function requestsTo(path: string): RecordedRequest[] {
  return fake.requests.filter((r) => r.path === path);
}

for (const provider of ['openai', 'anthropic'] as const) {
  test(`flujo completo con ${provider} a través del proxy`, async ({ page }) => {
    const base = provider === 'openai' ? `${proxyUrl}/openai` : `${proxyUrl}/anthropic`;
    await page.addInitScript(
      ([value]) => localStorage.setItem('omnilearn-settings', value),
      [JSON.stringify(settingsFor(provider, base))],
    );
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('./#/new');
    await page.getByLabel('Tema', { exact: true }).fill('Física cuántica');
    await page.getByRole('button', { name: 'Generar mapa de ruta' }).click();
    await expect(page.getByRole('heading', { name: 'Revisa tu temario' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Física cuántica: ruta de prueba' })).toBeVisible();
    // El temario también se puede revisar como JSON (contrato del motor).
    await page.getByText('Ver el temario en JSON').click();
    await expect(page.getByText('"lesson_id": "1.2"')).toBeVisible();

    await page.getByRole('button', { name: 'Comenzar ruta' }).click();
    await expect(page.getByText('Contenido de prueba del servidor falso').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[aria-label^="Pregunta 1 de 3"]')).toBeVisible({ timeout: 30_000 });

    // El quiz generado se puede responder y aprobar.
    for (const answer of [
      'Un patrón de interferencia propio de las ondas',
      'Su incertidumbre aumenta',
      'Afecta al estado del sistema medido',
    ]) {
      await page.getByRole('radio').filter({ hasText: answer }).click();
      await page.getByRole('button', { name: 'Creo que sí', exact: true }).click();
      await page.getByRole('button', { name: /Siguiente|Ver resultado/ }).click();
    }
    await expect(page.getByText('¡Lección superada!')).toBeVisible();
    await expect(page.getByText('¿Qué es la dualidad onda-partícula?')).toBeVisible();

    // Forma de las peticiones que llegaron al servidor (con la clave del servidor, no la del navegador).
    if (provider === 'openai') {
      const json = requestsTo('/v1/chat/completions').find((r) => !r.body.stream)!;
      expect(json.headers.authorization).toBe('Bearer sk-servidor');
      expect((json.body.response_format as { type: string }).type).toBe('json_schema');
      expect(requestsTo('/v1/chat/completions').some((r) => r.body.stream === true)).toBe(true);
    } else {
      const json = requestsTo('/v1/messages').find((r) => !r.body.stream)!;
      expect(json.headers['x-api-key']).toBe('sk-ant-servidor');
      expect(json.headers.authorization).toBeUndefined();
      expect((json.body.output_config as { format: { type: string } }).format.type).toBe('json_schema');
      expect((json.body.output_config as { effort: string }).effort).toBe('low');
      expect(json.body).not.toHaveProperty('temperature');
      expect(requestsTo('/v1/messages').some((r) => r.body.stream === true)).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
