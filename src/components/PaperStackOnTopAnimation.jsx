import { useRef, forwardRef, useImperativeHandle } from 'react';

const PAPER_BG    = '#f4efd7';
const PAPER_NOISE = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E\")";

function go(el, kf, opts) {
  return new Promise(r => {
    el.animate(kf, { fill: 'forwards', ...opts }).onfinish = r;
  });
}

const PaperStackOnTopAnimation = forwardRef(function PaperStackOnTopAnimation({ paperRef }, ref) {
  const el = useRef(null);

  useImperativeHandle(ref, () => ({
    async flip() {
      const paper = paperRef?.current;
      if (!paper || !el.current) return;

      const rect    = paper.getBoundingClientRect();
      const overlay = el.current;

      overlay.style.left   = rect.left   + 'px';
      overlay.style.top    = rect.top    + 'px';
      overlay.style.width  = rect.width  + 'px';
      overlay.style.height = rect.height + 'px';
      overlay.style.transformOrigin = 'center center';
      overlay.style.display = 'block';

      // Drop in from above, settle with a slight overshoot
      await go(overlay,
        [
          { transform: 'translateY(-180px) scale(0.95)', opacity: 0          },
          { transform: 'translateY(-180px) scale(0.95)', opacity: 1, offset: 0.12 },
          { transform: 'translateY(8px)    scale(1.01)', opacity: 1, offset: 0.82 },
          { transform: 'translateY(0)      scale(1)',    opacity: 1           },
        ],
        { duration: 620, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
      );

      // Fade out to reveal the real new paper underneath
      await go(overlay,
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 200, easing: 'ease-out' }
      );

      overlay.style.display = 'none';
    }
  }), [paperRef]);

  return (
    <div
      ref={el}
      style={{
        position: 'fixed',
        zIndex: 9997,
        pointerEvents: 'none',
        display: 'none',
        backgroundColor: PAPER_BG,
        backgroundImage: PAPER_NOISE,
        borderRadius: '2px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 15px 30px rgba(60,40,20,0.2)',
      }}
    />
  );
});

export default PaperStackOnTopAnimation;
