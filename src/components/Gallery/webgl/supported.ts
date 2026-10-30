let cached: boolean | undefined;

export function webglSupported(): boolean {
  if (cached === undefined) {
    try {
      const canvas = document.createElement('canvas');
      cached = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      cached = false;
    }
  }
  return cached;
}
