import { useEffect, useRef } from 'react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

const ALL_QUOTES = [
  { quote: 'The custom donut wall stole the whole party. Everyone asked where we got it.', name: 'Rivka G.', title: 'Bat mitzvah order' },
  { quote: 'Fresh every single morning — the sprinkle donuts disappear before I get to the office.', name: 'Marcus L.', title: 'Regular, Classic lane' },
  { quote: 'Bulk order for 60 people, zero stress, and the box was gone in ten minutes.', name: 'Sophia P.', title: 'Office manager' },
  { quote: 'They matched our logo perfectly on the custom donuts. Tasted as good as they looked.', name: 'David C.', title: 'Donut Lab customer' },
  { quote: 'Kosher, fresh, and actually exciting flavors — the marble muffins are unreal.', name: 'Emma R.', title: 'Weekly regular' },
  { quote: "Ordered the challah for Friday and it was gone before Shabbat started.", name: 'Tyler J.', title: 'Bread lane' }
];

const COLUMNS = [ALL_QUOTES.slice(0, 2), ALL_QUOTES.slice(2, 4), ALL_QUOTES.slice(4, 6)];

function Column({ items, speed }: { items: typeof ALL_QUOTES; speed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let offset = 0;
    let frame: number;
    const tick = () => {
      offset += speed;
      const half = node.scrollHeight / 2;
      if (offset >= half) offset = 0;
      node.style.transform = `translateY(-${offset}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [speed]);

  return (
    <div style={{ position: 'relative', height: 460, overflow: 'hidden', borderRadius: 20 }}>
      <div ref={ref}>
        {[...items, ...items].map((t, i) => (
          <div
            key={i}
            style={{
              marginBottom: 14,
              borderRadius: 20,
              background: 'var(--sand)',
              border: '1px solid rgba(14,62,105,.1)',
              padding: 22
            }}
          >
            <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.5, color: 'var(--navy)' }}>&ldquo;{t.quote}&rdquo;</p>
            <div>
              <div style={{ fontFamily: 'var(--font-cta)', fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{t.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(14,62,105,.55)' }}>{t.title}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 60, background: 'linear-gradient(to bottom, var(--cream), transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: 60, background: 'linear-gradient(to top, var(--cream), transparent)', pointerEvents: 'none' }} />
    </div>
  );
}

export default function Testimonials() {
  const isDesktop = useIsDesktop(760);
  // One scrolling column on phones — three stacked columns repeat every quote.
  const columns = isDesktop ? COLUMNS : [ALL_QUOTES];

  return (
    <section style={{ position: 'relative', background: 'var(--cream)', padding: 'clamp(28px,3.4vw,52px) 0 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(18px,4vw,40px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 28 }}>
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ maxWidth: '12ch', fontSize: 'var(--type-section)', lineHeight: 0.92, color: 'var(--navy)' }}
          >
            Loved by our regulars
          </motion.h2>
          <a
            href="#wild"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 99,
              background: 'var(--navy)',
              color: 'var(--cream)',
              fontFamily: 'var(--font-cta)',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              padding: '14px 24px'
            }}
          >
            Wall of love
            <ArrowRight size={16} />
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {columns.map((col, i) => (
            <Column key={i} items={col} speed={0.35 + i * 0.12} />
          ))}
        </div>
      </div>

      {/* The wall fades out into the page across the full section width. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 'clamp(90px,12vw,170px)',
          background: 'linear-gradient(to top, var(--cream), transparent)',
          pointerEvents: 'none'
        }}
      />
    </section>
  );
}
