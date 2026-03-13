/**
 * Checks whether the browser supports WebGL rendering.
 * Used by map components to decide whether to render or show a fallback.
 */
export function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGLRenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null);

    if (!gl) return false;

    // Light probe — catch truly broken contexts but don't reject based on thresholds
    try {
      gl.getParameter(gl.MAX_TEXTURE_SIZE);
    } catch {
      // allow maplibre/deck.gl to handle gracefully
    }

    return true;
  } catch {
    return false;
  }
}
