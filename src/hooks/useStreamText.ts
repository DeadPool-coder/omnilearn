import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Acumula texto en streaming y lo vuelca a React como mucho una vez por fotograma,
 * para no re-renderizar el Markdown con cada token.
 */
export function useStreamText() {
  const [text, setText] = useState('');
  const buffer = useRef('');
  const frame = useRef<number | null>(null);

  const flush = useCallback(() => {
    frame.current = null;
    setText(buffer.current);
  }, []);

  const push = useCallback(
    (fullText: string) => {
      buffer.current = fullText;
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  const reset = useCallback(() => {
    buffer.current = '';
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setText('');
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return useMemo(() => ({ text, push, reset }), [text, push, reset]);
}
