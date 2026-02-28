import { useRef, forwardRef, useImperativeHandle } from 'react';

/**
 * MailAnimation
 *
 * Drop into JSX anywhere — renders nothing until called.
 *
 * Setup in App.jsx:
 *   const mailRef      = useRef();
 *   const promptBarRef = useRef();  // attach to prompt bar div
 *
 *   <MailAnimation ref={mailRef} anchorRef={promptBarRef} paperRef={mainAreaRef} />
 *
 * Then in callApi / callApiChain / callApiClearRewrite:
 *   mailRef.current.sendMail();    // fire when send is triggered
 *   mailRef.current.receiveMail(); // fire when response arrives
 */

const ENV_W = 90;
const ENV_H = 56;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function go(el, kf, opts) {
  return new Promise(r => {
    el.animate(kf, { fill: 'forwards', easing: 'ease', ...opts }).onfinish = r;
  });
}
function midX(el) { const r = el.getBoundingClientRect(); return r.left + r.width / 2; }
function midY(el) { const r = el.getBoundingClientRect(); return r.top + r.height / 2; }
function place(el, x, y) {
  el.style.left = (x - ENV_W / 2) + 'px';
  el.style.top  = (y - ENV_H / 2) + 'px';
}

const MailAnimation = forwardRef(function MailAnimation({ anchorRef, paperRef }, ref) {
  const outEl     = useRef(null);
  const inEl      = useRef(null);
  const queue     = useRef([]);
  const processing = useRef(false);

  async function processQueue() {
    if (processing.current) return;
    processing.current = true;
    while (queue.current.length > 0) {
      const task = queue.current.shift();
      await task();
    }
    processing.current = false;
  }

  function enqueue(task) {
    queue.current.push(task);
    processQueue();
  }

  useImperativeHandle(ref, () => ({

    sendMail() {
      const anchor = anchorRef?.current;
      if (!anchor || !outEl.current) return;
      enqueue(async () => {
        const el = outEl.current;
        place(el, midX(anchor), midY(anchor));
        el.style.display = 'block';
        await go(el,
          [{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 350, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
        );
        await wait(150);
        await go(el,
          [
            { transform: 'translateY(0) scale(1)', opacity: 1 },
            { transform: 'translateY(-30vh) scale(0.9)', opacity: 1, offset: 0.4 },
            { transform: 'translateY(-110vh) scale(0.6)', opacity: 0 },
          ],
          { duration: 900, easing: 'cubic-bezier(0.4,0,0.4,1)' }
        );
        el.style.display = 'none';
      });
    },

    receiveMail() {
      const paper = paperRef?.current;
      if (!paper || !inEl.current) return;
      enqueue(async () => {
        const el = inEl.current;
        const dx = midX(paper);
        const dt = paper.getBoundingClientRect().top + 40;
        place(el, dx, dt - 80);
        el.style.display = 'block';
        // start above screen
        el.style.transform = 'translateY(-120vh)';
        await go(el,
          [
            { transform: 'translateY(-120vh)', opacity: 1 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          { duration: 700, easing: 'cubic-bezier(0.22,1,0.36,1)' }
        );
        await wait(1200);
        await go(el,
          [
            { transform: 'translateY(0) scale(1)', opacity: 1 },
            { transform: 'translateY(20vh) scale(0.85)', opacity: 0 },
          ],
          { duration: 900, easing: 'cubic-bezier(0.4,0,0.8,1)' }
        );
        el.style.display = 'none';
      });
    },

  }), [anchorRef, paperRef]);

  const base = { position: 'fixed', zIndex: 9999, pointerEvents: 'none', display: 'none' };

  return (
    <>
      {/* outgoing — navy seal */}
      <div ref={outEl} style={base}>
        <svg width={ENV_W} height={ENV_H} viewBox={`0 0 ${ENV_W} ${ENV_H}`} xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width={ENV_W} height={ENV_H} rx="2" fill="#e8d5a3"/>
          <polygon points={`0,0 ${ENV_W},0 ${ENV_W/2},${ENV_H*0.54}`} fill="#d4b870"/>
          <circle cx={ENV_W/2} cy={ENV_H*0.54} r="9" fill="#1a2a4a"/>
          <circle cx={ENV_W/2} cy={ENV_H*0.54} r="7" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
          <text x={ENV_W/2} y={ENV_H*0.54+3} textAnchor="middle" fontFamily="'Crimson Pro',serif" fontSize="6" fontWeight="600" fill="rgba(200,220,255,0.65)">ML</text>
        </svg>
      </div>

      {/* incoming — red seal */}
      <div ref={inEl} style={base}>
        <svg width={ENV_W} height={ENV_H} viewBox={`0 0 ${ENV_W} ${ENV_H}`} xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width={ENV_W} height={ENV_H} rx="2" fill="#e8d5a3"/>
          <polygon points={`0,0 ${ENV_W},0 ${ENV_W/2},${ENV_H*0.54}`} fill="#d4b870"/>
          <circle cx={ENV_W/2} cy={ENV_H*0.54} r="9" fill="#8b0000"/>
          <circle cx={ENV_W/2} cy={ENV_H*0.54} r="7" fill="none" stroke="rgba(255,200,200,0.15)" strokeWidth="1"/>
          <text x={ENV_W/2} y={ENV_H*0.54+3} textAnchor="middle" fontFamily="'Crimson Pro',serif" fontSize="6" fontWeight="600" fill="rgba(255,200,200,0.65)">ML</text>
        </svg>
      </div>
    </>
  );
});

export default MailAnimation;