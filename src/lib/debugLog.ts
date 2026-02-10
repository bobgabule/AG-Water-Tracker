const DEBUG = typeof window !== 'undefined' && localStorage.getItem('__ag_debug') === 'true';

export function debugLog(tag: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.log(`[${tag}]`, ...args);
  }
}

export function debugWarn(tag: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.warn(`[${tag}]`, ...args);
  }
}

export function debugError(tag: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.error(`[${tag}]`, ...args);
  }
}
