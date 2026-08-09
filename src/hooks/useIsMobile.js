import { useEffect, useState } from 'react';

/**
 * Matches the stylesheet's own breakpoint, so behaviour and layout change at
 * the same width. False during server rendering and on first paint at desktop
 * sizes, which keeps the desktop render path exactly as it was.
 */
const QUERY = '(max-width: 900px)';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
