/**
 * Mount once, near the root. Every squircle in the system clips against this
 * single path — swatches, photo beds, chip thumbnails.
 */
export default function SquircleDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <clipPath id="squircle-clip" clipPathUnits="objectBoundingBox">
        <path d="M .5 0 C .112 0 0 .112 0 .5 C 0 .888 .112 1 .5 1 C .888 1 1 .888 1 .5 C 1 .112 .888 0 .5 0 Z" />
      </clipPath>
    </svg>
  );
}
