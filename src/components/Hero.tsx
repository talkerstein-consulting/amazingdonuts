import { motion } from 'motion/react';
import Button from './Button';
import { useScrollSpin } from '../hooks/useScrollSpin';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Hero() {
  // The donut turns as the page scrolls past it.
  const spin = useScrollSpin<HTMLImageElement>(150);

  return (
    <section id="top" style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(20px,4vw,54px) clamp(16px,4vw,40px) 0' }}>
      <motion.h1
        className="hero-title"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{
          fontSize: 'var(--type-hero)',
          lineHeight: 0.88,
          letterSpacing: '-.015em',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'clamp(10px,1.2vw,20px)',
          textWrap: 'balance'
        }}
      >
        <span>Life's too</span>
        <img src="/img/heart-shape-donut-1.png" alt="Heart-shaped donut" style={{ height: 'clamp(0.62em,8vw,1em)', width: 'auto' }} />
        <span>short</span>
        <span style={{ flexBasis: '100%' }}>For boring donuts.</span>
      </motion.h1>

      <motion.p
        className="hero-lede"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        style={{
          margin: 'clamp(14px,1.8vw,22px) 0 0',
          maxWidth: '34ch',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--type-body)',
          lineHeight: 1.45,
          color: 'rgba(14,62,105,.75)'
        }}
      >
        Hand-cut and decorated every morning since '97.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
        className="hero-ctas"
        style={{ marginTop: 'clamp(18px,2.4vw,28px)', display: 'flex', flexWrap: 'wrap', gap: 12 }}
      >
        <Button href="#favorites" style={{ background: 'var(--orange)', color: '#fff' }} hoverStyle={{ transform: 'translateY(-2px)', filter: 'brightness(1.06)' }}>
          Get the good stuff
        </Button>
        <Button
          href="#lab"
          style={{ border: '2.2px solid var(--navy)', color: 'var(--navy)' }}
          hoverStyle={{ background: 'var(--navy)', color: 'var(--cream)' }}
        >
          Make your own
        </Button>
      </motion.div>

      {/* Plain wrapper, deliberately untransformed: motion leaves a transform on
          the animated element, which would trap the badge in its own stacking
          context and let the sticky header paint over it. */}
      <div style={{ position: 'relative', marginTop: 'clamp(2px,0.6vw,10px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
        >
          {/* The photo runs long on purpose: the certification bar crosses it at
              roughly its midpoint and the next section covers the rest. */}
          <div className="hero-photo" style={{ overflow: 'hidden', borderRadius: '32px 32px 0 0', marginBottom: '-44%' }}>
            <img
              ref={spin}
              src="/img/gemini-generated-image-iehotziehotzieho-copy.png"
              alt="Blue glazed donut with white sprinkles"
              style={{ width: '100%', height: 'auto', willChange: 'rotate' }}
            />
          </div>
        </motion.div>

        <img
          src="/img/badge-made-fresh.svg"
          alt="Made fresh since 1997"
          className="hero-badge"
          style={{
            position: 'absolute',
            /* Above the hero photo, under the sticky header (z 60) — so the
               bar passes over the badge on scroll rather than the badge
               riding on top of it. */
            zIndex: 2,
            right: 'clamp(10px,5vw,56px)',
            top: 'clamp(56px,17vw,150px)',
            width: 'clamp(104px,17vw,170px)',
            height: 'auto',
            filter: 'drop-shadow(0 10px 22px rgba(14,62,105,.22))'
          }}
        />
      </div>

    </section>
  );
}
