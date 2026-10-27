/**
 * Servidor LLM falso para pruebas e2e: imita las APIs de OpenAI (Chat Completions) y Anthropic
 * (Messages), con y sin streaming. Responde según la tarea que detecta en el prompt.
 */
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordedRequest {
  path: string;
  body: Record<string, unknown>;
  headers: IncomingMessage['headers'];
}

const options = (correct: string, wrong: string[]) => [
  { text: correct, is_correct: true, explanation: 'Es la respuesta correcta según la lección.' },
  ...wrong.map((w) => ({ text: w, is_correct: false, explanation: 'Refleja una confusión frecuente.' })),
];

const FIXTURES = {
  syllabus: {
    title: 'Física cuántica: ruta de prueba',
    description: 'Ruta generada por el servidor LLM falso para validar el flujo completo.',
    learning_outcomes: ['Explicar la dualidad onda-partícula.', 'Describir el principio de incertidumbre.'],
    prerequisites: [],
    modules: [
      {
        title: 'Fundamentos cuánticos',
        description: 'Las ideas que rompen con la física clásica.',
        lessons: [
          {
            title: 'Dualidad onda-partícula',
            objective: 'Al terminar podrás explicar el experimento de la doble rendija.',
            key_concepts: ['Dualidad', 'Interferencia'],
            estimated_minutes: 6,
          },
          {
            title: 'El principio de incertidumbre',
            objective: 'Al terminar podrás interpretar la relación de Heisenberg.',
            key_concepts: ['Incertidumbre', 'Medición'],
            estimated_minutes: 6,
          },
        ],
      },
    ],
  },
  quiz: {
    questions: [
      {
        question: '¿Qué muestra el experimento de la doble rendija con electrones?',
        concept: 'Dualidad',
        bloom_level: 'understand',
        options: options('Un patrón de interferencia propio de las ondas', [
          'Dos franjas sin interferencia',
          'Que los electrones no tienen masa',
          'Que la luz es solo partícula',
        ]),
      },
      {
        question: 'Si mides la posición con gran precisión, ¿qué ocurre con el momento?',
        concept: 'Incertidumbre',
        bloom_level: 'apply',
        options: options('Su incertidumbre aumenta', [
          'Se vuelve exactamente cero',
          'No cambia nada',
          'Se duplica la masa',
        ]),
      },
      {
        question: '¿Qué papel tiene la medición en la mecánica cuántica?',
        concept: 'Medición',
        bloom_level: 'analyze',
        options: options('Afecta al estado del sistema medido', [
          'Ninguno: solo registra',
          'Solo importa en astronomía',
          'Elimina la energía del sistema',
        ]),
      },
    ],
  },
  flashcards: {
    cards: [
      {
        front: '¿Qué es la dualidad onda-partícula?',
        back: 'Que la materia y la luz muestran comportamientos de onda y de partícula.',
        concept: 'Dualidad',
      },
      {
        front: '¿Qué produce la doble rendija?',
        back: 'Un patrón de interferencia.',
        concept: 'Interferencia',
      },
      {
        front: '¿Qué limita el principio de incertidumbre?',
        back: 'La precisión simultánea de posición y momento.',
        concept: 'Incertidumbre',
      },
    ],
  },
  feynman: {
    rubric: { accuracy: 30, completeness: 20, clarity: 15, examples: 8 },
    verdict: 'solid',
    summary: 'Buena explicación general.',
    strengths: ['Mencionas la interferencia.'],
    gaps: ['Falta hablar de la medición.'],
    misconceptions: [],
    jargon: [],
    suggestions: ['Añade un ejemplo cotidiano.'],
    follow_up_question: '¿Qué pasaría si observas por qué rendija pasa el electrón?',
  },
  ping: { ok: true, message: 'listo' },
};

const LESSON_TEXT =
  'Contenido de prueba del servidor falso. La dualidad onda-partícula describe cómo la materia se comporta como onda y como partícula. ' +
  '\n\n## Interferencia\n\nEn el experimento de la doble rendija aparece un patrón de franjas. ' +
  '\n\n> **Concepto clave:** la interferencia es la huella de una onda.\n\n## Resumen\n\n- La materia tiene comportamiento ondulatorio.\n- Medir altera el sistema.\n\n## Para pensar\n\n¿Por qué no vemos interferencia con pelotas de tenis?';

function lastUserText(body: Record<string, unknown>): string {
  const messages = (body.messages as { role: string; content: unknown }[]) ?? [];
  const user = [...messages].reverse().find((m) => m.role === 'user');
  return typeof user?.content === 'string' ? user.content : JSON.stringify(user?.content ?? '');
}

function taskFor(text: string): keyof typeof FIXTURES | 'text' {
  if (text.includes('Diseña una ruta')) return 'syllabus';
  if (text.includes('micro-quiz')) return 'quiz';
  if (text.includes('tarjetas de memoria')) return 'flashcards';
  if (text.includes('Desafío Feynman')) return 'feynman';
  if (text.includes('"ok": true')) return 'ping';
  return 'text';
}

function chunks(text: string): string[] {
  return text.match(/.{1,24}/gs) ?? [text];
}

export async function startFakeLLM(): Promise<{
  url: string;
  requests: RecordedRequest[];
  close: () => void;
}> {
  const requests: RecordedRequest[] = [];
  const server: Server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const path = req.url ?? '';
      requests.push({ path, body, headers: req.headers });
      const task = taskFor(lastUserText(body));
      const payload = task === 'text' ? LESSON_TEXT : JSON.stringify(FIXTURES[task]);

      if (path.startsWith('/v1/models')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ data: [{ id: 'modelo-falso', type: 'model' }], has_more: false }));
      }

      if (path === '/v1/chat/completions') {
        if (body.stream) {
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          for (const piece of chunks(payload))
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`);
          return res.end('data: [DONE]\n\n');
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(
          JSON.stringify({ choices: [{ message: { content: payload }, finish_reason: 'stop' }] }),
        );
      }

      if (path === '/v1/messages') {
        const message = {
          id: 'msg_falso',
          type: 'message',
          role: 'assistant',
          model: String(body.model ?? 'modelo-falso'),
          content: [] as { type: string; text: string }[],
          stop_reason: null as string | null,
          stop_sequence: null,
          stop_details: null,
          usage: { input_tokens: 10, output_tokens: 0 },
        };
        if (body.stream) {
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          const send = (event: string, data: unknown) =>
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
          send('message_start', { type: 'message_start', message });
          send('content_block_start', {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'text', text: '' },
          });
          for (const piece of chunks(payload)) {
            send('content_block_delta', {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: piece },
            });
          }
          send('content_block_stop', { type: 'content_block_stop', index: 0 });
          send('message_delta', {
            type: 'message_delta',
            delta: { stop_reason: 'end_turn', stop_sequence: null },
            usage: { output_tokens: 42 },
          });
          send('message_stop', { type: 'message_stop' });
          return res.end();
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(
          JSON.stringify({ ...message, content: [{ type: 'text', text: payload }], stop_reason: 'end_turn' }),
        );
      }

      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `ruta no simulada: ${path}` } }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, requests, close: () => server.close() };
}
