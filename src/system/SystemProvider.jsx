import { createContext, useContext, useMemo } from 'react';
import { createSystem } from './index.js';

const SystemContext = createContext(null);

/**
 * Injects the system's ports into the React tree.
 * Tests and storybooks pass their own doubles via `value`.
 */
export function SystemProvider({ value, children }) {
  const system = useMemo(() => value ?? createSystem(), [value]);
  return <SystemContext.Provider value={system}>{children}</SystemContext.Provider>;
}

export function useSystem() {
  const system = useContext(SystemContext);
  if (!system) throw new Error('useSystem must be used inside a <SystemProvider>.');
  return system;
}
