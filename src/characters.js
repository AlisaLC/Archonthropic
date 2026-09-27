// Roster of chibi companions + the SVG painter that draws them with an expression.
// Loaded by the main process (for ids/names) and by the renderer (for drawing).
//
// Every character shares the same head/face/arm rig (so expressions work everywhere)
// but brings its own layers: back hair, ears, bangs, accessories, outfit and extras.
// Designs follow the in-game character icons (see tools/compare.html).
(function (root) {
  'use strict';

  const ELEMENTS = {
    Pyro: '#ef7a35', Hydro: '#4cc2f1', Anemo: '#74c2a8', Electro: '#af8ec1',
    Dendro: '#a5c83b', Cryo: '#9fd6e3', Geo: '#fab72e',
  };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
  }

  const MIRROR = 'transform="translate(120,0) scale(-1,1)"';
  const both = (svg) => `${svg}<g ${MIRROR}>${svg}</g>`;
  const INK = '#3a2630';
  const r1 = (n) => Math.round(n * 10) / 10;
  const line = (col, w = 1.1) => `stroke="${col}" stroke-width="${w}" stroke-linejoin="round"`;

  // ---------------------------------------------------------------- hair kit

  // A tapered strand from its root (x1,y1) to a pointed tip (x2,y2); `bend` curves it sideways.
  function lock(x1, y1, x2, y2, w, bend = 0) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, h = w / 2;
    const mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
    return `M${r1(x1 - nx * h)} ${r1(y1 - ny * h)} Q${r1(mx - nx * h * 0.9)} ${r1(my - ny * h * 0.9)} ${r1(x2)} ${r1(y2)} `
      + `Q${r1(mx + nx * h * 0.9)} ${r1(my + ny * h * 0.9)} ${r1(x1 + nx * h)} ${r1(y1 + ny * h)} Z`;
  }
  const locks = (list) => list.map((a) => lock(...a)).join(' ');
  // Bangs: each strand outlined on its own, then the fringe base (unoutlined) on top so the roots merge.
  const fringe = (c, list, base = FRINGE) => list.map((a) => H(c, lock(...a))).join('') + `<path d="${base}" fill="url(#hg-${c.id})"/>`;
  const hairStroke = (c) => c.hairLine || shade(c.hair, -0.4);
  // Hair shapes are filled with the character's vertical hair gradient (tips colour at the bottom).
  const H = (c, d, extra = '') => `<path d="${d}" fill="url(#hg-${c.id})" ${line(hairStroke(c))} ${extra}/>`;
  // Long hair behind the body as a few tapered strands rather than a solid block.
  const longHair = (c, bottom, out = 0) => H(c, 'M28 62 Q25 82 34 98 L86 98 Q95 82 92 62 Z')
    + both(H(c, lock(31, 58, 22 - out, bottom, 19, -5)) + H(c, lock(40, 76, 33 - out / 2, bottom + 4, 14, -2)));
  const CROWN = 'M26 72 C20 36 42 21 60 21 C78 21 100 36 94 72 Z';
  const FRINGE = 'M28 66 C25 34 44 23 60 23 C76 23 95 34 92 66 C84 50 73 44 60 44 C47 44 36 50 28 66 Z';
  const ring = (c, y = 40, op = 0.45) => `<path d="M39 ${y + 6} Q60 ${y - 6} 81 ${y + 6}" fill="none" stroke="${c.shineCol || '#fff'}" stroke-opacity="${op}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="9 2.5 5 2.5"/>`;

  const torsoPath = 'M42 93 Q60 88 78 93 L85 124 Q60 132 35 124 Z';
  const torso = (fill, stroke) => `<path d="${torsoPath}" fill="${fill}" stroke="${stroke || shade(fill, -0.4)}" stroke-width="1.3" stroke-linejoin="round"/>`;
  const legs = (c) => both(`<rect x="48" y="120" width="10" height="15" rx="4.5" fill="${c.legs}" ${line(shade(c.legs, -0.35))}/>
    <ellipse cx="52" cy="135" rx="6.5" ry="3.5" fill="${c.shoes}" ${line(shade(c.shoes, -0.4))}/>`);
  const bow = (x, y, col, knot, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 L-7 -4.5 Q-8.5 0 -7 4.5 Z M0 0 L7 -4.5 Q8.5 0 7 4.5 Z" fill="${col}" stroke="${shade(col, -0.45)}" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M-1 1 L-4 8 M1 1 L4 8" stroke="${col}" stroke-width="2" stroke-linecap="round"/><circle r="2" fill="${knot}"/></g>`;
  const gem = (x, y, s, col, rim = '#e6c25e') => `<path d="M${x} ${y - s} L${x + s * 0.75} ${y} L${x} ${y + s} L${x - s * 0.75} ${y} Z" fill="${col}" stroke="${rim}" stroke-width=".9"/><path d="M${x - s * 0.25} ${y - s * 0.4} L${x} ${y - s * 0.75}" stroke="#fff" stroke-width=".7" opacity=".8"/>`;
  const flower = (x, y, r, col, mid) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) =>
    `<ellipse cy="${-r * 0.55}" rx="${r * 0.42}" ry="${r * 0.55}" transform="rotate(${a})" fill="${col}" stroke="${shade(col, -0.35)}" stroke-width=".5"/>`).join('')}<circle r="${r * 0.28}" fill="${mid}"/></g>`;

  // ---------------------------------------------------------------- the roster

  const ROSTER = [
    {
      id: 'raiden', name: 'Raiden Shogun', element: 'Electro',
      skin: '#fdeee8', hair: '#4b3d93', hairStops: [[0, '#5b4cab'], [0.5, '#46398e'], [1, '#2f2869']], shineCol: '#9c8fe0',
      eyes: '#9a78e0', eyeTop: '#4f3794', eyeLow: '#f0d4ff', lash: '#2c1f4a',
      sleeve: '#e7e0f5', cuff: '#5b4aa6', sleeveStyle: 'wide', hands: '#fdeee8', legs: '#2c2450', shoes: '#211a3a',
      back: (c) => {
        // long hair, plus the braid swinging out behind her
        const pts = [[88, 100], [92, 108], [95, 116], [98, 124], [100, 132]];
        const braid = pts.map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${5.2 - i * 0.35}" ry="5.2" transform="rotate(-24 ${x} ${y})" fill="url(#hg-${c.id})" ${line(hairStroke(c))}/>`).join('');
        return `${longHair(c, 124)}${braid}
          <circle cx="101" cy="137" r="2.2" fill="#c43048"/><path d="M101 139 L99.5 146 M101 139 L102.5 146" stroke="#7d64c8" stroke-width="1.3" stroke-linecap="round"/>
          ${H(c, CROWN)}`;
      },
      bangs: (c) => fringe(c, [
        [35, 48, 33, 69, 10, -1], [43, 42, 41, 69, 10, 0], [51, 40, 50, 68, 10, 0], [59, 40, 60, 67, 9, 0],
        [67, 40, 69, 68, 10, 0], [75, 42, 78, 69, 10, 0], [84, 47, 87, 69, 9, 1],
        [31, 54, 30, 106, 11, -2], [89, 54, 93, 124, 10, 4], [86, 60, 84, 104, 7, 2],
      ]),
      front: () => `
        <g transform="translate(31 40) rotate(-28)">
          <path d="M3 4 L-19 -4 A22 22 0 0 1 0 -19 Z" fill="#6b52c4" stroke="#2f2270" stroke-width="1.1"/>
          <path d="M-17 -5 A20 20 0 0 1 -1 -17" fill="none" stroke="#b8a4f0" stroke-width="1"/>
          <path d="M3 4 L-15 -11 M3 4 L-8 -16 M3 4 L-18 -1" stroke="#9d88e8" stroke-width=".7"/>
          ${flower(-7, -6, 7.5, '#eef2ff', '#5a7ef0')}${flower(1, 1, 5, '#c9d6ff', '#5a7ef0')}
          <path d="M4 4 L8 18" stroke="#d8b460" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M8 18 L7 26 M8 18 L9.5 25" stroke="#d8b460" stroke-width="1.1"/></g>`,
      face: () => `<circle cx="41.5" cy="84.5" r=".8" fill="#5a3048"/>`,
      outfit: () => `${torso('#e9e3f6', '#9d92bd')}
        <path d="M46 92 L60 110 L74 92 Q60 89 46 92 Z" fill="#3b2f63"/>
        <path d="M44 92 L48.5 91.5 L62 110.5 L59 113 Z M76 92 L71.5 91.5 L58 110.5 L61 113 Z" fill="#f7f4fd" stroke="#b4a8d6" stroke-width=".8"/>
        <path d="M36 99 Q42 96 45 101 Q42 105 37 104 M84 99 Q78 96 75 101 Q78 105 83 104" fill="none" stroke="#c9bfe6" stroke-width="1"/>
        <path d="M38 108 L82 108 L83.4 115 L36.6 115 Z" fill="#3b2f63"/>
        <path d="M39 111.5 Q60 114.5 81 111.5" fill="none" stroke="#c43048" stroke-width="1.4"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#5b4aa6"/>
        ${bow(60, 95, '#c43048', '#8e1f33', 0.75)}`,
    },
    {
      id: 'nahida', name: 'Nahida', element: 'Dendro',
      skin: '#fff3ea', hair: '#eeeff0', hairStops: [[0, '#ffffff'], [0.5, '#e9ecec'], [0.7, '#cfe6b8'], [0.9, '#86c46e']], hairLine: '#aeb4b4', shineCol: '#ffffff',
      eyes: '#34a55a', eyeTop: '#1b5e35', eyeLow: '#c4f59a', lash: '#39433a', pupil: 'clover',
      sleeve: '#f3f2ea', cuff: '#6aa651', hands: '#fff3ea', legs: '#f1ede2', shoes: '#c9b98a',
      back: (c) => `
        ${H(c, 'M26 64 Q20 84 28 96 L92 96 Q100 84 94 64 Z')}
        ${H(c, 'M82 34 Q112 34 114 70 Q116 100 104 126 Q102 104 95 90 Q100 64 86 50 Z')}
        ${H(c, lock(96, 60, 108, 124, 8, -3))}
        ${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M34 76 L15 67 Q20 81 34 86 Z" fill="${c.skin}" ${line('#d9b8a8')}/>`),
      bangs: (c) => fringe(c, [
        [34, 50, 32, 73, 10, -2], [42, 44, 39, 71, 10, -1], [50, 42, 48, 71, 9, 0], [60, 44, 58.5, 80, 6.5, 0],
        [68, 42, 72, 71, 9, 1], [77, 44, 81, 70, 10, 1], [86, 50, 89, 71, 9, 2],
        [31, 56, 30, 98, 9, -2], [89, 56, 90, 98, 9, 2],
      ]),
      front: () => `
        <g transform="translate(87 36) rotate(20)">
          <path d="M0 6 Q-7 -8 0 -22 Q7 -8 0 6 Z" fill="#3f6a34" stroke="#d8b460" stroke-width="1.2"/>
          <path d="M0 3 Q-3 -8 0 -18 Q3 -8 0 3 Z" fill="#8ccf6a"/>
          <path d="M-2 2 Q-12 0 -13 -8 Q-6 -5 -2 -1 Z M2 2 Q12 0 13 -8 Q6 -5 2 -1 Z" fill="#4f8a3e" stroke="#d8b460" stroke-width=".8"/></g>
        <g transform="translate(29 56) rotate(-60)"><path d="M0 -9 Q7 -2 0 8 Q-7 -2 0 -9 Z" fill="#7cc36b" stroke="#3f7a33" stroke-width="1"/><path d="M0 -7 L0 6" stroke="#3f7a33" stroke-width=".7"/></g>`,
      outfit: (c) => `${torso('#f7f6ef', '#bdb8a8')}
        <path d="M36 118 Q60 126 84 118 L85 124 Q60 132 35 124 Z" fill="#8cc46e"/>
        <path d="M44 92 Q60 88 76 92 L72 108 Q60 112 48 108 Z" fill="#2c4a2c" stroke="#d8b460" stroke-width="1"/>
        <path d="M52 91 L60 99 L68 91" fill="none" stroke="#d8b460" stroke-width="1"/>
        ${gem(60, 103, 4.2, '#7cd06a')}
        <path d="M60 108 L60 119" stroke="#d8d2c0" stroke-width="1"/>`,
    },
    {
      id: 'hutao', name: 'Hu Tao', element: 'Pyro',
      skin: '#fdece2', hair: '#4a2b26', hairStops: [[0, '#56332c'], [0.55, '#46281f'], [1, '#8a2c24']], shineCol: '#a0685a',
      eyes: '#e0402f', eyeTop: '#851612', eyeLow: '#ffb070', lash: '#2a1512', pupil: 'plum',
      sleeve: '#3a2622', cuff: '#1c1210', hands: '#fdece2', legs: '#f2ece6', shoes: '#241a1a',
      back: (c) => `
        ${H(c, lock(30, 58, 14, 144, 17, -7) + ' ' + lock(90, 58, 106, 144, 17, 7))}
        ${H(c, 'M26 64 Q20 86 28 100 L92 100 Q100 86 94 64 Z')}
        ${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [35, 47, 32, 71, 10, -2], [44, 44, 41, 71, 10, -1], [52, 44, 51, 72, 9, 0], [60, 44, 61.5, 80, 6.5, 0],
        [68, 44, 71, 71, 9, 1], [77, 45, 80, 70, 10, 1], [85, 48, 88, 71, 9, 2],
        [31, 52, 28, 104, 11, -2], [89, 52, 92, 104, 11, 2],
      ]),
      front: () => `<g transform="rotate(-3 60 30)">
        <path d="M36 39 Q35 22 42 18 Q60 13 78 18 Q85 22 84 39 Z" fill="#3b2622" stroke="#140c0b" stroke-width="1.3"/>
        <path d="M42 18 Q60 23 78 18" fill="none" stroke="#140c0b" stroke-width="1"/>
        <ellipse cx="60" cy="39" rx="39" ry="7" fill="#3b2622" stroke="#140c0b" stroke-width="1.3"/>
        <ellipse cx="60" cy="37" rx="31" ry="3.2" fill="#2a1a17"/>
        <path d="M55 22 L65 22 L68 28 L65 35 L55 35 L52 28 Z" fill="#d8b46a" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M57 26 Q63 24.5 62.6 28.5 Q61.6 31.6 57.8 31.2 M60 24 L60 33.5" fill="none" stroke="#2a1a17" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M78 22 Q86 12 96 10 M86 16 Q90 20 94 19" fill="none" stroke="#4a2a1a" stroke-width="1.2"/>
        ${flower(79, 24, 7, '#e0383a', '#ffd36a')}${flower(88, 20, 6, '#e0383a', '#ffd36a')}${flower(85, 31, 5, '#d02e32', '#ffd36a')}
        <path d="M90 34 L91 52" stroke="#2a1a17" stroke-width="1.2"/><circle cx="91" cy="44" r="1.8" fill="#c0392b"/>
        <path d="M89 52 L88.5 60 M91 52 L91 61 M93 52 L93.5 60" stroke="#2a1a17" stroke-width="1.3" stroke-linecap="round"/></g>`,
      outfit: () => `
        <path d="M37 116 L31 136 Q40 134 44 126 Z M83 116 L89 136 Q80 134 76 126 Z" fill="#3a2622" stroke="#1c1210" stroke-width="1.2" stroke-linejoin="round"/>
        ${torso('#3a2622', '#1c1210')}
        <path d="M44 93 L60 106 L76 93 L73 90 Q60 87 47 90 Z" fill="#241715"/>
        <path d="M50 88 L50 96 Q60 100 70 96 L70 88 Q60 86 50 88 Z" fill="#b8362c" stroke="#6e1a14" stroke-width="1"/>
        <path d="M56 94 L64 94 M60 91.5 L60 97" stroke="#1c1210" stroke-width="1.3"/>
        <path d="M60 106 L60 126" stroke="#8a2c24" stroke-width="1.3"/>
        <path d="M55 107 Q60 103 65 107 Q64 113 60 114 Q56 113 55 107 Z" fill="#d8b46a" stroke="#8a6a2a" stroke-width=".9"/>
        <path d="M36 120 Q60 128 84 120" fill="none" stroke="#8a2c24" stroke-width="2"/>`,
      extra: () => `<g class="buddy">
        <path d="M6 116 Q3 98 14 95 Q26 96 25 110 Q24 119 20 115 Q16 121 13 115 Q9 120 6 116 Z" fill="#fffaf4" stroke="#c9b6ae" stroke-width="1.1"/>
        <path d="M24 104 Q31 99 30 108" fill="#fffaf4" stroke="#c9b6ae" stroke-width="1"/>
        <circle cx="11.5" cy="104" r="1.5" fill="#3a2630"/><circle cx="18.5" cy="104" r="1.5" fill="#3a2630"/>
        <ellipse cx="15" cy="109" rx="2.2" ry="1.8" fill="#e05050"/>
        <ellipse cx="9" cy="107" rx="1.8" ry="1" fill="#ffa0a0" opacity=".6"/><ellipse cx="21" cy="107" rx="1.8" ry="1" fill="#ffa0a0" opacity=".6"/></g>`,
    },
    {
      id: 'ganyu', name: 'Ganyu', element: 'Cryo',
      skin: '#fdefe9', hair: '#a8c7f0', hairStops: [[0, '#c6dcf8'], [0.45, '#a3c2ee'], [1, '#4f7fd6']], hairLine: '#5f7fb4', shineCol: '#ffffff',
      eyes: '#8a62c8', eyeTop: '#43307e', eyeLow: '#f3a27c', lash: '#2f2340',
      sleeve: '#1f1f2c', cuff: '#1f1f2c', hands: '#fdefe9', legs: '#1f1f2c', shoes: '#141824',
      back: (c) => `
        ${H(c, 'M27 64 Q20 90 30 108 L90 108 Q100 90 93 64 Z')}
        ${H(c, CROWN)}`,
      ears: () => both(`
        <path d="M42 38 Q39 25 29 24 Q18 24 17 33 Q17 41 23 44 Q21 36 25 32 Q30 29 34 34 Q36 37 37 42 Z" fill="#521d27" stroke="#1e080c" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="M24 26 Q21 29 22.5 33 M30 24.6 Q28 28 29.6 31.4 M36.6 29 Q34 31 34.6 34.4" fill="none" stroke="#c43a42" stroke-width="1.4"/>`),
      bangs: (c) => fringe(c, [
        [35, 48, 32, 72, 10, -2], [43, 43, 40, 70, 10, -1], [51, 41, 49, 72, 9, 0], [60, 44, 60.5, 81, 6.5, 0],
        [67, 41, 71, 72, 9, 1], [76, 43, 80, 70, 10, 1], [85, 48, 88, 72, 9, 2],
      ]) + both(H(c, 'M31 54 Q23 70 29 82 Q35 93 27 104 Q22 114 29 121 Q31 115 35 114 Q30 108 35 100 Q41 90 37 79 Q33 68 38 57 Z')
        + H(c, 'M29 121 Q24 116 27 110 Q29 116 34 115 Z')),
      front: (c) => H(c, 'M58 24 Q50 12 58 6 Q55 13 63 22 Z'),
      outfit: () => `${torso('#1f1f2c', '#0c0c14')}
        <path d="M42 93 Q46 90 50 91 L47 100 Z M78 93 Q74 90 70 91 L73 100 Z" fill="#fdefe9"/>
        <path d="M49 90 Q60 94 71 90 L69 98 Q60 102 51 98 Z" fill="#f4f0e6" stroke="#b8ae96" stroke-width=".9"/>
        <path d="M54 96 Q54 104 60 105 Q66 104 66 96 Q60 93 54 96 Z" fill="#e5c15a" stroke="#9c7c2e" stroke-width=".9"/>
        <path d="M54.5 99 L65.5 99" stroke="#9c7c2e" stroke-width=".8"/><circle cx="60" cy="102.5" r="1" fill="#6b4e14"/>
        <path d="M56 110 L64 110 L66 127 L54 127 Z" fill="#f4f0e6" stroke="#d4b064" stroke-width="1"/>
        ${gem(38, 96, 4, '#bfe6f5', '#ffffff')}${gem(82, 96, 4, '#bfe6f5', '#ffffff')}`,
    },
    {
      id: 'yae', name: 'Yae Miko', element: 'Electro',
      skin: '#fff1ec', hair: '#f1a2ae', hairStops: [[0, '#f7b6c0'], [0.5, '#ef9aa8'], [1, '#e07f90']], hairLine: '#b8606f', shineCol: '#ffffff',
      eyes: '#9467d6', eyeTop: '#523688', eyeLow: '#e8ccff', lash: '#4a2438',
      sleeve: '#faf6f4', cuff: '#c73a4d', sleeveStyle: 'wide', hands: '#fff1ec', legs: '#2a2230', shoes: '#1c1620',
      back: (c) => `
        <g fill="none" stroke="#d8b460" stroke-width="2.4" stroke-linecap="round">
          <path d="M30 32 Q60 6 90 32"/>${both('<path d="M40 21 Q33 15 36 8 Q38 13 43 14 M47 16 Q44 9 48 4"/>')}</g>
        ${longHair(c, 140, 2)}
        ${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M38 42 Q24 38 6 46 Q20 60 36 58 Z" fill="${c.hair}" ${line(hairStroke(c))}/>
        <path d="M35 45 Q24 43 13 48 Q23 55 34 54 Z" fill="#fbe0e6"/>`),
      bangs: (c) => fringe(c, [
        [34, 48, 30, 76, 10, -3], [42, 42, 38, 75, 10, -2], [50, 40, 47, 74, 9, -1], [58, 42, 56.5, 81, 7, 1],
        [65, 42, 68, 76, 8, 2], [73, 42, 77, 74, 10, 2], [82, 46, 87, 76, 10, 3],
        [31, 54, 29, 110, 11, -2], [89, 54, 91, 110, 11, 2],
      ]),
      front: () => both(`<path d="M27 88 L27 94" stroke="#d8b460" stroke-width="1.2"/>
        <circle cx="27" cy="88" r="1.8" fill="#d8b460"/>${gem(27, 99, 4.2, '#8a5ad6')}`),
      face: () => both(`<path d="M40 72 Q37.5 71.5 36 69" fill="none" stroke="#d9445f" stroke-width="1.3" stroke-linecap="round"/>`),
      outfit: () => `${torso('#faf6f4', '#c9bcb8')}
        <path d="M49 86 L71 86 L72 96 Q60 99 48 96 Z" fill="#faf6f4" stroke="#c9bcb8" stroke-width="1"/>
        <path d="M48 94 Q60 97 72 94" fill="none" stroke="#c73a4d" stroke-width="1.2"/>
        <circle cx="60" cy="106" r="6.5" fill="#d8b460" stroke="#8a6a2a" stroke-width=".9"/>
        ${flower(60, 106, 9, '#6b4ab8', '#d8b460')}
        <path d="M37 114 L83 114 L85 124 Q60 132 35 124 Z" fill="#c73a4d" stroke="#7e1d2c" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="M41 119 L46 124 M51 120 L56 126 M64 120 L69 126 M74 119 L79 124" stroke="#f2d0d6" stroke-width=".9" opacity=".7"/>`,
    },
    {
      id: 'ayaka', name: 'Kamisato Ayaka', element: 'Cryo',
      skin: '#fff2ec', hair: '#dfe6f2', hairStops: [[0, '#f2f5fa'], [1, '#c3cee2']], hairLine: '#8e9ab4', shineCol: '#ffffff',
      eyes: '#5f84bc', eyeTop: '#2b4270', eyeLow: '#d3e4f6', lash: '#27304a',
      sleeve: '#1f2a4a', cuff: '#9cc4e8', sleeveStyle: 'wide', hands: '#fff2ec', legs: '#2d3f6b', shoes: '#1f2c4d',
      back: (c) => `
        ${H(c, 'M72 28 Q100 34 100 74 Q99 102 93 122 Q88 110 86 98 Q90 68 74 40 Z')}
        ${H(c, 'M26 64 Q22 86 29 98 L91 98 Q98 86 94 64 Z')}
        ${H(c, CROWN)}`,
      bangs: (c) => {
        // blunt hime-cut fringe with small notches along the edge
        const notch = [88, 80, 72, 64, 56, 48, 40].map((x) => `L${x} 67.5 L${x - 2} 64.5 L${x - 4} 67.5`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 67.5 ${notch} L29 67.5 Z`)
          + H(c, 'M44 67 L44.6 57 M54 67 L54.2 56 M66 67 L65.8 56 M76 67 L75.4 57', 'fill="none" stroke-opacity=".5" stroke-width=".8"')
          + both(`${H(c, 'M29 54 L28.5 100 L33 96 L37.5 100 L38 58 Z')}
            <path d="M30.5 92 L29.5 106 L36.5 106 L35.5 92 Z" fill="#f7f9fc" stroke="#b9c3d8" stroke-width=".8"/>
            <path d="M31 97 L31 105 M33 97 L33 105.5 M35 97 L35 105" stroke="#d5dceb" stroke-width=".6"/>
            <path d="M33 88 Q27 83 26.5 87.5 Q27.5 92 33 89 Q38.5 92 39.5 87.5 Q39 83 33 88 Z" fill="#d6344a" stroke="#8e1f33" stroke-width=".8"/>
            <circle cx="33" cy="88.6" r="1.5" fill="#f2c14e"/>
            <path d="M31.5 90 Q29 95 30 100 M34.5 90 Q37 95 36 100" fill="none" stroke="#d6344a" stroke-width="1"/>`);
      },
      front: () => `
        <path d="M36 24 Q60 6 84 24 L80 30 Q60 17 40 30 Z" fill="#1c1c2a" stroke="#d8b460" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M36 24 L28 16 L32 26 Z M84 24 L92 16 L88 26 Z" fill="#1c1c2a" stroke="#d8b460" stroke-width="1"/>
        <circle cx="60" cy="16" r="3.2" fill="#d8b460" stroke="#8a6a2a" stroke-width=".8"/><circle cx="60" cy="16" r="1.4" fill="#eef4ff"/>`,
      outfit: () => `${torso('#1f2a4a', '#0e1630')}
        <path d="M44 93 L38 84 L48 88 Z M76 93 L82 84 L72 88 Z" fill="#1f2a4a" stroke="#d8b460" stroke-width="1"/>
        <path d="M46 93 Q60 90 74 93 L72 112 Q60 116 48 112 Z" fill="#23232e" stroke="#d8b460" stroke-width=".9"/>
        <path d="M50 94 Q60 98 70 94" fill="none" stroke="#d8b460" stroke-width="1.4"/>
        <path d="M60 97 L58 102 L60 104 L62 102 Z" fill="#d8b460"/>
        <circle cx="60" cy="108" r="3" fill="none" stroke="#d8b460" stroke-width="1"/>
        <path d="M36 116 L84 116 L85 124 Q60 132 35 124 Z" fill="#eef2f8" stroke="#9aa9c6" stroke-width="1"/>
        <path d="M42 120 Q48 118 50 123 M64 121 Q70 119 72 124" fill="none" stroke="#6f99cc" stroke-width="1"/>`,
    },
    {
      id: 'furina', name: 'Furina', element: 'Hydro',
      skin: '#fff1eb', hair: '#f2f5fb', hairStops: [[0, '#ffffff'], [0.55, '#eaf0fa'], [1, '#a9cdf2']], hairLine: '#8da3c4', shineCol: '#ffffff',
      eyes: '#3f7fd6', eyes2: '#7fb9f5', eyeTop: '#1b3c82', eyeLow: '#c4e6ff', lash: '#1e2a4a', pupil: 'drop',
      sleeve: '#26336b', cuff: '#f3f5fa', hands: '#ffffff', legs: '#f0f1f6', shoes: '#1a2750',
      back: (c) => `
        ${H(c, 'M26 64 Q18 88 26 102 L94 102 Q102 88 94 64 Z')}
        ${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [35, 46, 31, 72, 11, -3], [43, 42, 40, 71, 10, -1], [52, 41, 51, 75, 9, 1], [60, 43, 63, 79, 7, 1],
        [68, 42, 72, 71, 9, 2], [77, 43, 82, 71, 10, 2], [86, 48, 90, 72, 9, 2],
        [31, 55, 27, 98, 12, -4], [89, 55, 93, 98, 12, 4],
      ]) + `<path d="${lock(40, 42, 36, 71, 7, -1)} ${lock(33, 62, 27, 96, 5, -3)} ${lock(87, 62, 93, 96, 5, 3)}" fill="#86bff2" opacity=".85"/>`
        + H(c, 'M26 94 Q20 104 30 106 Q35 102 31 98 Q29 101 27 99 Z M94 94 Q100 104 90 106 Q85 102 89 98 Q91 101 93 99 Z')
        + H(c, 'M50 24 Q42 12 50 4 Q48 12 56 22 Z'),
      front: () => `<g transform="rotate(16 80 26)">
        <path d="M71 29 L70 10 Q80 7 90 10 L89 29 Z" fill="#1c2a5e" stroke="#0c1530" stroke-width="1.2"/>
        <rect x="70.4" y="21" width="19" height="4" fill="#5d93e0"/><rect x="70.2" y="18" width="19.4" height="1.4" fill="#a9d0ff"/>
        <ellipse cx="80" cy="30" rx="18" ry="4" fill="#1c2a5e" stroke="#0c1530" stroke-width="1.2"/>
        <path d="M88 16 Q104 26 100 56 Q96 40 86 24 Z" fill="#35307a" stroke="#1c1850" stroke-width="1"/>
        <path d="M90 20 Q99 30 98 48" fill="none" stroke="#6a64c8" stroke-width=".8"/>
        <circle cx="89" cy="23" r="2.4" fill="#fff" stroke="#9fb4d8" stroke-width=".6"/></g>`,
      outfit: () => `${torso('#26336b', '#10194a')}
        <path d="M50 92 L60 88 L70 92 L66 118 L54 118 Z" fill="#3a3a8c" stroke="#1c1850" stroke-width=".9"/>
        <path d="M52 96 Q56 100 52 104 Q56 108 53 112 M68 96 Q64 100 68 104 Q64 108 67 112" fill="none" stroke="#6a64c8" stroke-width="1"/>
        ${gem(60, 100, 4.6, '#4cb6f1')}
        <path d="M74 101 l4 -3 0 6 Z M74 101 l-4 -3 0 6 Z" fill="#5d93e0" stroke="#0c1530" stroke-width=".6"/><circle cx="74" cy="101" r="1.4" fill="#d8b460"/>
        <path d="M36 120 Q60 128 84 120" fill="none" stroke="#d8b460" stroke-width="1.3"/>`,
    },
    {
      id: 'yelan', name: 'Yelan', element: 'Hydro',
      skin: '#fcefe6', hair: '#28325a', hairStops: [[0, '#303a62'], [0.5, '#27305a'], [1, '#3b5cb4']], shineCol: '#6f86c4',
      eyes: '#2bb3a0', eyeTop: '#0e5a52', eyeLow: '#b4f5e5', lash: '#141a2e',
      sleeve: '#1b2240', cuff: '#101a33', hands: '#fcefe6', legs: '#1b2240', shoes: '#101a33',
      back: (c) => `
        ${H(c, 'M26 62 Q20 90 30 104 L90 104 Q100 90 94 62 Z')}
        ${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [86, 46, 88, 70, 9, 1], [80, 40, 72, 70, 10, -1], [72, 38, 60, 71, 11, -2], [63, 38, 49, 71, 12, -2],
        [54, 40, 39, 72, 12, -2], [45, 43, 33, 78, 12, -3], [36, 48, 30, 82, 10, -2],
        [31, 54, 31, 104, 13, -2], [89, 54, 89, 102, 13, 2],
      ]),
      front: () => `
        <path d="M95 84 L95 90" stroke="#d4b064" stroke-width="1"/>
        <rect x="92" y="90" width="6" height="6" rx="1.4" fill="#fff" stroke="#8aa0c8" stroke-width=".8" transform="rotate(12 95 93)"/>
        <g fill="#2f5fb3"><circle cx="93.8" cy="91.8" r=".7"/><circle cx="95.2" cy="93.2" r=".7"/><circle cx="96.5" cy="94.6" r=".7"/></g>`,
      outfit: () => `${torso('#1b2240', '#0b1024')}
        <path d="M46 92 Q60 88 74 92 L68 110 Q60 113 52 110 Z" fill="#2a2a38"/>
        <path d="M50 91.5 Q60 96 70 91.5" fill="none" stroke="#f4f4f4" stroke-width="2.2" stroke-dasharray="1.6 .6"/>
        ${gem(60, 99, 3.2, '#2bb3a0')}
        <path d="M60 102 L57.5 110 L60 113 L62.5 110 Z" fill="#8fe6f0" stroke="#fff" stroke-width=".6"/>
        <path d="M30 118 Q26 104 34 95 Q46 86 54 91 Q46 98 44 108 L42 118 Q38 122 35 118 Q32 122 30 118 Z
                 M90 118 Q94 104 86 95 Q74 86 66 91 Q74 98 76 108 L78 118 Q82 122 85 118 Q88 122 90 118 Z"
              fill="#f8f7f3" stroke="#cbc6bb" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="M36 100 q2 2 0 4 M84 100 q-2 2 0 4 M34 110 q2 2 0 4 M86 110 q-2 2 0 4" fill="none" stroke="#d9d4c8" stroke-width=".9"/>`,
    },
  ];

  // Paimon isn't a session companion: she floats at the top of the strip and reports on the machine.
  const PAIMON = {
    id: 'paimon', name: 'Paimon', element: 'Anemo',
    skin: '#fff1ea', hair: '#f4f4f8', hairStops: [[0, '#ffffff'], [0.6, '#f1f1f6'], [1, '#dcdfea']], hairLine: '#a6a9bb', shineCol: '#ffffff',
    eyes: '#4a5577', eyeTop: '#1c2034', eyeLow: '#b3bdd8', lash: '#262838', brow: '#d6d8e2',
    sleeve: '#f6f6fa', cuff: '#23263a', hands: '#fff1ea', legs: '#f4f4f8', shoes: '#f4f4f8',
    back: (c) => `
      <path d="M36 110 Q24 126 30 140 L60 128 L90 140 Q96 126 84 110 Z" fill="#1d2034" stroke="#0c0e1a" stroke-width="1.2" stroke-linejoin="round"/>
      <g fill="#8fa2ff">${[[38, 128], [48, 124], [74, 125], [83, 131], [44, 134]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9"/>`).join('')}</g>
      ${H(c, 'M27 60 Q20 84 30 100 L90 100 Q100 84 93 60 Z')}
      ${both(H(c, lock(31, 60, 9, 66, 14, -4)) + H(c, lock(31, 72, 11, 90, 13, -3)) + H(c, lock(34, 82, 20, 104, 11, -2)))}
      ${H(c, CROWN)}`,
    bangs: (c) => fringe(c, [
      [34, 48, 30, 73, 10, -3], [42, 42, 40, 72, 10, -1], [51, 40, 49, 70, 9, 0], [57, 42, 62, 79, 6.5, 1],
      [66, 40, 72, 70, 10, 1], [76, 42, 81, 70, 10, 2], [85, 47, 90, 72, 9, 3],
      [31, 54, 27, 112, 12, -4], [89, 54, 93, 112, 12, 4], [36, 62, 38, 104, 7, 1],
    ]),
    front: () => `
      <g class="halo" fill="none" stroke="#d9956a" stroke-width="1.8" stroke-linecap="round">
        <path d="M46 22 Q60 15 74 22"/><path d="M60 18 L60 6 M60 12 Q56 10 54.5 6 M60 12 Q64 10 65.5 6"/>
        <path d="M51 20 Q48 15 44 14 M69 20 Q72 15 76 14"/></g>
      <path d="M85 38 Q86.5 45 93 46.5 Q86.5 48 85 55 Q83.5 48 77 46.5 Q83.5 45 85 38 Z" fill="#1e2136" stroke="#5a6190" stroke-width=".8"/>
      <path d="M84.2 42 L84.2 46" stroke="#8fa2ff" stroke-width=".8" stroke-linecap="round"/>`,
    outfit: () => `${torso('#f7f7fb', '#b9bccb')}
      <path d="M38 94 Q60 86 82 94 Q86 101 80 105 Q70 100 60 104 Q50 100 40 105 Q34 101 38 94 Z" fill="#1d2034" stroke="#0c0e1a" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M72 101 Q80 110 76 120 L70 118 Q72 110 66 103 Z" fill="#1d2034" stroke="#0c0e1a" stroke-width="1"/>
      <path d="M44 98 Q60 93 76 98" fill="none" stroke="#39406a" stroke-width="1"/>
      <path d="M36 120 Q60 128 84 120 L85 124 Q60 132 35 124 Z" fill="#e1c27c"/>`,
  };

  // Paimon's moods, driven by CPU / memory / disk load (see main.js sysMood).
  const SYS_STATES = {
    calm:     { label: 'All calm',     color: '#7fd1a8', eyes: 'open',   mouth: 'smile', brows: 'neutral',  arms: 'wave',  fx: '',      anim: 'float' },
    busy:     { label: 'Busy',         color: '#6fc3ff', eyes: 'focus',  mouth: 'flat',  brows: 'determined', arms: 'down', fx: '',     anim: 'float' },
    strained: { label: 'Under load',   color: '#f4b860', eyes: 'wide',   mouth: 'wavy',  brows: 'worried',  arms: 'cheer', fx: 'emoji:⚠️', anim: 'float-fast', sweat: true },
    critical: { label: 'Overloaded!',  color: '#ff5d73', eyes: 'spiral', mouth: 'o',     brows: 'worried',  arms: 'cheer', fx: 'bang',  anim: 'wobble', sweat: true, attention: true },
  };

  // What each session state looks like.
  const STATES = {
    ready:      { label: 'Ready',               color: '#7fd1a8', eyes: 'open',       mouth: 'smile',  brows: 'neutral',    arms: 'wave',  fx: 'wave',      anim: 'bob' },
    thinking:   { label: 'Thinking',            color: '#b69cff', eyes: 'lookup',     mouth: 'cat',    brows: 'neutral',    arms: 'down',  fx: 'thought',   anim: 'bob' },
    bash:       { label: 'Running bash',        color: '#f4b860', eyes: 'determined', mouth: 'grit',   brows: 'determined', arms: 'type',  fx: 'terminal',  anim: 'bob-fast' },
    editing:    { label: 'Editing',             color: '#6fc3ff', eyes: 'focus',      mouth: 'tongue', brows: 'determined', arms: 'type',  fx: 'emoji:✏️',  anim: 'bob-fast' },
    reading:    { label: 'Reading',             color: '#8fd3c7', eyes: 'down',       mouth: 'flat',   brows: 'neutral',    arms: 'type',  fx: 'emoji:🔍',  anim: 'bob' },
    web:        { label: 'Browsing the web',    color: '#6fc3ff', eyes: 'open',       mouth: 'o',      brows: 'neutral',    arms: 'down',  fx: 'emoji:🌐',  anim: 'bob' },
    agent:      { label: 'Sent a subagent',     color: '#b69cff', eyes: 'happy',      mouth: 'smile',  brows: 'neutral',    arms: 'wave',  fx: 'emoji:📨',  anim: 'bob' },
    planning:   { label: 'Planning',            color: '#b69cff', eyes: 'lookup',     mouth: 'smile',  brows: 'neutral',    arms: 'type',  fx: 'emoji:📝',  anim: 'bob' },
    tool:       { label: 'Using a tool',        color: '#8fb7d3', eyes: 'focus',      mouth: 'flat',   brows: 'neutral',    arms: 'type',  fx: 'emoji:🔧',  anim: 'bob' },
    permission: { label: 'Needs permission',    color: '#ff5d73', eyes: 'wide',       mouth: 'o',      brows: 'worried',    arms: 'cheer', fx: 'bang',      anim: 'jump',   sweat: true, attention: true },
    question:   { label: 'Has a question',      color: '#ffb347', eyes: 'open',       mouth: 'wavy',   brows: 'worried',    arms: 'wave',  fx: 'question',  anim: 'tilt',   sweat: true, attention: true },
    done:       { label: 'Done · your turn',    color: '#7fd1a8', eyes: 'happy',      mouth: 'open',   brows: 'neutral',    arms: 'cheer', fx: 'sparkles',  anim: 'hop',    attention: true },
    idle:       { label: 'Idle',                color: '#9aa3b5', eyes: 'closed',     mouth: 'osmall', brows: 'neutral',    arms: 'down',  fx: 'zzz',       anim: 'sway' },
    compacting: { label: 'Compacting context',  color: '#c0a3ff', eyes: 'spiral',     mouth: 'wavy',   brows: 'worried',    arms: 'down',  fx: 'emoji:🌀',  anim: 'wobble' },
  };

  // ---------------------------------------------------------------- arms

  function arms(c, pose) {
    const wide = c.sleeveStyle === 'wide';
    const sl = c.sleeve, so = shade(sl, -0.4), cuff = c.cuff || sl, hand = c.hands, ho = shade(c.skin, -0.3);
    const arm = (cx, cy, rot, hx, hy) => `
      <ellipse cx="${cx}" cy="${cy}" rx="${wide ? 7.8 : 6}" ry="${wide ? 12 : 11}" transform="rotate(${rot} ${cx} ${cy})" fill="${sl}" stroke="${so}" stroke-width="1.2"/>
      <circle cx="${(cx + hx * 2) / 3}" cy="${(cy + hy * 2) / 3}" r="${wide ? 5 : 4}" fill="${cuff}" opacity="${c.cuff ? 1 : 0}"/>
      <circle cx="${hx}" cy="${hy}" r="4.4" fill="${hand}" stroke="${ho}" stroke-width="1"/>`;
    const down = arm(40, 106, 18, 36, 117);
    const up = arm(35, 88, -40, 27, 79);
    const type = arm(44, 108, -40, 50, 116);
    switch (pose) {
      case 'wave': return `${down}<g ${MIRROR}><g class="wave-arm">${up}</g></g>`;
      case 'cheer': return both(`<g class="cheer-arm">${up}</g>`);
      case 'type': return both(type);
      default: return both(down);
    }
  }

  // ---------------------------------------------------------------- face

  // Left eye (viewer's left); the right one is the same drawing mirrored.
  const EX = 47, EY = 74;
  const FACE = 'M32 60 C32 36 88 36 88 60 C88 80 76 93 60 95.5 C44 93 32 80 32 60 Z';
  const EYE_SHAPE = 'M39.5 71.2 Q45 65.4 55.4 67.8 L55.6 78.4 Q48 83.4 40.6 79.6 Z';
  const LASH = 'M37.6 71.6 L35.6 69.4 L39 70.6 Q45.5 63.6 56 67 L55.8 69.3 Q46 66.4 40.2 72.8 Z';

  function pupilMark(c, cx, cy) {
    switch (c.pupil) {
      case 'clover': // Nahida
        return [[0, -1.5], [1.5, 0], [0, 1.5], [-1.5, 0]].map(([dx, dy]) =>
          `<circle cx="${cx + dx}" cy="${cy + dy}" r="1.2" fill="#d9f28a"/>`).join('') + `<circle cx="${cx}" cy="${cy}" r=".7" fill="#2f6a33"/>`;
      case 'plum': // Hu Tao
        return [0, 72, 144, 216, 288].map((a) =>
          `<circle cx="${cx}" cy="${cy - 1.4}" r="1.05" transform="rotate(${a} ${cx} ${cy})" fill="#4a0c0c"/>`).join('');
      default: return '';
    }
  }

  function highlight(c, x, y) {
    if (c.pupil === 'drop') { // Furina's water-drop shine
      return `<path d="M${x} ${y - 3} Q${x + 2.1} ${y} ${x} ${y + 1.4} Q${x - 2.1} ${y} ${x} ${y - 3} Z" fill="#fff"/>`;
    }
    return `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="2.4" fill="#fff"/>`;
  }

  function eye(kind, c, grad) {
    const lashCol = c.lash || INK;
    const top = c.eyeTop || shade(c.eyes, -0.5);
    const lash = `stroke="${lashCol}" stroke-width="2.1" stroke-linecap="round" fill="none"`;
    const iris = (dx, dy) => `
      <g clip-path="url(#eclip)">
        <path d="${EYE_SHAPE}" fill="#fff"/>
        <ellipse cx="${EX + 0.6 + dx}" cy="${EY + 1 + dy}" rx="5.5" ry="7.2" fill="url(#${grad})"/>
        <ellipse cx="${EX + 0.6 + dx}" cy="${EY + 0.4 + dy}" rx="2.5" ry="3.5" fill="${top}" opacity=".7"/>
        ${pupilMark(c, EX + 0.6 + dx, EY + 1 + dy)}
        ${highlight(c, EX + 2.8 + dx, EY - 1.8 + dy)}
        <circle cx="${EX - 1.6 + dx}" cy="${EY + 4.4 + dy}" r="1.1" fill="#fff" opacity=".9"/>
        <path d="M40 70 Q47 66 56 68.5 L56 71 Q47 68.6 40 72.5 Z" fill="${top}" opacity=".35"/>
      </g>
      <path d="${LASH}" fill="${lashCol}"/>
      <path d="M43 80.8 Q48 82.4 53 80" fill="none" stroke="${lashCol}" stroke-width=".8" opacity=".55" stroke-linecap="round"/>`;
    switch (kind) {
      case 'open': return `<g class="blink">${iris(0, 0)}</g>`;
      case 'lookup': return `<g class="blink">${iris(0.8, -2.4)}</g>`;
      case 'focus':
      case 'down': {
        // heavy-lidded: the upper lid comes down over the iris
        const dy = kind === 'down' ? 1.5 : 0.3;
        return `<g clip-path="url(#eclip)"><path d="${EYE_SHAPE}" fill="#fff"/>
          <ellipse cx="${EX + 0.6}" cy="${EY + 2 + dy}" rx="5.5" ry="6.6" fill="url(#${grad})"/>
          <ellipse cx="${EX + 0.6}" cy="${EY + 2 + dy}" rx="2.4" ry="3" fill="${top}" opacity=".7"/>
          <circle cx="${EX + 2.6}" cy="${EY + 1.2 + dy}" r="1.3" fill="#fff"/>
          <path d="M36 60 L58 60 L58 ${EY + 0.5} Q47 ${EY - 1.5} 36 ${EY + 1.5} Z" fill="${c.skin}"/></g>
          <path d="M38 ${EY + 1.6} Q46 ${EY - 2.6} 56 ${EY + 0.4}" ${lash} stroke-width="2.4"/>
          <path d="M43 80.8 Q48 82.4 53 80" fill="none" stroke="${lashCol}" stroke-width=".8" opacity=".55"/>`;
      }
      case 'happy': return `<path d="M40 77 Q47 68.5 54.5 77" ${lash} stroke-width="2.6"/>`;
      case 'closed': return `<path d="M39.5 75 Q47 80.5 55 75" ${lash} stroke-width="2.2"/>
        <path d="M40.5 76 l-2.2 1.4" ${lash} stroke-width="1.3"/>`;
      case 'wide': return `
        <circle cx="${EX + 0.4}" cy="${EY}" r="7" fill="#fff" stroke="${lashCol}" stroke-width="1.6"/>
        <circle cx="${EX + 0.4}" cy="${EY + 0.5}" r="3.6" fill="url(#${grad})"/><circle cx="${EX + 0.4}" cy="${EY + 0.5}" r="1.6" fill="${top}"/>
        <circle cx="${EX + 1.9}" cy="${EY - 1.1}" r="1.2" fill="#fff"/>`;
      case 'determined': return `<path d="M${EX - 6} ${EY - 5} L${EX + 5} ${EY} L${EX - 6} ${EY + 5}" ${lash} stroke-width="2.6" stroke-linejoin="round"/>`;
      case 'spiral': return `<path d="M${EX} ${EY} m-5.5 0 a5.5 5.5 0 1 1 11 0 a4.4 4.4 0 1 1 -8.8 0 a3.3 3.3 0 1 1 6.6 0 a2.2 2.2 0 1 1 -4.4 0" ${lash} stroke-width="1.5"/>`;
      default: return '';
    }
  }

  function brow(kind, c) {
    const col = c.brow || shade(c.hair, c.hairLine ? -0.45 : -0.2);
    const d = { neutral: 'M41 64.5 Q46.5 62.6 52 63.8', worried: 'M41 64.2 Q46.5 63.8 52 60.6', determined: 'M41 61.6 Q46.5 62.4 52 65.4' }[kind];
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`;
  }

  function mouth(kind) {
    const ln = `fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
    switch (kind) {
      case 'smile': return `<path d="M56 83.4 Q60 86.4 64 83.4" ${ln}/>`;
      case 'open': return `<path d="M54 82 Q60 93 66 82 Z" fill="#8b2b3a" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M56.6 87 Q60 85 63.4 87 Q60 90.5 56.6 87 Z" fill="#ff8a9a"/>`;
      case 'o': return `<ellipse cx="60" cy="85" rx="2.8" ry="3.4" fill="#8b2b3a" stroke="${INK}" stroke-width="1.2"/>`;
      case 'osmall': return `<ellipse cx="60" cy="85" rx="1.6" ry="1.9" fill="#8b2b3a"/>`;
      case 'cat': return `<path d="M54 83 Q57 86.5 60 83 Q63 86.5 66 83" ${ln}/>`;
      case 'wavy': return `<path d="M53 85 Q55 83 57 85 T61 85 T65 85 T67 84.4" ${ln} stroke-width="1.5"/>`;
      case 'flat': return `<path d="M56 84.5 L64 84.5" ${ln}/>`;
      case 'grit': return `<rect x="54" y="82" width="12" height="5.5" rx="2.2" fill="#fff" stroke="${INK}" stroke-width="1.4"/>
        <path d="M54.5 84.8 L65.5 84.8 M58 82.5 V87 M62 82.5 V87" stroke="${INK}" stroke-width=".7"/>`;
      case 'tongue': return `<path d="M55 83 Q60 87 65 83" ${ln}/><path d="M61.5 84.6 Q64 90 66.5 84" fill="#ff8a9a" stroke="${INK}" stroke-width="1"/>`;
      default: return '';
    }
  }

  // ---------------------------------------------------------------- effects

  function effects(st) {
    const col = st.color;
    const bubble = (inner) => `<g class="fx-pop"><circle cx="98" cy="20" r="13" fill="${col}" stroke="#fff" stroke-width="2"/>
      <path d="M88 28 L84 38 L93 31 Z" fill="${col}"/>${inner}</g>`;
    let s = '';
    if (st.sweat) s += `<path class="sweat" d="M89 50 Q84 58 89 61 Q94 58 89 50 Z" fill="#9fdcff" stroke="#4aa3d8" stroke-width="1"/>`;
    const fx = st.fx || '';
    if (fx === 'bang') s += bubble(`<text x="98" y="27" text-anchor="middle" font-size="20" font-weight="900" fill="#fff" font-family="sans-serif">!</text>`);
    else if (fx === 'question') s += bubble(`<text x="98" y="27" text-anchor="middle" font-size="19" font-weight="900" fill="#fff" font-family="sans-serif">?</text>`);
    else if (fx === 'thought') s += `<g class="fx-float"><circle cx="84" cy="40" r="2.2" fill="#fff" stroke="${col}" stroke-width="1.2"/>
      <circle cx="89" cy="32" r="3.2" fill="#fff" stroke="${col}" stroke-width="1.2"/>
      <path d="M86 22 Q84 12 94 11 Q98 3 107 8 Q117 6 116 16 Q121 24 111 27 Q104 32 96 28 Q86 30 86 22 Z" fill="#fff" stroke="${col}" stroke-width="1.6"/>
      <circle class="dot d1" cx="94" cy="19" r="2.2" fill="${col}"/><circle class="dot d2" cx="101" cy="19" r="2.2" fill="${col}"/><circle class="dot d3" cx="108" cy="19" r="2.2" fill="${col}"/></g>`;
    else if (fx === 'terminal') s += `<g class="fx-float"><rect x="80" y="4" width="36" height="24" rx="4" fill="#1d2130" stroke="${col}" stroke-width="2"/>
      <circle cx="85" cy="9" r="1.3" fill="#ff6b6b"/><circle cx="89" cy="9" r="1.3" fill="#ffd36a"/><circle cx="93" cy="9" r="1.3" fill="#7fd1a8"/>
      <text x="84" y="23" font-size="10" font-weight="700" fill="#8dffb0" font-family="monospace">&gt;<tspan class="cursor">_</tspan></text></g>`;
    else if (fx === 'sparkles') s += [[18, 34, 1], [104, 30, 0.8], [106, 70, 0.6], [14, 76, 0.7], [96, 8, 0.6]].map(([x, y, k], i) =>
      `<path class="sparkle s${i}" d="M${x} ${y - 7 * k} Q${x} ${y} ${x + 7 * k} ${y} Q${x} ${y} ${x} ${y + 7 * k} Q${x} ${y} ${x - 7 * k} ${y} Q${x} ${y} ${x} ${y - 7 * k} Z" fill="#ffd76a" stroke="#fff" stroke-width=".6"/>`).join('');
    else if (fx === 'zzz') s += `<g fill="#b9c3ff" font-family="sans-serif" font-weight="800" stroke="#4b5694" stroke-width=".6">
      <text class="z z1" x="88" y="40" font-size="9">z</text><text class="z z2" x="96" y="28" font-size="12">Z</text><text class="z z3" x="104" y="14" font-size="15">Z</text></g>`;
    else if (fx === 'wave') s += `<g class="fx-pop" stroke="${col}" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M100 66 Q104 72 100 78"/><path d="M105 62 Q111 72 105 82"/></g>`;
    else if (fx.startsWith('emoji:')) s += `<g class="fx-float"><circle cx="98" cy="20" r="13" fill="#fff" stroke="${col}" stroke-width="2"/>
      <path d="M88 28 L84 38 L93 31 Z" fill="#fff" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="98" cy="20" r="11.5" fill="#fff"/>
      <text x="98" y="25" text-anchor="middle" font-size="14">${fx.slice(6)}</text></g>`;
    return s;
  }

  // ---------------------------------------------------------------- compose

  function defs(c) {
    const stops = (list) => list.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('');
    const iris = (id, col) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      ${stops([[0, c.eyeTop || shade(col, -0.5)], [0.45, col], [1, c.eyeLow || shade(col, 0.4)]])}</linearGradient>`;
    return `<defs>
      <linearGradient id="hg-${c.id}" gradientUnits="userSpaceOnUse" x1="0" y1="22" x2="0" y2="140">${stops(c.hairStops || [[0, c.hair], [1, c.hair]])}</linearGradient>
      ${iris(`ig-${c.id}`, c.eyes)}${iris(`ig2-${c.id}`, c.eyes2 || c.eyes)}
      <clipPath id="eclip"><path d="${EYE_SHAPE}"/></clipPath>
    </defs>`;
  }

  function drawCharacter(c, stateKey, opts = {}) {
    let st = STATES[stateKey] || SYS_STATES[stateKey] || STATES.ready;
    if (opts.fx !== undefined) st = { ...st, fx: opts.fx };
    if (opts.fxOnly) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" class="chibi"><g class="stage anim-${st.anim}">${effects(st)}</g></svg>`;
    }
    const call = (k) => (c[k] ? c[k](c) : '');
    const cheek = st.eyes === 'happy' || stateKey === 'permission' ? 0.6 : 0.35;
    const eyes = `${eye(st.eyes, c, `ig-${c.id}`)}<g ${MIRROR}>${eye(st.eyes, c, `ig2-${c.id}`)}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" class="chibi">${defs(c)}
      <ellipse class="shadow" cx="60" cy="143" rx="24" ry="4.5" fill="#000" opacity=".22"/>
      <g class="stage anim-${st.anim}">
        <g class="body-group">
          ${call('back')}
          ${c.id === 'paimon' ? '' : legs(c)}
          ${call('outfit')}
          ${call('ears')}
          <path d="${FACE}" fill="${c.skin}" stroke="${shade(c.skin, -0.28)}" stroke-width="1.1"/>
          ${both(`<ellipse cx="42" cy="83.5" rx="4.6" ry="2.1" fill="#ff8fa3" opacity="${cheek}"/>`)}
          <path d="M60.6 80.6 L59.8 81.8" stroke="${shade(c.skin, -0.3)}" stroke-width=".9" stroke-linecap="round"/>
          ${eyes}
          ${call('bangs')}
          ${ring(c)}
          ${call('front')}
          ${both(brow(st.brows, c))}
          ${call('face')}
          <g transform="translate(60 87.5) scale(.82) translate(-60 -84.5)">${mouth(st.mouth)}</g>
          ${arms(c, st.arms)}
        </g>
        ${call('extra')}
        ${effects(st)}
      </g>
    </svg>`;
  }

  const api = { ROSTER, STATES, PAIMON, SYS_STATES, ELEMENTS, drawCharacter, shade };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Archonthropic = api;
})(typeof window !== 'undefined' ? window : globalThis);
