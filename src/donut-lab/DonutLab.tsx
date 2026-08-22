import { useEffect } from 'react';
import { X } from 'lucide-react';
import DonutBuilder from './DonutBuilder.jsx';
import './builder.css';
import './donut-lab.css';

/**
 * The Donut Lab, shown as a full-screen panel over the page.
 *
 * The builder was authored as a standalone app that owns the viewport, so it
 * gets the whole panel rather than being squeezed into the marketing layout.
 */
export default function DonutLab({ onClose }: { onClose: () => void }) {
  // Escape closes, and the page behind must not scroll while the Lab is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="donut-lab donut-lab-overlay" role="dialog" aria-modal="true" aria-label="Donut Lab">
      <div className="donut-lab-bar">
        <img src="/img/logo-amazing-donuts.svg" alt="Amazing Donuts" style={{ height: 'clamp(18px,1.7vw,24px)', width: 'auto' }} />
        <span
          style={{
            fontFamily: 'var(--font-cta)',
            fontWeight: 700,
            fontSize: 'var(--type-label)',
            letterSpacing: '.09em',
            textTransform: 'uppercase'
          }}
        >
          Donut Lab
        </span>
        <button type="button" aria-label="Close the Donut Lab" onClick={onClose} className="icon-btn" style={{ color: 'var(--cream)' }}>
          <X size={24} />
        </button>
      </div>

      <div className="donut-lab-body">
        <DonutBuilder />
      </div>
    </div>
  );
}
