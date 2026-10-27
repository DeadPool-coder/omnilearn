import { useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  CircleCheck,
  CircleX,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  ListRestart,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { AIService } from '@/ai/AIService';
import { describeError } from '@/ai/errors';
import { createProvider, isProviderReady, PROVIDER_ORDER, PROVIDERS } from '@/ai/providers';
import type { ClaudeEffort, ProviderId, StructuredMode } from '@/ai/types';
import { Page, PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Field, Input, OptionCards, Segmented, Select, Slider, Switch } from '@/components/ui/forms';
import { useConfirm } from '@/components/ui/useConfirm';
import { Callout, Card } from '@/components/ui/primitives';
import { deleteAllData, exportAll, importData } from '@/db/backup';
import { hasSampleCourse, installSampleCourse } from '@/db/seed';
import { CONTENT_LANGUAGES } from '@/domain/labels';
import { downloadJson } from '@/lib/text';
import { cn } from '@/lib/cn';
import { useSettings, type ReadingFont, type TextSize, type ThemePreference } from '@/stores/settings';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[240px_1fr] lg:gap-10">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ProviderSettings() {
  const active = useSettings((s) => s.activeProvider);
  const providers = useSettings((s) => s.providers);
  const setActive = useSettings((s) => s.setActiveProvider);
  const update = useSettings((s) => s.updateProvider);
  const [selected, setSelected] = useState<ProviderId>(active);
  const config = providers[selected];
  const meta = PROVIDERS[selected];
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(!!config.baseUrl);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(
    null,
  );
  const listId = useId();

  const choose = (id: ProviderId) => {
    setSelected(id);
    setActive(id);
    setTestResult(null);
    setModels([]);
    setShowAdvanced(!!providers[id].baseUrl);
  };

  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const list = (await createProvider(config).listModels?.()) ?? [];
      setModels(list);
      toast.success(list.length ? `${list.length} modelos disponibles` : 'El proveedor no devolvió modelos');
    } catch (e) {
      toast.error(describeError(e).title, { description: describeError(e).detail });
    } finally {
      setLoadingModels(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { latencyMs } = await new AIService(createProvider(config)).ping();
      setTestResult({
        ok: true,
        message: `Conexión correcta con ${config.model || meta.defaultModel} (${(latencyMs / 1000).toFixed(1)} s).`,
      });
    } catch (e) {
      const info = describeError(e);
      setTestResult({ ok: false, message: info.title, detail: info.detail });
    } finally {
      setTesting(false);
    }
  };

  const suggestions = models.length ? models : meta.modelSuggestions;

  return (
    <div className="space-y-5">
      <OptionCards
        name="provider"
        label="Proveedor de IA"
        value={selected}
        onChange={choose}
        columns={2}
        options={PROVIDER_ORDER.map((id) => ({
          value: id,
          label: PROVIDERS[id].label,
          description: PROVIDERS[id].tagline,
        }))}
      />

      <Card className="space-y-4 p-5">
        <p className="text-[13px] leading-relaxed text-fg-muted">{meta.notes}</p>

        {selected !== 'demo' && (
          <>
            {meta.needsKey && (
              <Field
                label="Clave de API"
                htmlFor="api-key"
                action={
                  meta.keyUrl && (
                    <a
                      href={meta.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
                    >
                      Obtener clave <ExternalLink className="size-3" />
                    </a>
                  )
                }
                hint="Se guarda solo en este navegador. Nunca se envía a otro sitio que no sea el proveedor (o tu proxy)."
              >
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-faint" />
                  <Input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    value={config.apiKey}
                    onChange={(e) => update(selected, { apiKey: e.target.value })}
                    placeholder={meta.keyPlaceholder}
                    className="pr-10 pl-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-fg-faint hover:text-fg"
                    aria-label={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
            )}

            <Field
              label="Modelo"
              htmlFor="model"
              action={
                <button
                  type="button"
                  onClick={() => void loadModels()}
                  disabled={loadingModels || !isProviderReady(config)}
                  className="inline-flex items-center gap-1 text-xs text-accent-text hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={cn('size-3', loadingModels && 'animate-spin')} /> Cargar modelos
                </button>
              }
              hint={`Sugerencias: ${meta.modelSuggestions.join(', ')}`}
            >
              <Input
                id="model"
                list={listId}
                value={config.model}
                onChange={(e) => update(selected, { model: e.target.value })}
                placeholder={meta.defaultModel}
                spellCheck={false}
                className="font-mono"
              />
              <datalist id={listId}>
                {suggestions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>

            {selected === 'anthropic' && (
              <Field
                label="Esfuerzo de razonamiento"
                htmlFor="effort"
                hint="Más esfuerzo = respuestas más cuidadas, pero más lentas y caras."
              >
                <Select
                  id="effort"
                  value={config.effort ?? 'medium'}
                  onChange={(e) => update(selected, { effort: e.target.value as ClaudeEffort })}
                >
                  <option value="low">Bajo (rápido)</option>
                  <option value="medium">Medio (recomendado)</option>
                  <option value="high">Alto (máxima calidad)</option>
                </Select>
              </Field>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-xs font-medium text-fg-muted hover:text-fg"
                aria-expanded={showAdvanced}
              >
                {showAdvanced ? '− Ocultar opciones avanzadas' : '+ Opciones avanzadas (URL base, proxy…)'}
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-4">
                  <Field
                    label="URL base"
                    htmlFor="base-url"
                    hint={
                      selected === 'openai'
                        ? 'Ej.: https://openrouter.ai/api/v1 · http://localhost:1234/v1 (LM Studio) · la URL de tu proxy.'
                        : selected === 'ollama'
                          ? 'Por defecto http://localhost:11434.'
                          : 'Déjala vacía para usar la API oficial, o pon la URL de tu proxy (server/proxy.mjs).'
                    }
                  >
                    <Input
                      id="base-url"
                      value={config.baseUrl}
                      onChange={(e) => update(selected, { baseUrl: e.target.value })}
                      placeholder={meta.defaultBaseUrl || 'API oficial'}
                      spellCheck={false}
                      className="font-mono"
                    />
                  </Field>
                  {selected === 'openai' && (
                    <Field
                      label="Salida estructurada"
                      htmlFor="structured"
                      hint="Si tu servidor no admite json_schema, Omnilearn lo detecta y baja de nivel automáticamente."
                    >
                      <Select
                        id="structured"
                        value={config.structuredMode ?? 'json_schema'}
                        onChange={(e) =>
                          update(selected, { structuredMode: e.target.value as StructuredMode })
                        }
                      >
                        <option value="json_schema">JSON Schema estricto (recomendado)</option>
                        <option value="json_object">Modo JSON</option>
                        <option value="none">Solo instrucciones en el prompt</option>
                      </Select>
                    </Field>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button
            variant="secondary"
            icon={<PlugZap className="size-4" />}
            onClick={() => void test()}
            loading={testing}
            disabled={!isProviderReady(config)}
          >
            Probar conexión
          </Button>
          {testResult && (
            <span
              className={cn(
                'inline-flex items-start gap-1.5 text-[13px]',
                testResult.ok ? 'text-success' : 'text-danger',
              )}
            >
              {testResult.ok ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CircleX className="mt-0.5 size-4 shrink-0" />
              )}
              <span>
                {testResult.message}
                {testResult.detail && (
                  <span className="block text-xs text-fg-muted">{testResult.detail}</span>
                )}
              </span>
            </span>
          )}
        </div>
      </Card>

      <Callout tone="info" icon={<ShieldCheck className="size-4 text-info" />} title="Privacidad">
        Tus rutas, progreso y claves se guardan solo en este navegador. Al generar contenido, el tema y el
        texto de la lección se envían al proveedor que elijas. Para compartir la app sin exponer claves, usa
        el proxy incluido (<code>npm run proxy</code>).
      </Callout>
    </div>
  );
}

function LearningSettings() {
  const s = useSettings();
  return (
    <Card className="space-y-6 p-5">
      <Field
        label="Idioma del contenido"
        htmlFor="lang"
        hint="Idioma en que se redactan las lecciones, quizzes y tarjetas."
      >
        <Select
          id="lang"
          value={s.contentLanguage}
          onChange={(e) => s.setPreference('contentLanguage', e.target.value)}
        >
          {CONTENT_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </Select>
      </Field>
      <Slider
        label="Nota mínima para completar una lección"
        description="Aprendizaje por dominio: no se avanza hasta demostrar comprensión."
        value={s.quizPassThreshold}
        min={0.5}
        max={1}
        step={0.05}
        onChange={(v) => s.setPreference('quizPassThreshold', v)}
        format={(v) => `${Math.round(v * 100)} %`}
      />
      <Slider
        label="Retención deseada (FSRS)"
        description="Probabilidad de recordar a la que se programa cada repaso. Más alta = más repasos."
        value={s.desiredRetention}
        min={0.8}
        max={0.97}
        step={0.01}
        onChange={(v) => s.setPreference('desiredRetention', v)}
        format={(v) => `${Math.round(v * 100)} %`}
      />
      <Slider
        label="Tarjetas nuevas por sesión"
        value={s.newCardsPerSession}
        min={5}
        max={60}
        step={5}
        onChange={(v) => s.setPreference('newCardsPerSession', v)}
        format={(v) => String(v)}
      />
      <Switch
        checked={s.askConfidence}
        onChange={(v) => s.setPreference('askConfidence', v)}
        label="Preguntar mi confianza en los quizzes"
        description="Entrena la metacognición: verás en el panel si eres sobreconfiado o infraconfiado."
      />
      <Switch
        checked={s.errorsToCards}
        onChange={(v) => s.setPreference('errorsToCards', v)}
        label="Convertir mis errores en tarjetas"
        description="Cada pregunta fallada pasa a tu mazo de repaso (cuaderno de errores)."
      />
      <Switch
        checked={s.sequentialByDefault}
        onChange={(v) => s.setPreference('sequentialByDefault', v)}
        label="Desbloqueo progresivo en rutas nuevas"
        description="Cada lección se desbloquea al aprobar el quiz de la anterior."
      />
    </Card>
  );
}

function AppearanceSettings() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const readingFont = useSettings((s) => s.readingFont);
  const textSize = useSettings((s) => s.textSize);
  const setPreference = useSettings((s) => s.setPreference);
  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13.5px] font-medium">Tema</span>
        <Segmented<ThemePreference>
          label="Tema"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'dark', label: 'Oscuro' },
            { value: 'light', label: 'Claro' },
            { value: 'system', label: 'Sistema' },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13.5px] font-medium">Tipografía de lectura</span>
        <Segmented<ReadingFont>
          label="Tipografía de lectura"
          value={readingFont}
          onChange={(v) => setPreference('readingFont', v)}
          options={[
            { value: 'sans', label: 'Sans' },
            { value: 'serif', label: 'Serif' },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13.5px] font-medium">Tamaño del texto</span>
        <Segmented<TextSize>
          label="Tamaño del texto"
          value={textSize}
          onChange={(v) => setPreference('textSize', v)}
          options={[
            { value: 'sm', label: 'A-' },
            { value: 'md', label: 'A' },
            { value: 'lg', label: 'A+' },
          ]}
        />
      </div>
      <div
        className="prose-ol rounded-lg border border-line bg-canvas p-4"
        data-font={readingFont}
        data-size={textSize}
      >
        <p>
          <strong>Vista previa.</strong> Las lecciones usan un ancho de línea de unos 65-75 caracteres y un
          interlineado generoso para leer sin fatiga.
        </p>
      </div>
    </Card>
  );
}

function DataSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, dialog] = useConfirm();
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    downloadJson(`omnilearn-copia-${new Date().toISOString().slice(0, 10)}.json`, await exportAll());
    toast.success('Copia de seguridad descargada');
  };

  const doImport = async (file: File) => {
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      const result = await importData(data, 'merge');
      toast.success(
        result.kind === 'contract'
          ? 'Temario importado como nueva ruta'
          : `Importadas ${result.courses} rutas y ${result.flashcards} tarjetas${result.skipped ? ` (${result.skipped} elementos no válidos omitidos)` : ''}`,
      );
    } catch (e) {
      toast.error('No se pudo importar el archivo', {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reinstallSample = async () => {
    if (await hasSampleCourse()) {
      toast.info('El curso de ejemplo ya está instalado');
      return;
    }
    await installSampleCourse();
    toast.success('Curso de ejemplo instalado');
  };

  const wipe = async () => {
    const ok = await confirm({
      title: '¿Borrar todos los datos?',
      description:
        'Se eliminarán todas tus rutas, lecciones, tarjetas e historial de este navegador. Exporta antes una copia si la necesitas.',
      confirmLabel: 'Borrar todo',
      danger: true,
    });
    if (!ok) return;
    await deleteAllData();
    toast.success('Datos borrados');
  };

  return (
    <Card className="space-y-4 p-5">
      {dialog}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void doExport()}>
          Exportar todo (JSON)
        </Button>
        <Button
          variant="secondary"
          icon={<Upload className="size-4" />}
          onClick={() => fileRef.current?.click()}
          loading={busy}
        >
          Importar JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void doImport(file);
          }}
        />
        <Button
          variant="ghost"
          icon={<ListRestart className="size-4" />}
          onClick={() => void reinstallSample()}
        >
          Reinstalar curso de ejemplo
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-fg-muted">
        Puedes importar una copia de Omnilearn o un temario suelto con el contrato JSON del motor (
        {'{ topic, level, focus, modules: [...] }'}), por ejemplo para compartir rutas con otras personas.
      </p>
      <div className="border-t border-line pt-4">
        <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => void wipe()}>
          Borrar todos los datos
        </Button>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const year = useMemo(() => new Date().getFullYear(), []);
  return (
    <Page>
      <PageHeader
        title="Ajustes"
        description="Conecta tu motor de IA y adapta Omnilearn a tu forma de aprender."
      />
      <Section
        title="Motor de IA"
        description="Omnilearn funciona con cualquier LLM. Elige el proveedor que prefieras; puedes cambiarlo cuando quieras."
      >
        <ProviderSettings />
      </Section>
      <Section
        title="Aprendizaje"
        description="Parámetros del motor pedagógico: dominio, repaso espaciado y metacognición."
      >
        <LearningSettings />
      </Section>
      <Section title="Apariencia" description="Modo oscuro por defecto para reducir la fatiga visual.">
        <AppearanceSettings />
      </Section>
      <Section
        title="Datos"
        description="Todo se guarda localmente. Exporta copias para no perder tu progreso."
      >
        <DataSettings />
      </Section>
      <p className="pt-4 text-center text-xs text-fg-faint">Omnilearn v0.1 · Local-first · {year}</p>
    </Page>
  );
}
