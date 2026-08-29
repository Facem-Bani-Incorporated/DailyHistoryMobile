/* Țărani care aleargă — one continuous crowd whose mood escalates.
   Renders the CompositionStage; every visual is a pure function of T. */
const { useComposition, CompositionStage, clamp } = window;

const W = 1680, H = 720;
const SCENES = JSON.parse(window.OM_SCENES || '[]');
const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0) || 16;
const CUE = (() => { let a = 0, o = {}; SCENES.forEach(s => { o[s.name] = a; a += s.dur; }); return o; })();

const ss = (a, b, x) => { const t = clamp((x - a) / (b - a || 1e-6), 0, 1); return t * t * (3 - 2 * t); };

/* mood 0=fericit 1=ingrijorat 2=furios, returns to 0 by TOTAL so the loop seam matches */
function moodAt(T) {
  const c1 = CUE['Ingrijorati'] ?? 5, c2 = CUE['Furiosi'] ?? 10, c3 = CUE['Revenire'] ?? TOTAL - 1.5;
  return ss(c1 - 0.9, c1 + 0.9, T) + ss(c2 - 0.9, c2 + 0.9, T) - 2 * ss(c3, TOTAL, T);
}
const speedAt = m => 0.82 + 0.4 * m;

/* warped distance clock: integral of speed, normalized to 0..1 over the loop */
const TABLE = (() => {
  const N = 720, out = new Float64Array(N + 1); let acc = 0;
  for (let i = 1; i <= N; i++) {
    const t0 = (i - 1) / N * TOTAL, t1 = i / N * TOTAL;
    acc += (speedAt(moodAt(t0)) + speedAt(moodAt(t1))) / 2 * (t1 - t0);
    out[i] = acc;
  }
  return out;
})();
const TABLE_TOTAL = TABLE[TABLE.length - 1];
function uAt(T) {
  const N = TABLE.length - 1, x = clamp(T / TOTAL, 0, 1) * N, i = Math.min(N - 1, Math.floor(x));
  return (TABLE[i] + (TABLE[i + 1] - TABLE[i]) * (x - i)) / TABLE_TOTAL;
}

const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixHex = (a, b, t) => { const A = hx(a), B = hx(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const PAL = [
  { tunic: '#7FB069', sleeve: '#EAD8B1', trousers: '#B08968', hat: '#E5C67C', skin: '#E9B58D', boot: '#4E3A2E', line: '#4A3527' },
  { tunic: '#6C8B77', sleeve: '#DDCDAA', trousers: '#8E7460', hat: '#D2B573', skin: '#E2AC86', boot: '#453227', line: '#3E2C20' },
  { tunic: '#93463A', sleeve: '#C9B48D', trousers: '#5F4235', hat: '#B7924F', skin: '#D89478', boot: '#33241B', line: '#2C1E16' },
];
function pal(m) {
  const i = m <= 1 ? 0 : 1, t = m <= 1 ? m : m - 1, a = PAL[i], b = PAL[i + 1], o = {};
  Object.keys(a).forEach(k => o[k] = mixHex(a[k], b[k], t));
  return o;
}

const px = v => `${v}px`;
const abs = (l, t, w, h, extra) => Object.assign({ position: 'absolute', left: px(l), top: px(t), width: px(w), height: px(h) }, extra || {});

function Limb({ x, y, w, len, rot, rot2, color, boot, line }) {
  return (
    <div style={abs(x - w / 2, y, w, len, { transformOrigin: '50% 0%', transform: `rotate(${rot}deg)` })}>
      <div style={{ position: 'absolute', inset: 0, background: color, borderRadius: px(w / 2), border: `2px solid ${line}` }}></div>
      <div style={abs(0, len - 3, w, len * 0.92, { transformOrigin: '50% 0%', transform: `rotate(${rot2}deg)` })}>
        <div style={{ position: 'absolute', inset: 0, background: color, borderRadius: px(w / 2), border: `2px solid ${line}` }}></div>
        {boot ? <div style={abs(-w * 0.35, len * 0.92 - w * 0.5, w * 1.7, w * 0.95, { background: boot, borderRadius: `${px(w * 0.3)} ${px(w * 0.7)} ${px(w * 0.3)} ${px(w * 0.3)}`, border: `2px solid ${line}` })}></div> : null}
      </div>
    </div>
  );
}

function Pitchfork({ c }) {
  return (
    <div style={abs(-4, -46, 12, 160, { transform: 'rotate(-12deg)', transformOrigin: '50% 72%' })}>
      <div style={abs(3, 22, 7, 132, { background: '#9A7248', borderRadius: '4px', border: `2px solid ${c.line}` })}></div>
      <div style={abs(-8, 16, 29, 9, { background: '#9EA7AE', borderRadius: '4px', border: `2px solid ${c.line}` })}></div>
      {[-8, 2, 12].map(l => <div key={l} style={abs(l, -8, 9, 26, { background: '#AEB8BF', borderRadius: '4px 4px 2px 2px', border: `2px solid ${c.line}` })}></div>)}
    </div>
  );
}

function Torch({ c, flick }) {
  const s = 1 + 0.14 * flick;
  return (
    <div style={abs(-3, -34, 12, 130, { transform: 'rotate(8deg)', transformOrigin: '50% 80%' })}>
      <div style={abs(2, 26, 8, 104, { background: '#7E5B39', borderRadius: '4px', border: `2px solid ${c.line}` })}></div>
      <div style={abs(-4, 14, 20, 20, { background: '#4A3527', borderRadius: '5px' })}></div>
      <div style={abs(-9, -24, 30, 48, { transformOrigin: '50% 100%', transform: `scale(${s}, ${1 + 0.22 * flick})` })}>
        <div style={{ position: 'absolute', inset: 0, background: '#E8642B', borderRadius: '50% 50% 46% 46% / 70% 70% 30% 30%' }}></div>
        <div style={abs(7, 12, 16, 32, { background: '#F6B23C', borderRadius: '50% 50% 46% 46% / 70% 70% 30% 30%' })}></div>
        <div style={abs(11, 24, 9, 16, { background: '#FCE9A8', borderRadius: '50%' })}></div>
      </div>
    </div>
  );
}

function Peasant({ u, m, i, count }) {
  const c = pal(m);
  const row = i % 3;
  const scale = [0.6, 0.79, 1][row];
  const feetY = [432, 552, 690][row];
  const stepsTotal = [60, 72, 96][row];
  const loops = row === 2 ? 4 : 3;
  const startFrac = ((i / count) + row * 0.135 + ((i * 37) % 11) * 0.006) % 1;
  const span = W + 460;
  const x = ((startFrac + u * loops) % 1) * span - 230;

  const ph = ((u * stepsTotal + startFrac * 3.7) % 1) * Math.PI * 2;
  const sw = 26 + m * 9;
  const legA = sw * Math.sin(ph), legB = -sw * Math.sin(ph);
  const kneeA = -30 * (0.5 + 0.5 * Math.cos(ph)), kneeB = -30 * (0.5 - 0.5 * Math.cos(ph));
  const bob = -3.5 - 3.5 * Math.cos(ph * 2) - m * 1.2;
  const lean = 3 + m * 6;
  const armSw = 30 + m * 12;
  const carry = i % 3 === 0 ? 'fork' : (i % 3 === 1 ? 'torch' : 'fist');
  const rage = clamp(m - 1, 0, 1);
  const rageS = rage * rage * (3 - 2 * rage);
  const worry = clamp(1 - Math.abs(m - 1), 0, 1);
  const flick = Math.sin(u * 96 * Math.PI * 2 + i) * 0.5 + Math.sin(u * 151 * Math.PI * 2 + i * 2) * 0.5;

  const rearArmRot = -armSw * Math.sin(ph) * (1 - rageS) - (150 + 20 * flick) * rageS;
  const frontArmRot = armSw * Math.sin(ph) * (1 - Math.max(rageS, worry * 0.7)) - (138 + 10 * Math.sin(ph)) * rageS - 55 * worry * 0.7;
  const headRot = -worry * 16 * (i % 2 ? 1 : 0.2) - rageS * 5;

  return (
    <div style={{ position: 'absolute', left: px(x), top: px(feetY), width: '100px', height: '200px', transform: `translate(-50%, -100%) scale(${scale})`, transformOrigin: '50% 100%', zIndex: row }}>
      <div style={abs(15, 194, 70, 14, { background: 'rgba(40,30,20,0.16)', borderRadius: '50%' })}></div>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${px(bob)})` }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 90%', transform: `rotate(${lean}deg)` }}>
          {/* far leg + far arm */}
          <Limb x={44} y={106} w={15} len={54} rot={legB} rot2={kneeB} color={mixHex('#000000', c.trousers, 0.72)} boot={mixHex('#000000', c.boot, 0.7)} line={c.line} />
          <Limb x={44} y={58} w={12} len={40} rot={rearArmRot} rot2={-14} color={mixHex('#000000', c.sleeve, 0.78)} line={c.line} />
          {/* torso */}
          <div style={abs(27, 48, 46, 64, { background: c.tunic, borderRadius: '14px 14px 8px 8px', border: `2px solid ${c.line}` })}>
            <div style={abs(-2, 44, 46, 12, { background: mixHex('#3b2a1e', c.tunic, 0.35), borderRadius: '3px' })}></div>
          </div>
          {/* head */}
          <div style={abs(28, 6, 44, 46, { transformOrigin: '50% 90%', transform: `rotate(${headRot}deg)` })}>
            <div style={{ position: 'absolute', inset: 0, background: c.skin, borderRadius: '46% 46% 44% 44%', border: `2px solid ${c.line}` }}></div>
            <div style={abs(9, 20, 6, 7, { background: c.line, borderRadius: '50%' })}></div>
            <div style={abs(26, 20, 6, 7, { background: c.line, borderRadius: '50%' })}></div>
            <div style={abs(7, 13, 10, 3, { background: c.line, borderRadius: '2px', transform: `rotate(${8 - 26 * rageS - 10 * worry}deg)` })}></div>
            <div style={abs(25, 13, 10, 3, { background: c.line, borderRadius: '2px', transform: `rotate(${-8 + 26 * rageS + 10 * worry}deg)` })}></div>
            {/* mouths cross-fade */}
            <div style={abs(14, 29, 16, 9, { borderBottom: `3px solid ${c.line}`, borderRadius: '0 0 16px 16px', opacity: clamp(1 - m, 0, 1) })}></div>
            <div style={abs(18, 30, 9, 8, { border: `3px solid ${c.line}`, borderRadius: '50%', opacity: worry })}></div>
            <div style={abs(13, 28, 18, 14, { background: c.line, borderRadius: '4px 4px 9px 9px', opacity: rageS })}></div>
            {/* straw hat */}
            <div style={abs(-9, -2, 62, 13, { background: c.hat, borderRadius: '50%', border: `2px solid ${c.line}` })}></div>
            <div style={abs(9, -18, 26, 20, { background: c.hat, borderRadius: '12px 12px 4px 4px', border: `2px solid ${c.line}` })}></div>
          </div>
          {/* near leg */}
          <Limb x={54} y={106} w={16} len={56} rot={legA} rot2={kneeA} color={c.trousers} boot={c.boot} line={c.line} />
          {/* near arm + carried prop */}
          <div style={abs(50, 58, 0, 0, { transformOrigin: '0 0', transform: `rotate(${frontArmRot}deg)` })}>
            <div style={abs(-6, 0, 13, 42, { background: c.sleeve, borderRadius: '7px', border: `2px solid ${c.line}` })}></div>
            <div style={abs(-6, 36, 13, 34, { transformOrigin: '50% 0', transform: 'rotate(-18deg)' })}>
              <div style={{ position: 'absolute', inset: 0, background: c.sleeve, borderRadius: '7px', border: `2px solid ${c.line}` }}></div>
              <div style={abs(-2, 28, 17, 15, { background: c.skin, borderRadius: '50%', border: `2px solid ${c.line}` })}></div>
              <div style={abs(6, 22, 14, 20, { opacity: rageS, transform: `rotate(${18 - frontArmRot}deg) scale(${0.5 + 0.5 * rageS})`, transformOrigin: '50% 20%' })}>
                {carry === 'fork' ? <Pitchfork c={c} /> : carry === 'torch' ? <Torch c={c} flick={flick} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Crowd({ count, lockMood }) {
  const { T } = useComposition();
  const m = lockMood == null ? moodAt(T) : lockMood;
  const u = lockMood == null ? uAt(T) : (T / TOTAL) * (speedAt(lockMood) / speedAt(0)) % 1;
  const n = Math.max(1, Math.min(16, count || 11));
  const list = [];
  for (let i = 0; i < n; i++) list.push(<Peasant key={i} u={u} m={m} i={i} count={n} />);
  return <div style={{ position: 'absolute', inset: 0 }}>{list}</div>;
}

function TaraniScene(props) {
  const moodMap = { fericiti: 0, ingrijorati: 1, furiosi: 2 };
  const lock = props.mood && props.mood !== 'toate' ? moodMap[props.mood] : null;
  return (
    <CompositionStage width={W} height={H} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="transparent">
      <Crowd count={props.count} lockMood={lock} />
    </CompositionStage>
  );
}
window.TaraniScene = TaraniScene;
