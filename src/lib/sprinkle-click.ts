const COLOURS = ['#f5a3c7', '#f26b21', '#2f7fc1', '#fbf7ef', '#0e3e69'];
const INTERACTIVE = 'button, a, summary, [role="button"], [role="checkbox"], [role="radio"], [role="tab"]';

function burst(x: number, y: number) {
  for (let i = 0; i < 12; i += 1) {
    const angle = i * Math.PI / 6 + (Math.random() - .5) * .5;
    const distance = 25 + Math.random() * 35;
    const bit = document.createElement('span');
    Object.assign(bit.style, {
      position: 'fixed', left: `${x}px`, top: `${y}px`, zIndex: '260',
      width: '8px', height: '3px', borderRadius: '99px',
      background: COLOURS[i % COLOURS.length], pointerEvents: 'none'
    });
    document.body.appendChild(bit);
    bit.animate([
      { transform: `translate(-50%, -50%) rotate(${angle}rad)`, opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) rotate(${angle + 2}rad)`, opacity: 0 }
    ], { duration: 520 + Math.random() * 180, easing: 'cubic-bezier(.22,1,.36,1)' })
      .finished.catch(() => {}).finally(() => bit.remove());
  }
}

export function initSprinkleClicks() {
  const onClick = (event: MouseEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(INTERACTIVE) : null;
    if (!target || target.closest('.bbtn') || target.getAttribute('aria-label')?.startsWith('Add ') || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    burst(event.clientX || rect.left + rect.width / 2, event.clientY || rect.top + rect.height / 2);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
