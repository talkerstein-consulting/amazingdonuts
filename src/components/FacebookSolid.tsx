/**
 * Solid Facebook mark. Lucide only ships the outline version, and the socials
 * buttons want a filled glyph to sit level with Instagram's weight.
 */
export default function FacebookSolid({ size = 22 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 3.926 23.094 9.101 24v-8.437H6.627v-3.49h2.474V9.9c0-3.507 2.084-5.444 5.26-5.444 1.52 0 3.113.274 3.113.274v3.45h-1.754c-1.73 0-2.27 1.08-2.27 2.187v2.625h3.86l-.617 3.49h-3.243V24C20.074 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}
