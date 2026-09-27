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

  // Hair behind the head down to `y` (shoulder length at 100).
  const nape = (c, y = 100, w = 0) => H(c, `M${26 - w} 64 Q${20 - w} ${y - 14} ${28 - w} ${y} L${92 + w} ${y} Q${100 + w} ${y - 14} ${94 + w} 64 Z`);
  // A straight-across fringe of seven strands; `dx` sweeps the tips sideways, `len` makes them longer.
  const bangsList = (dx = 0, len = 0) => [
    [35, 48, 33 + dx, 70 + len, 10, -1], [43, 42, 41 + dx, 70 + len, 10, 0], [51, 40, 50 + dx, 69 + len, 10, 0], [59, 40, 60 + dx, 68 + len, 9, 0],
    [67, 40, 69 + dx, 69 + len, 10, 0], [75, 42, 78 + dx, 70 + len, 10, 0], [84, 47, 87 + dx, 70 + len, 9, 1],
  ];
  // Locks framing the face on both sides, ending at `y`.
  const sideLocks = (y = 106, w = 11) => [[31, 54, 29, y, w, -2], [89, 54, 91, y, w, 2]];
  // A braid of shrinking beads along the given points.
  const braid = (c, pts, r = 4.6) => pts.map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${r - i * 0.25}" ry="${r}" fill="url(#hg-${c.id})" ${line(hairStroke(c))}/>`).join('');
  const eyepatch = (d, fill, stroke) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1.1" stroke-linejoin="round"/>`;

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
    {
      id: 'aino', name: 'Aino', element: 'Hydro',
      skin: '#fff1ec', hair: '#dcbde6', hairStops: [[0, '#ead3f2'], [0.6, '#d6b4e4'], [1, '#bf98d6']], hairLine: '#9a74ae', shineCol: '#ffffff',
      eyes: '#8e9ed8', eyeTop: '#434d88', eyeLow: '#e8eeff', lash: '#3a2f4a',
      sleeve: '#f4f1f4', cuff: '#2d2a36', hands: '#fff1ec', legs: '#2d2a36', shoes: '#5a4636',
      back: (c) => `
        ${H(c, 'M48 26 Q44 8 60 7 Q76 8 72 26 Z')}
        <g fill="#e6d2a8" stroke="#8a7350" stroke-width="1"><circle cx="51" cy="10" r="5"/><circle cx="68" cy="8" r="5.6"/></g>
        <path d="M49 10 a2 2 0 1 1 3 1 M66 8 a2.4 2.4 0 1 1 3.6 1" fill="none" stroke="#8a7350" stroke-width=".9"/>
        ${longHair(c, 130)}
        ${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 48, 30, 74, 11, -3], [44, 42, 36, 72, 11, -2], [53, 40, 44, 70, 10, -2], [62, 40, 54, 66, 9, -1],
        [70, 41, 72, 70, 9, 1], [78, 43, 82, 71, 10, 1], [86, 48, 89, 72, 9, 2],
        [31, 54, 26, 118, 12, -3], [89, 54, 93, 118, 12, 3],
      ]),
      front: () => `
        <path d="M33 56 Q30 51 33.5 49 Q36 48 36.5 51 Q37.5 48.6 40 50 Q42 53 36.6 58 Z" fill="#e0405a" stroke="#8e1f33" stroke-width=".8"/>
        <path d="M32 62 L38 67 M38 62 L32 67" stroke="#2a2a3c" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M80 50 L86 47 M81 54 L87 51" stroke="#f2c14e" stroke-width="1.8" stroke-linecap="round"/>`,
      outfit: () => `${torso('#f4f1f4', '#b9b2c0')}
        <path d="M49 89 Q60 93 71 89 L71 93 Q60 97 49 93 Z" fill="#26232e"/><circle cx="60" cy="95" r="1.8" fill="#b9b2c0"/>
        <path d="M42 96 L50 94 L54 124 L36 122 Z M78 96 L70 94 L66 124 L84 122 Z" fill="#3a3448" stroke="#1f1b28" stroke-width=".9"/>
        <path d="M54 104 L66 104" stroke="#4cc2f1" stroke-width="1.6"/>`,
    },
    {
      id: 'aloy', name: 'Aloy', element: 'Cryo',
      skin: '#fbe5d6', hair: '#d4692c', hairStops: [[0, '#e07a38'], [0.6, '#cc6128'], [1, '#a84a1c']], shineCol: '#f6b07a',
      eyes: '#7aa84a', eyeTop: '#34541e', eyeLow: '#d6ecae', lash: '#4a2a1a',
      sleeve: '#8a6242', cuff: '#5c3f2a', hands: '#e2c09c', legs: '#5a4a3a', shoes: '#4a3424',
      back: (c) => `${nape(c, 104, 3)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 48, 30, 64, 10, -3], [44, 42, 38, 58, 10, -2], [76, 42, 82, 58, 10, 2], [84, 48, 90, 64, 10, 3],
      ], 'M28 66 C25 34 44 23 60 23 C76 23 95 34 92 66 C88 48 76 40 60 40 C44 40 32 48 28 66 Z')
        + both(braid(c, [[30, 70], [29, 79], [29, 88], [30, 97], [31, 106]], 4.4))
        + H(c, 'M40 40 Q60 30 80 40', 'fill="none" stroke-width="1.2" stroke-opacity=".5"'),
      front: () => `<path d="M88 64 L96 60 L95 70 Z" fill="#c8cdd4" stroke="#5a616a" stroke-width="1"/><circle cx="92.5" cy="64.5" r="1.4" fill="#4cc2f1"/>`,
      outfit: () => `${torso('#8a6242', '#4a3322')}
        <path d="M46 92 Q60 88 74 92 L72 104 Q60 108 48 104 Z" fill="#3aa0d8" stroke="#1f6a94" stroke-width=".9"/>
        <path d="M38 96 Q46 92 50 98 L46 124 L36 122 Z M82 96 Q74 92 70 98 L74 124 L84 122 Z" fill="#c9a882" stroke="#7a6040" stroke-width=".9"/>
        <path d="M40 112 L80 112" stroke="#5c3f2a" stroke-width="2.2"/><circle cx="60" cy="112" r="2" fill="#c8cdd4"/>`,
    },
    {
      id: 'amber', name: 'Amber', element: 'Pyro',
      skin: '#fdebdf', hair: '#4a2c22', hairStops: [[0, '#5a3628'], [0.6, '#46291e'], [1, '#3a2018']], shineCol: '#9a6a52',
      eyes: '#c8742a', eyeTop: '#6a3212', eyeLow: '#f6c67a', lash: '#2a1612',
      sleeve: '#b8262e', cuff: '#f4f0e8', hands: '#7a4a2e', legs: '#3a2a2a', shoes: '#6a3a22',
      back: (c) => `
        <g stroke="#6e1016" stroke-width="1.2" stroke-linejoin="round">
          <path d="M58 26 Q44 -2 34 6 Q32 18 52 28 Z M62 26 Q76 -2 86 6 Q88 18 68 28 Z" fill="#d62e36"/>
          <path d="M55 24 Q45 8 38 9 M65 24 Q75 8 82 9" fill="none" stroke="#f4f0e8" stroke-width="1.6"/></g>
        ${longHair(c, 132, 2)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 3), [59, 40, 57, 78, 6, -1], ...sideLocks(112, 12)]),
      front: () => `<rect x="54" y="22" width="12" height="7" rx="2" fill="#d62e36" stroke="#6e1016" stroke-width="1"/>`,
      outfit: () => `${torso('#b8262e', '#6e1016')}
        <path d="M46 92 Q60 88 74 92 L68 104 Q60 107 52 104 Z" fill="#f4f0e8"/>
        <g fill="#3a3a3a" stroke="#1a1a1a" stroke-width="1"><ellipse cx="53" cy="95" rx="6" ry="4"/><ellipse cx="67" cy="95" rx="6" ry="4"/></g>
        <g fill="#f6c67a" opacity=".8"><ellipse cx="53" cy="95" rx="3.6" ry="2.2"/><ellipse cx="67" cy="95" rx="3.6" ry="2.2"/></g>
        <path d="M37 116 L83 116 L85 124 Q60 132 35 124 Z" fill="#5a3a2a"/><path d="M38 114 L82 114" stroke="#e6c25e" stroke-width="1.4"/>`,
    },
    {
      id: 'arlecchino', name: 'Arlecchino', element: 'Pyro',
      skin: '#fdf0ee', hair: '#eeeef0', hairStops: [[0, '#ffffff'], [0.7, '#e2e2e6'], [1, '#b8b8c0']], hairLine: '#8a8a94', shineCol: '#ffffff',
      eyes: '#3a1a20', eyeTop: '#0e0608', eyeLow: '#6a2a32', lash: '#1a1014', pupil: 'cross',
      sleeve: '#2a2628', cuff: '#e8e6e8', hands: '#1e1a1c', legs: '#1e1a1c', shoes: '#141012',
      back: (c) => `${nape(c, 102)}
        ${both(H(c, lock(30, 60, 22, 104, 12, -3)))}
        <path d="${lock(89, 58, 98, 104, 11, 3)}" fill="#1e1a1e" stroke="#000" stroke-width="1"/>${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 46, 30, 76, 11, -3], [45, 41, 40, 74, 11, -2], [54, 40, 50, 70, 10, -1], [62, 40, 60, 67, 9, 0],
        [70, 40, 73, 71, 10, 1], [78, 42, 83, 74, 10, 2], [86, 48, 90, 78, 9, 2],
        [31, 54, 27, 104, 12, -3],
      ]) + `<path d="${lock(74, 36, 82, 74, 10, 3)} ${lock(84, 46, 91, 102, 11, 3)} ${lock(80, 38, 88, 60, 7, 2)}" fill="#1e1a1e" stroke="#000" stroke-width="1"/>`,
      outfit: () => `${torso('#2a2628', '#0e0c0e')}
        <path d="M48 90 L60 104 L72 90 Q60 87 48 90 Z" fill="#f4f2f4" stroke="#9a979a" stroke-width=".8"/>
        <path d="M54 92 L66 92 L64 100 L56 100 Z" fill="#1a1618"/><path d="M56 94 L64 98 M64 94 L56 98" stroke="#d63040" stroke-width="1.1"/>
        <path d="M38 94 L48 92 L46 112 L36 110 Z M82 94 L72 92 L74 112 L84 110 Z" fill="#3a3538" stroke="#9a979a" stroke-width=".8"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#3a3538"/>`,
    },
    {
      id: 'barbara', name: 'Barbara', element: 'Hydro',
      skin: '#fff1ea', hair: '#e8d6ae', hairStops: [[0, '#f2e4c2'], [0.6, '#e4cfa2'], [1, '#d0b884']], hairLine: '#9c8454', shineCol: '#ffffff',
      eyes: '#4a90d8', eyeTop: '#1e4a8a', eyeLow: '#c4e4ff', lash: '#3a2e24',
      sleeve: '#f7f7fa', cuff: '#3a5aa8', hands: '#fff1ea', legs: '#f2f2f6', shoes: '#2e3e74',
      back: (c) => `
        ${both(`${H(c, lock(30, 52, 14, 76, 18, -6))}${[[15, 80, 9], [16, 94, 8.4], [18, 107, 7.6], [21, 118, 6.4]].map(([x, y, r]) =>
          `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.82}" fill="url(#hg-${c.id})" ${line(hairStroke(c))}/>`).join('')}`)}
        ${both('<path d="M26 44 Q20 38 16 44 Q18 52 28 50 Z" fill="#23262e" stroke="#0e1014" stroke-width="1"/>')}
        ${nape(c, 96)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(), ...sideLocks(96, 9)]),
      front: () => `
        <path d="M40 30 Q60 18 80 30 L78 36 Q60 26 42 36 Z" fill="#fafafc" stroke="#9aa0b4" stroke-width="1"/>
        <path d="M42 30 Q46 22 52 25 M78 30 Q74 22 68 25" fill="none" stroke="#c6cad8" stroke-width="1"/>
        ${bow(60, 25, '#fafafc', '#3a5aa8', 0.9)}`,
      outfit: () => `${torso('#f7f7fa', '#b4b8c8')}
        <path d="M46 92 Q60 88 74 92 L70 100 Q60 103 50 100 Z" fill="#23262e"/>
        ${gem(60, 97, 3.4, '#4cc2f1', '#e6c25e')}
        <path d="M44 106 L76 106 L74 118 L46 118 Z" fill="#3a5aa8" stroke="#1e3470" stroke-width=".9"/>
        <path d="M56 106 L60 114 L64 106" fill="none" stroke="#f7f7fa" stroke-width="1.2"/>
        <path d="M36 120 Q60 128 84 120" fill="none" stroke="#e6c25e" stroke-width="1.3"/>`,
    },
    {
      id: 'beidou', name: 'Beidou', element: 'Electro',
      skin: '#fbe6dc', hair: '#2e1e1e', hairStops: [[0, '#3a2626'], [0.6, '#2a1a1a'], [1, '#1e1212']], shineCol: '#7a5a5a',
      eyes: '#c4303c', eyeTop: '#5a0e16', eyeLow: '#ff9a8a', lash: '#1a0e0e',
      sleeve: '#f2eee8', cuff: '#1e1616', hands: '#fbe6dc', legs: '#1e1616', shoes: '#141010',
      back: (c) => `${longHair(c, 136, 3)}
        ${H(c, 'M80 26 Q98 22 104 36 Q98 32 90 36 Z')}
        <g stroke="#d8b460" stroke-width="2" stroke-linecap="round"><path d="M86 30 L112 16 M88 34 L114 26"/></g>
        <path d="M110 18 l6 -3 M111 27 l6 1" stroke="#d8b460" stroke-width="1.2"/>${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 46, 30, 76, 11, -3], [45, 41, 40, 74, 11, -2], [54, 40, 50, 72, 10, -1], [62, 40, 62, 70, 9, 0],
        [70, 41, 74, 70, 9, 1], [78, 43, 82, 68, 10, 1], [86, 48, 89, 72, 9, 2],
        [31, 54, 27, 120, 13, -3], [89, 54, 92, 112, 11, 3],
      ]),
      face: () => eyepatch('M64 67 Q74 63 83 68 L82 80 Q73 83 64 79 Z', '#b82838', '#5a0e16')
        + `<path d="M64 69 L37 58 M83 70 L90 66" stroke="#1a0e0e" stroke-width="1.2"/><path d="M68 72 Q74 70 79 73" stroke="#e05060" stroke-width="1" fill="none"/>`,
      front: () => `<path d="M94 82 L94 88" stroke="#d8b460" stroke-width="1"/><path d="M92 88 L96 88 L97 100 L91 100 Z" fill="#4cc8d8" stroke="#1e7a8a" stroke-width=".8"/>`,
      outfit: () => `${torso('#c02a36', '#6a0e16')}
        <path d="M34 96 Q40 88 48 92 Q46 100 38 102 Z M86 96 Q80 88 72 92 Q74 100 82 102 Z" fill="#f2eee8" stroke="#b8b0a6" stroke-width=".9"/>
        <path d="M48 91 Q60 95 72 91 L70 96 Q60 99 50 96 Z" fill="#1e1616"/>
        <path d="M55 102 Q60 98 65 102 Q60 106 55 102 Z M55 102 Q52 106 56 108 M65 102 Q68 106 64 108" fill="none" stroke="#f2eee8" stroke-width="1.3"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#1e1616"/>`,
    },
    {
      id: 'candace', name: 'Candace', element: 'Hydro',
      skin: '#b37656', hair: '#2e3278', hairStops: [[0, '#383c8a'], [0.6, '#2c3074'], [1, '#22265e']], shineCol: '#6a70c8',
      eyes: '#4a7ee0', eyes2: '#e4a83a', eyeTop: '#1a2a6a', eyeLow: '#c8e0ff', lash: '#1a1428',
      sleeve: '#b37656', cuff: '#e0b050', hands: '#b37656', legs: '#2e3278', shoes: '#c89a3a',
      back: (c) => `
        <path d="M22 22 Q8 60 30 100 Q20 60 34 28 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1.2"/>
        <path d="M24 30 Q14 60 28 90" fill="none" stroke="#fff3c0" stroke-width="1"/>
        ${nape(c, 100)}${both(H(c, lock(32, 60, 30, 116, 10, -1)))}${H(c, CROWN)}`,
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 64 L${x - 2} 61 L${x - 4} 64`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 64 ${notch} L29 64 Z`) + both(H(c, lock(30, 56, 30, 94, 10, -1)));
      },
      front: () => `
        <path d="M34 44 Q60 36 86 44 L85 50 Q60 42 35 50 Z" fill="#1c1a2a" stroke="#e6c25e" stroke-width=".9"/>
        <path d="M52 45 Q60 39 68 45 Q60 50 52 45 Z" fill="#fffbe8" stroke="#8a6a2a" stroke-width=".9"/><circle cx="60" cy="45" r="2" fill="#2e3278"/>
        <path d="M60 47.5 L60 53" stroke="#e6c25e" stroke-width="1.1"/>
        ${both('<path d="M30 94 L30 100 M28 100 L32 100 L31 108 L29 108 Z" stroke="#e6c25e" fill="#e6c25e" stroke-width="1"/>')}`,
      outfit: () => `${torso('#2e3278', '#16184a')}
        <path d="M42 92 Q60 86 78 92 L74 102 Q60 106 46 102 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M46 96 Q60 100 74 96" fill="none" stroke="#8a6a2a" stroke-width=".8"/>${gem(60, 101, 3.2, '#4cc2f1', '#8a6a2a')}
        <path d="M50 106 L70 106 L68 124 L52 124 Z" fill="#f4efe0"/>`,
    },
    {
      id: 'charlotte', name: 'Charlotte', element: 'Cryo',
      skin: '#fff1ec', hair: '#f2a8b8', hairStops: [[0, '#f8bcc8'], [0.6, '#f0a0b2'], [1, '#e08aa0']], hairLine: '#b0607a', shineCol: '#ffffff',
      eyes: '#34c2b8', eyeTop: '#0e6a64', eyeLow: '#c8fff4', lash: '#3a2430',
      sleeve: '#f7f5f2', cuff: '#1e2a3a', hands: '#fff1ec', legs: '#1e2a3a', shoes: '#6a2430',
      back: (c) => `${nape(c, 98)}${both(braid(c, [[30, 94], [30, 102], [31, 110]], 4))}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(-1, 2), ...sideLocks(98, 10)]),
      front: () => `
        <path d="M30 42 Q26 16 60 12 Q94 16 90 42 Q60 30 30 42 Z" fill="#a8202c" stroke="#5a0e16" stroke-width="1.2"/>
        <path d="M30 42 Q60 30 90 42 L90 46 Q60 35 30 46 Z" fill="#1e2a3a"/>
        <g fill="#e6c25e">${[38, 48, 60, 72, 82].map((x, i) => `<circle cx="${x}" cy="${[37, 33, 31, 33, 37][i]}" r="1.6"/>`).join('')}</g>
        <path d="M36 30 L42 44 L46 42 L40 28 Z" fill="#f4f4f4" stroke="#1e2a3a" stroke-width=".8"/><path d="M38 31 L43 42" stroke="#1e2a3a" stroke-width="1"/>
        <path d="M40 30 Q34 8 50 2 Q42 14 44 30 Z" fill="#fafafa" stroke="#9a9aa4" stroke-width=".8"/>`,
      face: () => `<circle cx="72.4" cy="74.5" r="8" fill="#c8f0ff" fill-opacity=".18" stroke="#d8b460" stroke-width="1.4"/>
        <path d="M80 77 Q84 84 82 92" fill="none" stroke="#d8b460" stroke-width=".9"/>`,
      outfit: () => `${torso('#f7f5f2', '#b8b0a8')}
        <path d="M38 96 L50 92 L52 124 L36 122 Z M82 96 L70 92 L68 124 L84 122 Z" fill="#1e2a3a" stroke="#0e1420" stroke-width=".9"/>
        <path d="M48 90 Q60 95 72 90" fill="none" stroke="#1e2a3a" stroke-width="2"/>${gem(60, 99, 4, '#2a9a94', '#e6c25e')}
        <path d="M36 120 Q60 128 84 120" fill="none" stroke="#a8202c" stroke-width="1.6"/>`,
    },
    {
      id: 'chasca', name: 'Chasca', element: 'Anemo',
      skin: '#fbe8e0', hair: '#8a2a30', hairStops: [[0, '#9a3036'], [0.6, '#80262c'], [1, '#6a3070']], shineCol: '#d06a70',
      eyes: '#5aa8e0', eyeTop: '#1a4a7a', eyeLow: '#d0f0ff', lash: '#2a1016',
      sleeve: '#2a2226', cuff: '#c02a30', hands: '#2a2226', legs: '#2a2226', shoes: '#4a2a20',
      back: (c) => `${longHair(c, 134, 3)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M33 72 L12 60 Q16 78 34 84 Z" fill="${c.skin}" ${line('#c89a8a')}/>`),
      bangs: (c) => fringe(c, [...bangsList(-3, 4), [60, 44, 54, 84, 8, -2], ...sideLocks(120, 12)])
        + `<path d="${lock(66, 44, 70, 84, 8, 1)}" fill="#5a2a7a" stroke="#2a1040" stroke-width=".9"/>`,
      front: () => `<g transform="rotate(-8 60 34)">
        <path d="M2 30 Q30 20 60 26 Q90 20 118 30 Q92 44 60 40 Q28 44 2 30 Z" fill="#2a1e22" stroke="#0e0808" stroke-width="1.2"/>
        <path d="M38 34 Q34 8 60 4 Q86 8 82 34 Z" fill="#3a2a2c" stroke="#0e0808" stroke-width="1.2"/>
        <path d="M60 8 L72 26 L60 58 L48 26 Z" fill="#e8e0d2" stroke="#6a5a4a" stroke-width="1.1"/>
        <path d="M60 14 L66 26 L60 44 L54 26 Z" fill="#3a3040"/>
        <circle cx="52" cy="30" r="2.2" fill="#2a4aa0"/><circle cx="68" cy="30" r="2.2" fill="#2a4aa0"/>
        <path d="M6 30 Q20 26 34 30 M86 30 Q100 26 114 30" fill="none" stroke="#5a8ad0" stroke-width="1"/></g>`,
      outfit: () => `${torso('#2a2226', '#0e0a0c')}
        <path d="M40 92 Q60 84 80 92 L78 104 Q60 110 42 104 Z" fill="#c02a30" stroke="#6a0e14" stroke-width="1"/>
        <path d="M46 100 Q60 104 74 100" fill="none" stroke="#6a0e14" stroke-width=".8"/>
        <path d="M44 112 L76 112" stroke="#d8b460" stroke-width="1.6"/>`,
    },
    {
      id: 'chevreuse', name: 'Chevreuse', element: 'Pyro',
      skin: '#fdefe9', hair: '#6a58a8', hairStops: [[0, '#7866b8'], [0.6, '#5e4c9c'], [1, '#4a3a82']], shineCol: '#b0a4e8',
      eyes: '#b876d8', eyeTop: '#5a2a7a', eyeLow: '#f4d4ff', lash: '#2a1a3a',
      sleeve: '#2a2632', cuff: '#d8b460', hands: '#2a2632', legs: '#2a2632', shoes: '#1a1620',
      back: (c) => `${longHair(c, 128, 2)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(-2, 4), ...sideLocks(116, 12)]),
      face: () => eyepatch('M64 68 Q73 64 82 68 L81 80 Q72 83 64 79 Z', '#f4f0e8', '#8a6a2a')
        + `<path d="M73 69 L74.4 72.6 L78 74 L74.4 75.4 L73 79 L71.6 75.4 L68 74 L71.6 72.6 Z" fill="#d8b460"/><path d="M64 70 L38 60" stroke="#2a1a3a" stroke-width="1.1"/>`,
      front: () => `
        <path d="M32 40 Q30 22 60 20 Q90 22 88 40 Z" fill="#1e1a24" stroke="#0a080e" stroke-width="1.2"/>
        <path d="M28 40 Q60 34 92 40 Q92 46 60 45 Q28 46 28 40 Z" fill="#3a2a22" stroke="#0a080e" stroke-width="1.1"/>
        <path d="M40 28 L46 18 L52 26 L60 12 L68 26 L74 18 L80 28 Z" fill="#d8b460" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M60 22 L63 29 L60 36 L57 29 Z" fill="#d02a3a" stroke="#6a0e16" stroke-width=".8"/>`,
      outfit: () => `${torso('#2a2632', '#0e0c14')}
        <g fill="#8a6a42" stroke="#3a2a1a" stroke-width="1"><circle cx="51" cy="94" r="5"/><circle cx="69" cy="94" r="5"/></g>
        <g fill="#e6a04a"><circle cx="51" cy="94" r="2.8"/><circle cx="69" cy="94" r="2.8"/></g>
        <path d="M56 94 L64 94" stroke="#3a2a1a" stroke-width="1.6"/>
        <path d="M54 104 L60 112 L66 104" fill="none" stroke="#f4f0e8" stroke-width="1.6"/>
        <path d="M38 116 L82 116" stroke="#d8b460" stroke-width="1.6"/>`,
    },
    {
      id: 'chiori', name: 'Chiori', element: 'Geo',
      skin: '#fdefe9', hair: '#3e2a24', hairStops: [[0, '#4a3228'], [0.6, '#3a2620'], [1, '#2a1a16']], shineCol: '#8a6a5a',
      eyes: '#d03a34', eyeTop: '#6a1010', eyeLow: '#ffa080', lash: '#2a1612',
      sleeve: '#2a2426', cuff: '#e0a830', hands: '#fdefe9', legs: '#2a2426', shoes: '#1a1416',
      back: (c) => `
        ${H(c, 'M36 36 Q16 26 20 8 Q34 4 46 26 Z')}${H(c, lock(22, 16, 8, 66, 12, -6))}
        ${nape(c, 104)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(2, 2), [88, 50, 94, 108, 10, 3], [31, 54, 26, 104, 11, -3]])
        + `<path d="${lock(74, 42, 80, 70, 4, 1)}" fill="#e0a830" opacity=".85"/>`,
      front: () => `${flower(28, 20, 11, '#e0482a', '#ffd36a')}
        <path d="M20 26 L10 34" stroke="#d8b460" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M84 36 L96 34 L94 42 Z" fill="#c42a2a" stroke="#6a1010" stroke-width=".8"/>`,
      outfit: () => `${torso('#2a2426', '#0e0a0c')}
        <path d="M46 90 L60 106 L74 90 Q60 87 46 90 Z" fill="#f4f0e6"/>
        <path d="M44 91 L60 110 L76 91" fill="none" stroke="#e0a830" stroke-width="2.4"/>
        <path d="M38 110 L82 110 L83 116 L37 116 Z" fill="#e0a830" stroke="#8a6010" stroke-width=".8"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#3a3234"/>`,
    },
    {
      id: 'citlali', name: 'Citlali', element: 'Cryo',
      skin: '#fff2ee', hair: '#ece6f4', hairStops: [[0, '#f8f4fc'], [0.6, '#e6def0'], [1, '#c8b8e0']], hairLine: '#9a8ab4', shineCol: '#ffffff',
      eyes: '#6a86e8', eyeTop: '#26388a', eyeLow: '#d4e0ff', lash: '#2a2440',
      sleeve: '#2a2a3a', cuff: '#9a6ad8', hands: '#fff2ee', legs: '#2a2a3a', shoes: '#1a1a26',
      back: (c) => `
        ${both('<path d="M40 30 Q30 14 36 2 Q42 12 48 26 Z" fill="#1e1c2a" stroke="#000" stroke-width="1"/><path d="M38 20 Q36 12 38 6" stroke="#6ac2f1" stroke-width="1.4" fill="none"/>')}
        ${longHair(c, 132, 2)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(118, 12)])
        + both(braid(c, [[33, 86], [32, 94], [32, 102]], 3.6)
          + '<path d="M29 106 L27 124 L33 122 L31 106 Z" fill="#8a60d8" stroke="#3a2a6a" stroke-width=".8"/><path d="M33 106 L35 122 L39 120 Z" fill="#f08ab0"/>'),
      face: () => both('<path d="M40 83 L44 86 M43 81 L46 85" stroke="#9a6ad8" stroke-width="1.2" stroke-linecap="round"/>'),
      outfit: () => `${torso('#2a2a3a', '#0e0e18')}
        <path d="M44 92 Q60 88 76 92 L70 102 Q60 106 50 102 Z" fill="#ece6f4" stroke="#9a8ab4" stroke-width=".9"/>
        ${gem(60, 101, 3.4, '#6ac2f1', '#e6c25e')}
        <path d="M40 112 L80 112" stroke="#9a6ad8" stroke-width="2"/><path d="M42 116 L78 116" stroke="#f08ab0" stroke-width="1.2"/>`,
    },
    {
      id: 'clorinde', name: 'Clorinde', element: 'Electro',
      skin: '#fdf0ec', hair: '#262a44', hairStops: [[0, '#2e3250'], [0.6, '#24283e'], [1, '#1a1e30']], shineCol: '#6a74a8',
      eyes: '#9a72d8', eyeTop: '#3e2a78', eyeLow: '#e8d8ff', lash: '#141626',
      sleeve: '#1e2236', cuff: '#d8b460', hands: '#1a1a24', legs: '#1e2236', shoes: '#12141e',
      back: (c) => `${longHair(c, 134, 4)}${H(c, lock(88, 56, 108, 128, 12, 6))}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 46, 34, 82, 12, -1], [45, 41, 44, 80, 12, -1], [54, 40, 54, 70, 10, 0], [62, 40, 62, 68, 9, 0],
        [70, 41, 73, 70, 9, 1], [78, 43, 82, 70, 10, 1], [86, 48, 90, 74, 9, 2], ...sideLocks(120, 12),
      ]),
      front: () => `<g transform="rotate(-14 60 30)">
        <path d="M24 42 Q40 30 60 34 Q84 30 98 44 Q84 40 60 42 Q40 42 24 42 Z" fill="#1e2a6a" stroke="#0a0e2a" stroke-width="1.2"/>
        <path d="M34 38 Q40 2 70 -6 Q64 14 84 38 Z" fill="#2a3a8a" stroke="#0a0e2a" stroke-width="1.2"/>
        <path d="M60 -2 Q54 20 60 38" fill="none" stroke="#5a6ad0" stroke-width="1.4"/>
        <path d="M36 37 Q60 30 84 37" fill="none" stroke="#d8b460" stroke-width="1.4"/>
        <path d="M78 26 Q96 6 112 4 Q100 16 84 32 Z" fill="#141a3a" stroke="#000" stroke-width=".8"/></g>`,
      outfit: () => `${torso('#1e2236', '#0a0c16')}
        <path d="M34 94 Q42 86 50 90 L46 104 L36 104 Z M86 94 Q78 86 70 90 L74 104 L84 104 Z" fill="#2a2e44" stroke="#d8b460" stroke-width="1"/>
        <path d="M50 90 L60 100 L70 90 Q60 87 50 90 Z" fill="#f4f0ea"/>${gem(60, 104, 3.4, '#af8ec1', '#d8b460')}
        <path d="M60 108 L60 124" stroke="#d8b460" stroke-width="1.2"/>`,
    },
    {
      id: 'collei', name: 'Collei', element: 'Dendro',
      skin: '#fdefe6', hair: '#9ab85a', hairStops: [[0, '#a8c666'], [0.6, '#92b052'], [1, '#6e9040']], shineCol: '#dcf0a8',
      eyes: '#b84ab0', eyeTop: '#5a1a5a', eyeLow: '#f0b8f0', lash: '#2a3a1a',
      sleeve: '#2a2a26', cuff: '#d8b460', hands: '#2a2a26', legs: '#2a2a26', shoes: '#4a3a24',
      back: (c) => `${nape(c, 108, 4)}${both(H(c, lock(30, 60, 20, 110, 12, -4)))}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [35, 46, 28, 74, 11, -4], [44, 42, 38, 74, 10, -2], [52, 40, 48, 72, 10, -1], [60, 40, 60, 70, 9, 0],
        [68, 40, 72, 72, 10, 1], [77, 42, 84, 72, 10, 3], [85, 48, 92, 74, 9, 4], ...sideLocks(104, 11),
      ]) + H(c, 'M60 24 Q52 10 58 6 Q58 14 66 20 Z'),
      front: () => `<g transform="translate(40 30) rotate(-20)">
        <path d="M0 -12 Q12 -2 0 12 Q-12 -2 0 -12 Z" fill="#d8b460" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M0 -6 Q6 0 0 6 Q-6 0 0 -6 Z" fill="#6ab84a" stroke="#2a5a1a" stroke-width=".8"/>
        <path d="M-2 10 L-6 18 M2 10 L6 18" stroke="#d8b460" stroke-width="1.4"/></g>`,
      outfit: () => `${torso('#2a2a26', '#0e0e0c')}
        <path d="M42 92 Q60 86 78 92 L74 102 Q60 106 46 102 Z" fill="#f4efe0" stroke="#b8ae96" stroke-width=".9"/>
        <path d="M52 98 L60 104 L68 98" fill="none" stroke="#d8b460" stroke-width="1.4"/>${gem(60, 108, 3.2, '#a5c83b', '#d8b460')}
        <path d="M36 118 Q60 126 84 118" fill="none" stroke="#6e9040" stroke-width="2"/>`,
    },
    {
      id: 'columbina', name: 'Columbina', element: 'Hydro',
      skin: '#fff3f0', hair: '#231a26', hairStops: [[0, '#2a2030'], [0.6, '#221a28'], [1, '#6a1a5a']], shineCol: '#8a6a9a',
      eyes: '#8a8ab8', eyeTop: '#3a3a6a', eyeLow: '#e4e4ff', lash: '#1a1220',
      sleeve: '#f6f4f6', cuff: '#e0dce4', hands: '#fff3f0', legs: '#f0eef2', shoes: '#2a2030',
      back: (c) => `
        ${both('<path d="M34 40 Q10 30 2 44 Q14 42 20 48 Q10 50 6 58 Q20 54 32 52 Z" fill="#fafafc" stroke="#a8a8b8" stroke-width="1"/><path d="M8 46 L26 46 M12 54 L28 51" stroke="#c8c8d4" stroke-width=".8"/>')}
        ${longHair(c, 140, 1)}${H(c, CROWN)}`,
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 62 L${x - 2} 59.5 L${x - 4} 62`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 62 ${notch} L29 62 Z`)
          + both(`${H(c, 'M29 54 L28 126 L38 124 L38 58 Z')}<path d="M32 60 L31 120" stroke="#b02a8a" stroke-width="2.4"/>
            <path d="M27 112 L39 122 M39 112 L27 122" stroke="#fafafc" stroke-width="2.4" stroke-linecap="round"/>`);
      },
      face: () => `<path d="M34 68 Q60 60 86 68 L86 80 Q60 74 34 80 Z" fill="#fafafc" fill-opacity=".86" stroke="#c8c8d4" stroke-width=".8"/>
        <path d="M40 70 L48 78 M48 70 L40 78 M56 68 L64 76 M64 68 L56 76 M72 70 L80 78 M80 70 L72 78" stroke="#c0bcd0" stroke-width=".9"/>`,
      outfit: () => `${torso('#f6f4f6', '#b8b4be')}
        <path d="M46 90 Q52 100 60 96 Q68 100 74 90 Q66 104 60 102 Q54 104 46 90 Z" fill="#fafafc" stroke="#b8b4be" stroke-width=".8"/>
        ${bow(60, 98, '#fafafc', '#8a8ab8', 0.8)}<path d="M36 118 Q60 126 84 118" fill="none" stroke="#c8c4d0" stroke-width="1.4"/>`,
    },
    {
      id: 'dehya', name: 'Dehya', element: 'Pyro',
      skin: '#d9a07a', hair: '#2a2024', hairStops: [[0, '#342a2c'], [0.6, '#262022'], [1, '#1c1618']], shineCol: '#7a6a6a',
      eyes: '#4aa8e8', eyeTop: '#1a4a8a', eyeLow: '#c8f0ff', lash: '#1a1214',
      sleeve: '#d9a07a', cuff: '#e0b050', hands: '#2a2024', legs: '#2a2024', shoes: '#4a3424',
      back: (c) => `${both(H(c, 'M36 36 Q26 16 34 4 Q42 18 50 28 Z') + '<path d="M36 28 Q32 16 35 10" stroke="#e6c25e" stroke-width="2.4" fill="none"/>')}
        ${longHair(c, 136, 5)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 46, 28, 74, 11, -4], [44, 41, 38, 76, 11, -2], [53, 40, 50, 72, 10, -1], [62, 40, 64, 70, 9, 1],
        [70, 41, 76, 72, 10, 2], [78, 43, 86, 74, 10, 3], [86, 48, 92, 76, 9, 3], ...sideLocks(126, 13),
      ]) + `<path d="${lock(44, 41, 38, 76, 5, -2)} ${lock(62, 40, 64, 70, 4, 1)}" fill="#e6b84a" opacity=".9"/>`,
      front: () => `<path d="M94 82 L94 88" stroke="#e6c25e" stroke-width="1"/><path d="M91 88 L97 88 L94 98 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".8"/>`,
      outfit: () => `${torso('#2a2024', '#0e0a0c')}
        <path d="M44 90 Q60 86 76 90 L72 100 Q60 104 48 100 Z" fill="#e0b050" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M48 94 L72 94" stroke="#8a6a2a" stroke-width=".8"/>${gem(60, 100, 3.4, '#d02a2a', '#8a6a2a')}
        <path d="M50 104 L70 104 L68 116 L52 116 Z" fill="#d9a07a"/><path d="M38 116 L82 116" stroke="#e0b050" stroke-width="2.4"/>`,
    },
    {
      id: 'diona', name: 'Diona', element: 'Cryo',
      skin: '#fff0ea', hair: '#f2a4a8', hairStops: [[0, '#f8b4b8'], [0.6, '#f09ca2'], [1, '#e08890']], hairLine: '#b0606a', shineCol: '#ffffff',
      eyes: '#3cc4c0', eyeTop: '#0e6a6a', eyeLow: '#c8fff8', lash: '#4a2a30', brow: '#c0606a',
      sleeve: '#f7f4f0', cuff: '#e0902a', hands: '#fff0ea', legs: '#f7f4f0', shoes: '#3a2a26',
      back: (c) => `${nape(c, 94)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M36 40 L26 12 Q40 16 50 30 Z" fill="${c.hair}" ${line(hairStroke(c))}/><path d="M36 34 L30 18 Q40 22 46 30 Z" fill="#fff8f4"/>`),
      bangs: (c) => fringe(c, [...bangsList(0, 0), ...sideLocks(94, 12)]),
      front: () => `<path d="M40 34 Q60 22 80 34 L80 38 Q60 30 40 38 Z" fill="#2a2a34" stroke="#0e0e14" stroke-width="1"/>`,
      face: () => both('<path d="M42 64 Q46.5 61.5 51 63.5" stroke="#c0606a" stroke-width="2.4" stroke-linecap="round" fill="none"/>'),
      outfit: () => `${torso('#f7f4f0', '#bab2a8')}
        <path d="M40 96 L50 92 L50 124 L36 122 Z M80 96 L70 92 L70 124 L84 122 Z" fill="#e0902a" stroke="#8a5010" stroke-width=".9"/>
        ${bow(60, 94, '#2a2a34', '#e0902a', 0.8)}`,
      extra: () => `<path d="M82 122 Q98 118 96 104 Q94 96 100 94 Q104 104 100 116 Q96 128 84 128 Z" fill="#f09ca2" stroke="#b0606a" stroke-width="1.1"/>
        <path d="M98 96 Q102 100 101 106" stroke="#fff8f4" stroke-width="2" fill="none"/>`,
    },
    {
      id: 'dori', name: 'Dori', element: 'Electro',
      skin: '#fff0ea', hair: '#f0a0b8', hairStops: [[0, '#f8b2c6'], [0.6, '#ee98b2'], [1, '#d87a9c']], hairLine: '#b0587a', shineCol: '#ffffff',
      eyes: '#e8a830', eyeTop: '#8a4a10', eyeLow: '#fff0a0', lash: '#4a2030',
      sleeve: '#f4ecd8', cuff: '#8a5ab8', hands: '#fff0ea', legs: '#f4ecd8', shoes: '#6a3a8a',
      back: (c) => `${nape(c, 98, 6)}${both(H(c, lock(30, 58, 12, 88, 12, -5)))}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [35, 46, 26, 70, 11, -5], [44, 42, 38, 74, 10, -2], [52, 40, 50, 72, 10, -1], [60, 40, 62, 72, 9, 1],
        [68, 40, 74, 72, 10, 2], [77, 42, 86, 70, 10, 4], [85, 48, 96, 70, 9, 5],
      ]),
      front: () => `
        <path d="M24 36 Q20 6 60 4 Q100 6 96 36 Q60 26 24 36 Z" fill="#7a4ab0" stroke="#3a1a6a" stroke-width="1.2"/>
        <path d="M22 36 Q60 26 98 36 L96 42 Q60 32 24 42 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M60 8 L68 18 L78 20 L70 28 L72 38 L60 32 L48 38 L50 28 L42 20 L52 18 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M54 20 L66 20 L66 30 L54 30 Z" fill="#dff4ff" stroke="#6a8ab8" stroke-width=".9"/>`,
      face: () => both('<path d="M47.6 70 L51 75 L47.6 80 L44.2 75 Z" fill="#d02a3a" opacity=".85"/>'),
      outfit: () => `${torso('#f4ecd8', '#b8a888')}
        <path d="M42 92 Q60 86 78 92 L76 104 Q60 110 44 104 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>
        ${gem(60, 100, 4, '#af8ec1', '#8a6a2a')}<path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#7a4ab0"/>`,
    },
    {
      id: 'emilie', name: 'Emilie', element: 'Dendro',
      skin: '#fff1ec', hair: '#f0dca8', hairStops: [[0, '#f6e6ba'], [0.55, '#ecd49c'], [1, '#e07a86']], hairLine: '#a88a5a', shineCol: '#ffffff',
      eyes: '#c05a8a', eyeTop: '#5a1a3a', eyeLow: '#ffc8e0', lash: '#2a1a1a',
      sleeve: '#1e2420', cuff: '#f4f0e8', hands: '#1e2420', legs: '#1e2420', shoes: '#141814',
      back: (c) => `${nape(c, 100, 2)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(2, 0), ...sideLocks(98, 11)]),
      front: () => `
        <path d="M22 42 Q30 30 60 30 Q90 30 98 42 Q60 38 22 42 Z" fill="#244a3a" stroke="#0e2018" stroke-width="1.1"/>
        <path d="M36 34 Q40 8 64 6 Q60 18 84 34 Z" fill="#2e5a48" stroke="#0e2018" stroke-width="1.1"/>
        <path d="M24 42 Q30 60 34 64 M40 40 Q42 56 46 60 M28 48 L44 52" stroke="#1a1a1a" stroke-width=".6" fill="none" opacity=".7"/>
        ${bow(46, 30, '#3a7a5a', '#e6c25e', 0.8)}<circle cx="44" cy="40" r="2" fill="#f4f0e8"/><circle cx="48" cy="44" r="1.6" fill="#f4f0e8"/>`,
      face: () => both('<rect x="38" y="67" width="18" height="14" rx="4" fill="#ffffff" fill-opacity=".12" stroke="#1a1a1a" stroke-width="1.6"/>') + '<path d="M56 72 L64 72" stroke="#1a1a1a" stroke-width="1.4"/>',
      outfit: () => `${torso('#1e2420', '#0a0c0a')}
        <path d="M46 90 L60 102 L74 90 Q60 87 46 90 Z" fill="#f4f0e8" stroke="#b8b0a0" stroke-width=".8"/>
        <path d="M54 96 L60 92 L66 96 L60 104 Z" fill="#e07a86"/><path d="M38 112 L82 112" stroke="#a5c83b" stroke-width="1.4"/>`,
    },
    {
      id: 'escoffier', name: 'Escoffier', element: 'Cryo',
      skin: '#fff1ec', hair: '#f0b058', hairStops: [[0, '#f8c070'], [0.6, '#eca84e'], [1, '#d88a3a']], hairLine: '#a8682a', shineCol: '#ffffff',
      eyes: '#4a9ad8', eyeTop: '#1a4a8a', eyeLow: '#c8ecff', lash: '#4a2a1a',
      sleeve: '#f7f4f4', cuff: '#2a4a8a', hands: '#f7f4f4', legs: '#1e2236', shoes: '#141626',
      back: (c) => `${longHair(c, 134, 3)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(1, 2), ...sideLocks(120, 12)]) + H(c, 'M40 28 Q30 10 42 4 Q38 14 46 24 Z'),
      front: () => `
        <path d="M44 28 Q60 12 78 22 Q82 30 76 32 Q60 26 46 34 Z" fill="#fafafa" stroke="#9aa4b4" stroke-width="1"/>
        <path d="M64 18 L76 30 M72 18 L62 30" stroke="#4a9ad8" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M82 50 L90 58 M90 50 L82 58" stroke="#4cc2f1" stroke-width="2.4" stroke-linecap="round"/>`,
      outfit: () => `${torso('#e8a0b0', '#a05a6a')}
        <path d="M44 92 Q60 86 76 92 L72 100 Q60 104 48 100 Z" fill="#f7f4f4" stroke="#b8b0b0" stroke-width=".8"/>
        ${gem(60, 100, 3.6, '#4cc2f1', '#e6c25e')}<path d="M38 110 Q60 116 82 110" stroke="#e6c25e" stroke-width="1.4" fill="none"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#1e2236"/>`,
    },
    {
      id: 'eula', name: 'Eula', element: 'Cryo',
      skin: '#fff1ee', hair: '#9ad4e8', hairStops: [[0, '#b0e0f0'], [0.6, '#92cce4'], [1, '#6ab0d0']], hairLine: '#4a88a8', shineCol: '#ffffff',
      eyes: '#c88a4a', eyeTop: '#6a3a1a', eyeLow: '#ffd8a0', lash: '#2a2a3a',
      sleeve: '#1e2440', cuff: '#f4f4f8', hands: '#1e2440', legs: '#1e2440', shoes: '#12162a',
      back: (c) => `${nape(c, 104, 3)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 46, 30, 74, 11, -3], [45, 41, 40, 74, 11, -2], [54, 40, 50, 70, 10, -1], [62, 40, 62, 68, 9, 0],
        [70, 41, 74, 72, 10, 1], [78, 43, 82, 72, 10, 1], [86, 48, 90, 76, 9, 2], ...sideLocks(108, 12),
      ]),
      front: () => `<path d="M34 42 Q60 26 86 42" fill="none" stroke="#1a1a26" stroke-width="3.2"/>
        <path d="M84 40 Q96 18 104 8 Q104 28 90 44 Z" fill="#fafafc" stroke="#9aa4b4" stroke-width=".9"/><path d="M88 40 Q96 26 102 14" stroke="#9aa4b4" stroke-width=".7" fill="none"/>`,
      outfit: () => `${torso('#1e2440', '#0a0c1a')}
        <path d="M48 90 L60 102 L72 90 Q60 87 48 90 Z" fill="#f4f4f8"/>${gem(60, 104, 3.6, '#9fd6e3', '#e6c25e')}
        <path d="M36 96 L46 92 L44 112 L36 110 Z M84 96 L74 92 L76 112 L84 110 Z" fill="#2a3458" stroke="#e6c25e" stroke-width=".8"/>`,
    },
    {
      id: 'faruzan', name: 'Faruzan', element: 'Anemo',
      skin: '#fff1ec', hair: '#a8dce8', hairStops: [[0, '#bce6f0'], [0.6, '#a2d6e4'], [1, '#80c0d4']], hairLine: '#4a94a8', shineCol: '#ffffff',
      eyes: '#a8b848', eyeTop: '#4a5a1a', eyeLow: '#f0ffb0', lash: '#2a3a3a',
      sleeve: '#f7f4ee', cuff: '#2a8a7a', hands: '#fff1ec', legs: '#f7f4ee', shoes: '#2a5a54',
      back: (c) => `${both(H(c, lock(30, 44, 14, 128, 20, -5)))}${nape(c, 96)}${H(c, CROWN)}`,
      ears: () => both('<path d="M36 40 Q24 34 22 24 Q30 30 40 32 Z" fill="#d8b460" stroke="#8a6a2a" stroke-width="1"/>'),
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 66 L${x - 2} 63 L${x - 4} 66`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 66 ${notch} L29 66 Z`) + both(H(c, lock(31, 54, 30, 100, 10, -1)));
      },
      front: () => `<path d="M72 46 L86 60 M86 46 L72 60" stroke="#e6c25e" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M72 46 L86 60 M86 46 L72 60" stroke="#8a6a2a" stroke-width=".8" stroke-linecap="round"/>`,
      outfit: () => `${torso('#f7f4ee', '#b8b0a4')}
        <path d="M46 90 Q60 94 74 90 L72 96 Q60 100 48 96 Z" fill="#1e2a2a"/>${gem(60, 99, 3.2, '#74c2a8', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#2a8a7a"/><path d="M40 108 L80 108" stroke="#e6c25e" stroke-width="1.4"/>`,
    },
    {
      id: 'fischl', name: 'Fischl', element: 'Electro',
      skin: '#fff1ec', hair: '#f0d496', hairStops: [[0, '#f6e0aa'], [0.6, '#ecce8c'], [1, '#d8b46a']], hairLine: '#a8844a', shineCol: '#ffffff',
      eyes: '#4ab050', eyeTop: '#1a5a1e', eyeLow: '#c8ffb0', lash: '#2a2a1a',
      sleeve: '#2a2432', cuff: '#f4f0e8', hands: '#2a2432', legs: '#1a1620', shoes: '#1a1620',
      back: (c) => `${both(H(c, lock(30, 46, 14, 118, 16, -5)) + '<path d="M30 46 L24 40 L28 52 Z" fill="#1a1620"/>')}${nape(c, 96)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 46, 34, 70, 10, -1], [44, 42, 42, 78, 12, 0], [52, 40, 52, 80, 12, 0], [60, 40, 62, 72, 9, 1],
        [68, 40, 72, 70, 10, 1], [77, 42, 80, 70, 10, 1], [85, 48, 88, 72, 9, 2], ...sideLocks(98, 10),
        [64, 40, 70, 82, 13, 2], [72, 42, 80, 84, 13, 2],
      ]),
      front: () => `<path d="M78 34 Q88 16 100 14 Q96 22 102 26 Q94 28 90 36 Z" fill="#1a1620" stroke="#000" stroke-width=".8"/>`,
      outfit: () => `${torso('#2a2432', '#0e0a14')}
        <path d="M46 90 Q60 94 74 90 L72 96 Q60 100 48 96 Z" fill="#f4f0e8"/>
        ${bow(60, 98, '#7a4ab0', '#e6c25e', 1.1)}${gem(60, 98, 2.4, '#af8ec1', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#3a2e44"/>`,
    },
    {
      id: 'iansan', name: 'Iansan', element: 'Electro',
      skin: '#9a6448', hair: '#eeeef2', hairStops: [[0, '#ffffff'], [0.6, '#e8e8ee'], [1, '#c4c4d0']], hairLine: '#8a8a9a', shineCol: '#ffffff',
      eyes: '#6ab04a', eyeTop: '#2a5a1a', eyeLow: '#d8ffb0', lash: '#1a1414',
      sleeve: '#1e1a1e', cuff: '#e0902a', hands: '#1e1a1e', legs: '#1e1a1e', shoes: '#141014',
      back: (c) => `${nape(c, 98, 2)}${H(c, CROWN)}`,
      ears: () => both('<path d="M32 70 Q14 64 8 72 Q18 82 34 80 Z" fill="#8a5a3e" stroke="#4a2a1a" stroke-width="1"/><path d="M28 72 Q18 70 14 73" stroke="#c8906a" stroke-width="1.2" fill="none"/>'),
      bangs: (c) => fringe(c, [
        [36, 46, 28, 72, 11, -4], [44, 42, 38, 74, 10, -2], [52, 40, 50, 70, 10, -1], [60, 42, 62, 70, 9, 1],
        [68, 40, 74, 72, 10, 2], [77, 42, 86, 72, 10, 4], [85, 48, 94, 74, 9, 4], ...sideLocks(96, 10),
      ]),
      front: () => `<g transform="rotate(-18 60 30)">
        <path d="M34 40 Q30 14 56 10 Q84 8 88 30 Q84 42 70 40 L50 44 Z" fill="#ece2cc" stroke="#6a5a42" stroke-width="1.2"/>
        <ellipse cx="68" cy="26" rx="8" ry="7" fill="#1a1414"/><path d="M40 20 Q46 30 44 40" stroke="#b8aa8a" stroke-width="1" fill="none"/>
        <path d="M34 42 Q60 36 88 40 L88 45 Q60 41 34 47 Z" fill="#6a3ab0"/><path d="M60 38.6 L66 38.4 L66 43.4 L60 43.6 Z" fill="#e0902a"/></g>`,
      outfit: () => `${torso('#1e1a1e', '#0a080a')}
        <path d="M44 90 Q60 86 76 90 L74 96 Q60 100 46 96 Z" fill="#e0902a" stroke="#8a4a10" stroke-width=".9"/>
        <path d="M52 100 L60 108 L68 100" fill="none" stroke="#af8ec1" stroke-width="1.6"/><path d="M38 116 L82 116" stroke="#e0902a" stroke-width="1.6"/>`,
    },
    {
      id: 'ineffa', name: 'Ineffa', element: 'Electro',
      skin: '#fff2ee', hair: '#a8d4ec', hairStops: [[0, '#bce0f4'], [0.6, '#a2cee8'], [1, '#86b8dc']], hairLine: '#4a88b0', shineCol: '#ffffff',
      eyes: '#3a9ae0', eyeTop: '#12488a', eyeLow: '#c8f0ff', lash: '#1e2a3a',
      sleeve: '#1e3a78', cuff: '#c42a36', hands: '#f4f4f8', legs: '#1e2a4a', shoes: '#141c34',
      back: (c) => `${longHair(c, 128)}${both('<path d="M30 60 L20 34 L26 32 L34 56 Z" fill="#8a8e9a" stroke="#3a3e4a" stroke-width="1"/><rect x="24" y="54" width="10" height="16" rx="3" fill="#d8b460" stroke="#6a5020" stroke-width="1"/>')}${H(c, CROWN)}`,
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 64 L${x - 2} 61 L${x - 4} 64`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 64 ${notch} L29 64 Z`) + both(H(c, 'M29 54 L28 112 L37 110 L38 58 Z'));
      },
      front: () => `<path d="M36 36 Q60 24 84 36 L82 41 Q60 30 38 41 Z" fill="#d8b460" stroke="#6a5020" stroke-width="1"/>
        <path d="M44 34 L48 30 L52 33 L56 29 L60 32 L64 29 L68 33 L72 30 L76 34" fill="none" stroke="#6a5020" stroke-width=".9"/>`,
      outfit: () => `${torso('#1e3a78', '#0a1a44')}
        <path d="M44 90 L60 104 L76 90 Q60 86 44 90 Z" fill="#f4f4f8" stroke="#9aa4b4" stroke-width=".8"/>
        <path d="M40 92 L50 90 L52 124 L38 122 Z M80 92 L70 90 L68 124 L82 122 Z" fill="none" stroke="#c42a36" stroke-width="1.8"/>
        ${gem(60, 106, 3.2, '#af8ec1', '#d8b460')}`,
    },
    {
      id: 'jahoda', name: 'Jahoda', element: 'Anemo',
      skin: '#fff1ea', hair: '#e8dca8', hairStops: [[0, '#f0e6ba'], [0.6, '#e2d49c'], [1, '#cabb80']], hairLine: '#9a8a54', shineCol: '#ffffff',
      eyes: '#e0a030', eyeTop: '#8a4a10', eyeLow: '#fff0a0', lash: '#3a2a1a',
      sleeve: '#1e1e22', cuff: '#e6c25e', hands: '#1e1e22', legs: '#1e1e22', shoes: '#2a2226',
      back: (c) => `${nape(c, 96)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 2), [60, 42, 58, 76, 7, -1]])
        + both(H(c, lock(32, 56, 28, 78, 12, -1)) + braid(c, [[27, 80], [25, 89], [24, 98], [24, 107], [25, 116]], 5.4)),
      front: () => `
        ${both('<path d="M34 34 L30 12 L46 24 Z" fill="#1e1e22" stroke="#000" stroke-width="1"/><path d="M34 30 L33 18 L41 25 Z" fill="#e87a8a"/>')}
        <path d="M30 44 Q28 18 60 16 Q92 18 90 44 Q60 36 30 44 Z" fill="#2a2a30" stroke="#0a0a0e" stroke-width="1.2"/>
        <path d="M40 22 L48 30 M48 22 L40 30" stroke="#d6404a" stroke-width="2.4"/><rect x="70" y="22" width="10" height="7" fill="#4aa8e0"/>
        ${both('<circle cx="48" cy="42" r="8" fill="#f4a0b8" fill-opacity=".8" stroke="#d8b460" stroke-width="2"/><path d="M45 38 Q47 36 50 37" stroke="#fff" stroke-width="1.2" fill="none"/>')}`,
      outfit: () => `${torso('#1e1e22', '#0a0a0c')}
        <path d="M42 92 Q60 86 78 92 L70 104 Q60 108 50 104 Z" fill="#2e2e36" stroke="#6a6a78" stroke-width=".8"/>
        <path d="M54 98 L66 98 L60 106 Z" fill="#74c2a8"/><path d="M38 114 L82 114" stroke="#e6c25e" stroke-width="1.2"/>`,
    },
    {
      id: 'jean', name: 'Jean', element: 'Anemo',
      skin: '#fff1ec', hair: '#e8d4a4', hairStops: [[0, '#f0dcb0'], [0.6, '#e2cc98'], [1, '#ccb07a']], hairLine: '#9a8050', shineCol: '#ffffff',
      eyes: '#4a88d8', eyeTop: '#1a3a7a', eyeLow: '#c8e4ff', lash: '#3a2a1e',
      sleeve: '#f4f4f6', cuff: '#1e3a6a', hands: '#f4f4f6', legs: '#f4f4f6', shoes: '#1e2a3a',
      back: (c) => `${H(c, 'M50 26 Q56 8 70 10 Q66 18 60 30 Z')}${H(c, lock(60, 14, 96, 118, 16, 10))}${nape(c, 96)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(1, 2), ...sideLocks(108, 10)]),
      outfit: () => `
        <path d="M30 96 Q34 80 48 88 L46 104 Z M90 96 Q86 80 72 88 L74 104 Z" fill="#1e3a6a" stroke="#0a1a3a" stroke-width="1"/>
        ${torso('#f4f4f6', '#9aa4b4')}
        <path d="M44 90 L60 102 L76 90 Q60 86 44 90 Z" fill="#1e2a3a"/><path d="M52 94 L60 100 L68 94" fill="none" stroke="#f4f4f6" stroke-width="1.2"/>
        <path d="M36 116 L84 116 L85 124 Q60 132 35 124 Z" fill="#1e3a6a"/><path d="M40 112 L80 112" stroke="#e6c25e" stroke-width="1.2"/>`,
    },
    {
      id: 'kachina', name: 'Kachina', element: 'Geo',
      skin: '#fdeee4', hair: '#e8d8b4', hairStops: [[0, '#f0e2c2'], [0.6, '#e2d0a6'], [1, '#c8b488']], hairLine: '#9a8660', shineCol: '#ffffff',
      eyes: '#3ab0e8', eyeTop: '#12508a', eyeLow: '#c8f4ff', lash: '#3a2a1e',
      sleeve: '#6aa83a', cuff: '#e6c25e', hands: '#fdeee4', legs: '#3a3a2e', shoes: '#6a4a2a',
      back: (c) => `${both('<circle cx="34" cy="20" r="11" fill="#3a2a2e" stroke="#e6c25e" stroke-width="2"/>')}${nape(c, 94)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 4), ...sideLocks(96, 10)]) + both(braid(c, [[30, 90], [29, 98], [29, 106], [30, 114]], 4.2)),
      front: () => `
        <path d="M28 44 Q24 16 60 14 Q96 16 92 44 Q60 36 28 44 Z" fill="#f4f0e2" stroke="#8a7a50" stroke-width="1.2"/>
        <path d="M28 44 Q60 34 92 44 L90 38 Q60 28 30 38 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M60 14 L72 26 L60 38 L48 26 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1.1"/><path d="M60 20 L66 26 L60 32 L54 26 Z" fill="#d86a3a"/>
        <path d="M60 48 L64 56 L56 56 Z" fill="#3ab070" stroke="#1a5a3a" stroke-width=".8"/>`,
      outfit: () => `${torso('#6aa83a', '#3a6a1a')}
        <path d="M44 90 Q60 86 76 90 L72 98 Q60 102 48 98 Z" fill="#f4f0e2"/>
        <path d="M40 108 L80 108" stroke="#e6c25e" stroke-width="2"/><path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#3a3a2e"/>`,
    },
    {
      id: 'keqing', name: 'Keqing', element: 'Electro',
      skin: '#fff1ee', hair: '#8a78b8', hairStops: [[0, '#9a88c8'], [0.6, '#8472b2'], [1, '#6a5a9a']], shineCol: '#d4c8f4',
      eyes: '#c05a9a', eyeTop: '#5a1a4a', eyeLow: '#ffc8ec', lash: '#2a1e3a',
      sleeve: '#3a2e5a', cuff: '#f4f0f8', hands: '#2a2240', legs: '#2a2240', shoes: '#1a1628',
      back: (c) => `${both(H(c, 'M40 34 L26 6 Q42 12 52 28 Z') + H(c, lock(28, 50, 12, 136, 16, -6)))}${nape(c, 98)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 3), ...sideLocks(108, 11)]),
      front: () => `<path d="M76 30 Q86 24 92 30 L84 36 Z" fill="#d8b460" stroke="#6a5020" stroke-width=".9"/><circle cx="85" cy="30" r="2" fill="#af8ec1"/>`,
      outfit: () => `${torso('#3a2e5a', '#1a1430')}
        <path d="M46 90 L60 104 L74 90 Q60 86 46 90 Z" fill="#f4f0f8"/><path d="M50 92 L60 100 L70 92" fill="none" stroke="#6a4aa8" stroke-width="1.2"/>
        ${gem(60, 106, 3.4, '#af8ec1', '#d8b460')}<path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#6a4aa8"/>`,
    },
    {
      id: 'kirara', name: 'Kirara', element: 'Dendro',
      skin: '#fff1ea', hair: '#d8c8a8', hairStops: [[0, '#e2d4b6'], [0.6, '#d2c09c'], [1, '#b8a47e']], hairLine: '#8a7a5a', shineCol: '#ffffff',
      eyes: '#4ab050', eyeTop: '#1a5a1e', eyeLow: '#d4ffb8', lash: '#3a2a1e', pupil: 'slit',
      sleeve: '#f4f4ee', cuff: '#3a7a3a', hands: '#fff1ea', legs: '#2a2a2a', shoes: '#3a2a22',
      back: (c) => `${longHair(c, 132, 2)}${H(c, CROWN)}`,
      ears: () => both('<path d="M38 36 L26 10 Q44 14 52 30 Z" fill="#4a3228" stroke="#1e120e" stroke-width="1"/><path d="M38 30 L32 16 Q42 20 46 28 Z" fill="#8ab8d8"/>'),
      bangs: (c) => fringe(c, [...bangsList(0, 3), ...sideLocks(118, 12)]),
      front: () => `<path d="M40 64 L46 60 M44 66 L50 62 M74 60 L80 64 M70 62 L76 66" stroke="#f2c14e" stroke-width="1.8" stroke-linecap="round"/>`,
      outfit: () => `${torso('#f4f4ee', '#b8b4a4')}
        <path d="M48 90 Q60 94 72 90 L72 94 Q60 98 48 94 Z" fill="#1e1e1e"/><path d="M60 96 L61.4 99 L64 99.6 L61.4 100.4 L60 103 L58.6 100.4 L56 99.6 L58.6 99 Z" fill="#fafafa"/>
        <path d="M36 116 L84 116 L85 124 Q60 132 35 124 Z" fill="#3a7a3a"/><path d="M40 108 L80 108" stroke="#a5c83b" stroke-width="1.6"/>`,
      extra: () => both('<path d="M34 124 Q20 124 16 112 Q14 102 20 96 Q22 106 26 112 Q30 118 36 118 Z" fill="#4a3228" stroke="#1e120e" stroke-width="1"/>'),
    },
    {
      id: 'klee', name: 'Klee', element: 'Pyro',
      skin: '#fff1ea', hair: '#f4dcac', hairStops: [[0, '#f8e6c0'], [0.6, '#f0d6a0'], [1, '#e0c080']], hairLine: '#a8885a', shineCol: '#ffffff',
      eyes: '#e0402f', eyeTop: '#851612', eyeLow: '#ffb070', lash: '#3a1e14',
      sleeve: '#c8302a', cuff: '#f4f0e6', hands: '#8a4a2a', legs: '#f4f0e6', shoes: '#6a3a22',
      back: (c) => `${both(H(c, lock(30, 72, 14, 108, 18, -6)))}${nape(c, 92)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M33 72 L10 62 Q16 80 34 84 Z" fill="${c.skin}" ${line('#d9b8a8')}/>`),
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(92, 10)]),
      front: () => `
        <path d="M26 44 Q22 16 58 14 Q96 14 94 40 Q60 34 26 44 Z" fill="#c8302a" stroke="#6a0e0e" stroke-width="1.2"/>
        <path d="M26 44 Q60 32 94 40 L94 46 Q60 38 28 48 Z" fill="#8a1e1a"/>
        ${[[0, -3], [3, 0], [0, 3], [-3, 0]].map(([dx, dy]) => `<circle cx="${60 + dx}" cy="${24 + dy}" r="2.8" fill="#fff4e0"/>`).join('')}
        <path d="M88 26 Q104 20 108 36 Q98 28 90 32 Z" fill="#fafafa" stroke="#b8b0a8" stroke-width=".8"/>
        <circle cx="86" cy="34" r="4.5" fill="#6a3a22" stroke="#3a1e10" stroke-width=".8"/>`,
      outfit: () => `${torso('#c8302a', '#6a0e0e')}
        <path d="M44 90 Q60 86 76 90 L72 98 Q60 102 48 98 Z" fill="#f4f0e6"/>${gem(60, 98, 3, '#ef7a35', '#e6c25e')}
        <path d="M36 116 L84 116 L85 124 Q60 132 35 124 Z" fill="#6a3a22"/>
        <rect x="68" y="104" width="12" height="12" rx="3" fill="#c8302a" stroke="#6a0e0e" stroke-width="1"/><circle cx="74" cy="110" r="2.2" fill="#f2c14e"/>`,
    },
    {
      id: 'kokomi', name: 'Sangonomiya Kokomi', element: 'Hydro',
      skin: '#fff2ee', hair: '#f6c4c8', hairStops: [[0, '#fad2d6'], [0.55, '#f4bcc2'], [1, '#8ab8e8']], hairLine: '#b87a8a', shineCol: '#ffffff',
      eyes: '#7a8ad8', eyeTop: '#2a3a8a', eyeLow: '#e0e8ff', lash: '#3a2a3a',
      sleeve: '#f7f7fa', cuff: '#4a78c8', sleeveStyle: 'wide', hands: '#fff2ee', legs: '#f7f7fa', shoes: '#2a3a6a',
      back: (c) => `${bow(60, 20, '#f8d0dc', '#e08aa0', 1.8)}${longHair(c, 140, 2)}${H(c, CROWN)}`,
      ears: () => both('<path d="M32 50 Q18 40 16 26 Q24 34 30 30 Q28 40 36 44 Z" fill="#8a6ad8" stroke="#3a2a7a" stroke-width="1"/>'),
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 65 L${x - 2} 62 L${x - 4} 65`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 65 ${notch} L29 65 Z`) + both(H(c, lock(31, 54, 30, 112, 11, -1)));
      },
      outfit: () => `${torso('#f7f7fa', '#9aa4c4')}
        <path d="M44 90 Q60 86 76 90 L72 100 Q60 104 48 100 Z" fill="#1e2a4a"/>${gem(60, 96, 3.4, '#4cc2f1', '#e6c25e')}
        <path d="M36 116 L84 116 L85 124 Q60 132 35 124 Z" fill="#4a78c8"/><path d="M40 110 Q60 114 80 110" stroke="#e6c25e" stroke-width="1.2" fill="none"/>`,
    },
    {
      id: 'kuki', name: 'Kuki Shinobu', element: 'Electro', noMouth: true,
      skin: '#fff1ec', hair: '#9ad05a', hairStops: [[0, '#a8dc6a'], [0.6, '#90c852'], [1, '#6aa83a']], hairLine: '#4a7a2a', shineCol: '#e4ffb8',
      eyes: '#9a5ad0', eyeTop: '#4a1a7a', eyeLow: '#f0d4ff', lash: '#2a2a1a',
      sleeve: '#2a2432', cuff: '#7a4ab0', hands: '#1e1a22', legs: '#1e1a22', shoes: '#141018',
      back: (c) => `${H(c, lock(70, 18, 98, 110, 16, 8))}${nape(c, 98)}${both('<path d="M34 40 Q16 30 20 14 Q30 12 32 22 Q26 24 28 30 Q34 34 40 34 Z" fill="#8a1e30" stroke="#4a0a14" stroke-width="1"/>')}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 4), ...sideLocks(100, 11)]),
      face: () => `<path d="M34 78 Q40 76 48 82 Q60 76 72 82 Q80 76 86 78 Q84 94 60 98 Q36 94 34 78 Z" fill="#1e1a22" stroke="#000" stroke-width="1"/>
        <path d="M50 86 L60 82 L70 86 L60 92 Z" fill="#3a3040"/><path d="M56 84 L60 88 L64 84" stroke="#d8b460" stroke-width="1" fill="none"/>`,
      front: () => both('<path d="M30 80 L30 88" stroke="#d8b460" stroke-width="1.2"/><path d="M27 88 L33 88 L34 102 L26 102 Z" fill="#c42a3a" stroke="#6a0e16" stroke-width=".8"/>'),
      outfit: () => `${torso('#2a2432', '#0e0a14')}
        <path d="M44 96 L76 96 L74 106 L46 106 Z" fill="#7a4ab0"/><path d="M48 100 L72 100" stroke="#d8b460" stroke-width="1"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#3a2e4a"/>`,
    },
    {
      id: 'lanyan', name: 'Lan Yan', element: 'Anemo',
      skin: '#fff2ee', hair: '#1e1e2a', hairStops: [[0, '#26263a'], [0.6, '#1c1c2a'], [1, '#1a3a44']], shineCol: '#6a7a9a',
      eyes: '#8a6ad8', eyeTop: '#3a2a7a', eyeLow: '#e0d4ff', lash: '#141420',
      sleeve: '#f4f4f8', cuff: '#3ab0a8', sleeveStyle: 'wide', hands: '#fff2ee', legs: '#f4f4f8', shoes: '#2a3a44',
      back: (c) => `${longHair(c, 136, 2)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(-1, 2), ...sideLocks(120, 12)])
        + `<path d="${lock(33, 70, 31, 120, 4, -2)} ${lock(87, 70, 89, 120, 4, 2)}" fill="#3ab0a8" opacity=".8"/>`,
      front: () => `<path d="M34 40 Q60 24 86 40" fill="none" stroke="#f4f4f8" stroke-width="4"/>
        <path d="M34 40 Q60 24 86 40" fill="none" stroke="#9aa4b4" stroke-width="1" stroke-dasharray="2 2"/>
        <path d="M78 34 Q92 18 100 20 Q94 26 96 32 Q88 30 84 40 Z" fill="#e4e8f0" stroke="#7a8494" stroke-width="1"/>`,
      outfit: () => `${torso('#f4f4f8', '#9aa4b4')}
        <path d="M46 90 L60 102 L74 90 Q60 86 46 90 Z" fill="#3ab0a8"/><path d="M40 110 L80 110" stroke="#1e1e2a" stroke-width="2.4"/>
        ${gem(60, 110, 3, '#74c2a8', '#e6c25e')}`,
    },
    {
      id: 'lauma', name: 'Lauma', element: 'Dendro',
      skin: '#fff3f0', hair: '#4a5068', hairStops: [[0, '#565c76'], [0.6, '#464c64'], [1, '#383c52']], shineCol: '#9aa4c8',
      eyes: '#5a9ad8', eyeTop: '#1a3a7a', eyeLow: '#d0ecff', lash: '#1e2030',
      sleeve: '#2a2a36', cuff: '#a5c83b', hands: '#fff3f0', legs: '#2a2a36', shoes: '#1a1a24',
      back: (c) => `${both('<path d="M40 30 Q30 18 34 4 M36 16 Q28 14 24 8 M34 10 Q40 6 42 2" fill="none" stroke="#6a78a0" stroke-width="2.6" stroke-linecap="round"/>')}
        ${longHair(c, 138, 3)}${H(c, CROWN)}<path d="M100 18 a7 7 0 1 0 6 10 a5.5 5.5 0 1 1 -6 -10 Z" fill="#e6d49a" stroke="#8a7a4a" stroke-width=".8"/>`,
      ears: (c) => both(`<path d="M33 72 L14 62 Q18 78 34 84 Z" fill="${c.skin}" ${line('#d9b8b0')}/>`),
      bangs: (c) => fringe(c, [...bangsList(0, 2), [64, 40, 74, 84, 14, 3], [72, 42, 82, 84, 13, 2], ...sideLocks(124, 12)]),
      outfit: () => `${torso('#2a2a36', '#0e0e16')}
        <path d="M46 90 Q60 94 74 90 L72 96 Q60 100 48 96 Z" fill="#e6d49a"/>${gem(60, 101, 3.6, '#a5c83b', '#e6d49a')}
        <path d="M40 112 L80 112" stroke="#a5c83b" stroke-width="1.2"/>`,
    },
    {
      id: 'layla', name: 'Layla', element: 'Cryo',
      skin: '#fff2ee', hair: '#2e3a78', hairStops: [[0, '#384690'], [0.6, '#2c3874'], [1, '#6a90d8']], shineCol: '#8a9ae0',
      eyes: '#e0a83a', eyeTop: '#7a4a10', eyeLow: '#fff0b0', lash: '#1a1a30',
      sleeve: '#2a3a8a', cuff: '#e6c25e', hands: '#fff2ee', legs: '#1e2450', shoes: '#141a3a',
      back: (c) => `<path d="M28 30 Q10 70 18 124 L102 124 Q110 70 92 30 Z" fill="#2a3a8a" stroke="#0e1640" stroke-width="1.2"/>${longHair(c, 130, 1)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M33 72 L16 64 Q20 78 34 84 Z" fill="${c.skin}" ${line('#d9b8b0')}/>`),
      bangs: (c) => fringe(c, [...bangsList(-2, 4), ...sideLocks(118, 12)]),
      front: () => `
        <path d="M22 48 Q26 10 60 6 Q94 10 98 48 Q90 30 60 26 Q30 30 22 48 Z" fill="#2a3a8a" stroke="#0e1640" stroke-width="1.2"/>
        <path d="M30 36 Q60 20 90 36" fill="none" stroke="#e6c25e" stroke-width="2"/>
        <path d="M60 18 L64 26 L72 28 L64 31 L60 40 L56 31 L48 28 L56 26 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".9"/><circle cx="60" cy="29" r="2" fill="#4a78d8"/>`,
      outfit: () => `${torso('#2a3a8a', '#0e1640')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#f4e8d0"/>${gem(60, 102, 3.2, '#9fd6e3', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#1e2450"/><path d="M38 112 L82 112" stroke="#e6c25e" stroke-width="1.2"/>`,
    },
    {
      id: 'linnea', name: 'Linnea', element: 'Geo',
      skin: '#fff1ee', hair: '#f6c0c4', hairStops: [[0, '#fad0d2'], [0.6, '#f2b4ba'], [1, '#e89aa4']], hairLine: '#b87080', shineCol: '#ffffff',
      eyes: '#e0406a', eyeTop: '#7a102a', eyeLow: '#ffc0d4', lash: '#4a2030',
      sleeve: '#f7f4f4', cuff: '#c42a3a', hands: '#fff1ee', legs: '#f7f4f4', shoes: '#6a2a34',
      back: (c) => `${both(H(c, 'M34 44 Q14 36 6 16 Q20 18 30 26 Q34 32 40 34 Z') + '<path d="M10 20 Q20 26 30 32" stroke="#6ad8e0" stroke-width="2" fill="none"/>')}
        ${nape(c, 104, 2)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M33 72 L12 64 Q18 80 34 84 Z" fill="${c.skin}" ${line('#d9b8b0')}/>`),
      bangs: (c) => fringe(c, [...bangsList(1, 3), ...sideLocks(108, 12)]),
      front: () => both('<path d="M38 30 Q34 20 38 12 Q42 20 44 28 Z" fill="#3a2a3a" stroke="#000" stroke-width=".8"/>')
        + '<path d="M40 44 L50 40 L48 48 Z" fill="#c8f0ff" stroke="#6a9ab8" stroke-width=".8"/>',
      outfit: () => `${torso('#f2b4ba', '#a86a74')}
        <path d="M44 90 L60 98 L76 90 L74 96 L60 104 L46 96 Z" fill="#f7f4f4" stroke="#b8b0b0" stroke-width=".8"/>
        <path d="M56 98 L64 98 L62 110 L60 112 L58 110 Z" fill="#c42a3a"/><path d="M38 116 L82 116" stroke="#fab72e" stroke-width="1.4"/>`,
    },
    {
      id: 'lisa', name: 'Lisa', element: 'Electro',
      skin: '#fff0ea', hair: '#a8927a', hairStops: [[0, '#b49e86'], [0.6, '#a08a72'], [1, '#86725c']], shineCol: '#e4d4c0',
      eyes: '#3ab050', eyeTop: '#12581e', eyeLow: '#c8ffb8', lash: '#2a1e1a',
      sleeve: '#3a2a5a', cuff: '#f4f0f8', hands: '#fff0ea', legs: '#2a2240', shoes: '#1a1628',
      back: (c) => `${both(`${H(c, lock(30, 60, 16, 116, 18, -6))}${H(c, 'M18 98 Q10 106 18 114 Q24 110 20 104 Z')}`)}${nape(c, 100, 2)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(2, 2), ...sideLocks(100, 12)]),
      front: () => `
        <path d="M6 44 Q30 32 60 34 Q94 30 118 42 Q96 52 60 48 Q26 52 6 44 Z" fill="#3a2a6a" stroke="#140a30" stroke-width="1.2"/>
        <path d="M34 38 Q38 20 54 12 Q66 4 84 6 Q70 16 84 38 Z" fill="#4a3a80" stroke="#140a30" stroke-width="1.2"/>
        <path d="M36 36 Q60 30 84 36" fill="none" stroke="#e6c25e" stroke-width="1.6"/>
        ${flower(40, 30, 10, '#6a6ad8', '#2a2a6a')}${flower(34, 38, 6, '#8a8ae8', '#2a2a6a')}`,
      outfit: () => `${torso('#3a2a5a', '#140a30')}
        <path d="M46 90 L60 104 L74 90 Q60 86 46 90 Z" fill="#f4f0f8"/>${gem(60, 104, 3.6, '#af8ec1', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#5a4a8a"/>`,
    },
    {
      id: 'lynette', name: 'Lynette', element: 'Anemo',
      skin: '#fff2ee', hair: '#c8c4c8', hairStops: [[0, '#d6d2d6'], [0.6, '#c2bec2'], [1, '#a8a4a8']], hairLine: '#7a767a', shineCol: '#ffffff',
      eyes: '#8a6ad8', eyeTop: '#3a2a7a', eyeLow: '#e4d8ff', lash: '#2a2a30',
      sleeve: '#f4f4f6', cuff: '#1e5a6a', hands: '#1e1e24', legs: '#1e1e24', shoes: '#141418',
      back: (c) => `<path d="M60 96 L12 78 Q4 100 16 116 L60 104 L104 116 Q116 100 108 78 Z" fill="#1e7a7a" stroke="#0a3a3a" stroke-width="1.2"/>
        <path d="M20 86 L30 96 L20 106 M100 86 L90 96 L100 106" stroke="#4ab0a8" stroke-width="1" fill="none"/>${nape(c, 98)}${H(c, CROWN)}`,
      ears: () => both('<path d="M38 36 L28 8 Q46 14 52 30 Z" fill="#c8c4c8" stroke="#6a666a" stroke-width="1"/><path d="M38 30 L33 16 Q42 20 46 28 Z" fill="#f4d4c8"/>'),
      bangs: (c) => fringe(c, [...bangsList(0, 0), ...sideLocks(96, 10)]) + `<path d="${lock(82, 46, 88, 72, 6, 1)}" fill="#3ab0b0" opacity=".85"/>`,
      face: () => '<path d="M78 82 L79 84.4 L81.4 85 L79 85.6 L78 88 L77 85.6 L74.6 85 L77 84.4 Z" fill="#c05a3a"/>',
      outfit: () => `${torso('#1e1e24', '#0a0a0c')}
        <path d="M48 90 L60 100 L72 90 Q60 86 48 90 Z" fill="#f4f4f6"/><circle cx="60" cy="100" r="2.2" fill="#e6c25e"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#1e5a6a"/>`,
    },
    {
      id: 'mavuika', name: 'Mavuika', element: 'Pyro',
      skin: '#fdeee6', hair: '#e04a22', hairStops: [[0, '#e8561e'], [0.5, '#dc4420'], [1, '#f6a030']], hairLine: '#8a1e0e', shineCol: '#ffc080',
      eyes: '#f08a2a', eyeTop: '#8a2a0a', eyeLow: '#ffe0a0', lash: '#3a1410',
      sleeve: '#1e1a1a', cuff: '#e6c25e', hands: '#1e1a1a', legs: '#1e1a1a', shoes: '#3a2a1a',
      back: (c) => `${longHair(c, 136, 8)}${both(H(c, lock(30, 50, 8, 90, 14, -6)) + H(c, lock(32, 70, 14, 124, 14, -4)))}${H(c, 'M54 24 Q60 4 72 8 Q64 14 66 24 Z')}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 46, 26, 74, 11, -5], [44, 41, 36, 76, 11, -3], [53, 40, 48, 72, 10, -2], [62, 40, 62, 70, 9, 0],
        [70, 41, 76, 72, 10, 2], [78, 43, 88, 76, 10, 4], [86, 48, 96, 78, 9, 4], ...sideLocks(118, 13),
      ]),
      front: () => both('<path d="M30 84 L30 90" stroke="#e6c25e" stroke-width="1"/><path d="M26 90 L34 90 L32 104 L28 104 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".8"/><circle cx="30" cy="95" r="1.4" fill="#d02a2a"/>'),
      outfit: () => `${torso('#1e1a1a', '#0a0808')}
        <path d="M44 90 Q60 86 76 90 L72 102 Q60 106 48 102 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M50 94 L70 94 M52 98 L68 98" stroke="#8a6a2a" stroke-width=".8"/>${gem(60, 104, 3.4, '#ef7a35', '#8a6a2a')}
        <path d="M38 116 L82 116" stroke="#e04a22" stroke-width="2"/>`,
    },
    {
      id: 'mona', name: 'Mona', element: 'Hydro',
      skin: '#fff1ec', hair: '#2e2644', hairStops: [[0, '#382e54'], [0.6, '#2a2240'], [1, '#4a3a7a']], shineCol: '#8a7ab8',
      eyes: '#6a8a9a', eyeTop: '#2a3a4a', eyeLow: '#d0e4ec', lash: '#1a1428',
      sleeve: '#2a2240', cuff: '#e6c25e', hands: '#fff1ec', legs: '#1a1428', shoes: '#1a1428',
      back: (c) => `${both(H(c, lock(30, 56, 12, 136, 16, -6)))}${nape(c, 98)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 3), ...sideLocks(108, 11)]),
      front: () => `
        <path d="M2 48 Q30 34 60 36 Q94 32 118 44 Q96 56 60 50 Q24 56 2 48 Z" fill="#4a2a8a" stroke="#1a0e40" stroke-width="1.2"/>
        <path d="M34 40 Q36 18 60 10 Q78 4 90 10 Q80 18 86 40 Z" fill="#5a3a9a" stroke="#1a0e40" stroke-width="1.2"/>
        <g fill="#e6c25e"><circle cx="20" cy="46" r="1"/><circle cx="96" cy="46" r="1"/><circle cx="72" cy="22" r="1"/></g>
        <circle cx="46" cy="30" r="9" fill="#a82a2a" stroke="#e6c25e" stroke-width="2"/><path d="M46 20 L46 40 M36 30 L56 30 M39 23 L53 37 M53 23 L39 37" stroke="#e6c25e" stroke-width="1.2"/>
        ${bow(30, 38, '#1a1a1e', '#3a3a44', 1.3)}`,
      outfit: () => `${torso('#2a2240', '#0e0a1e')}
        <path d="M46 90 Q60 94 74 90 L72 98 Q60 102 48 98 Z" fill="#1a1428"/>${gem(60, 98, 3.6, '#4cc2f1', '#e6c25e')}
        <path d="M40 110 L80 110" stroke="#e6c25e" stroke-width="1.4"/>`,
    },
    {
      id: 'mualani', name: 'Mualani', element: 'Hydro',
      skin: '#b8805e', hair: '#e8eef6', hairStops: [[0, '#f8fbff'], [0.6, '#e2eaf4'], [1, '#a8c4e8']], hairLine: '#7a8aa8', shineCol: '#ffffff',
      eyes: '#e8703a', eyeTop: '#8a2a0a', eyeLow: '#ffd0a0', lash: '#2a1a14',
      sleeve: '#b8805e', cuff: '#4a8ad8', hands: '#b8805e', legs: '#2a4a8a', shoes: '#f4f4f4',
      back: (c) => `${nape(c, 110, 4)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(112, 13)]) + `<path d="M40 50 L46 54 M52 48 L56 52 M68 48 L72 52" stroke="#f2c14e" stroke-width="2" stroke-linecap="round"/>`,
      front: () => `<path d="M30 42 Q60 22 90 42 L88 48 Q60 30 32 48 Z" fill="#2a5aa8" stroke="#0e2a6a" stroke-width="1.1"/>
        <path d="M36 40 Q60 26 84 40" fill="none" stroke="#f4f4f4" stroke-width="1.2" stroke-dasharray="3 2"/>
        <path d="M56 26 Q60 8 70 4 Q66 16 68 26 Z" fill="#f4f8ff" stroke="#7a8aa8" stroke-width="1"/>`,
      outfit: () => `${torso('#2a4a8a', '#0e1e4a')}
        <path d="M44 90 Q60 86 76 90 L72 100 Q60 104 48 100 Z" fill="#f4f4f4" stroke="#9aa4b4" stroke-width=".8"/>
        <path d="M50 94 L60 100 L70 94" fill="none" stroke="#e8703a" stroke-width="1.4"/><path d="M38 112 L82 112" stroke="#f2c14e" stroke-width="1.6"/>`,
    },
    {
      id: 'navia', name: 'Navia', element: 'Geo',
      skin: '#fff1ec', hair: '#f0d496', hairStops: [[0, '#f6dea8'], [0.6, '#ecce8c'], [1, '#d8b46a']], hairLine: '#a8844a', shineCol: '#ffffff',
      eyes: '#4a8ad8', eyeTop: '#1a3a7a', eyeLow: '#d0ecff', lash: '#2a2a1a',
      sleeve: '#1e1e24', cuff: '#e6c25e', hands: '#1e1e24', legs: '#1e1e24', shoes: '#141418',
      back: (c) => `${longHair(c, 136, 5)}${both(H(c, 'M20 110 Q10 120 20 130 Q26 124 22 118 Z'))}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(-2, 3), ...sideLocks(124, 12)]),
      front: () => `<g transform="rotate(-8 60 30)">
        <path d="M0 42 Q30 30 60 32 Q94 28 120 38 Q96 50 60 46 Q24 50 0 42 Z" fill="#1e1e26" stroke="#000" stroke-width="1.2"/>
        <path d="M34 36 Q36 16 60 12 Q84 14 86 34 Z" fill="#26262e" stroke="#000" stroke-width="1.2"/>
        <path d="M36 32 Q60 26 86 32" fill="none" stroke="#e6c25e" stroke-width="1.8"/>
        ${flower(34, 32, 11, '#2a3a6a', '#141a3a')}${flower(26, 40, 7, '#e6c25e', '#8a6a2a')}</g>
        <path d="M86 60 L90 66 L86 72 L82 66 Z" fill="#4a8ad8" stroke="#e6c25e" stroke-width=".9"/>`,
      outfit: () => `${torso('#1e1e24', '#0a0a0c')}
        <path d="M46 90 Q60 94 74 90 L72 98 Q60 102 48 98 Z" fill="#f4f0e8"/>${gem(60, 100, 3.6, '#fab72e', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#f4f0e8"/>`,
    },
    {
      id: 'nefer', name: 'Nefer', element: 'Dendro',
      skin: '#fff3ee', hair: '#1e4a3a', hairStops: [[0, '#265a46'], [0.6, '#1c4636'], [1, '#143428']], shineCol: '#6aa88a',
      eyes: '#3ab070', eyeTop: '#0e5a2e', eyeLow: '#c8ffd8', lash: '#0e1e18',
      sleeve: '#1a2a24', cuff: '#e6c25e', hands: '#fff3ee', legs: '#1a2a24', shoes: '#0e1814',
      back: (c) => `${nape(c, 104, 3)}${H(c, CROWN)}`,
      ears: () => both('<path d="M32 70 L14 60 L20 76 L32 80 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>'),
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 64 L${x - 2} 61 L${x - 4} 64`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 64 ${notch} L29 64 Z`) + both(H(c, 'M29 54 L28 102 L38 100 L38 58 Z') + '<path d="M29 98 L33 112 L37 98 Z" fill="#3ad08a"/>');
      },
      front: () => `<path d="M34 40 Q60 24 86 40" fill="none" stroke="#e6c25e" stroke-width="2.4"/>
        <path d="M60 28 L66 38 L60 46 L54 38 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".9"/><path d="M60 32 L63 38 L60 42 L57 38 Z" fill="#3ad08a"/>
        ${both('<path d="M42 34 L46 40 L38 40 Z" fill="#3ad08a" stroke="#8a6a2a" stroke-width=".6"/>')}`,
      face: () => '<circle cx="45" cy="84" r=".9" fill="#1e3a2a"/>',
      outfit: () => `${torso('#1a2a24', '#0a100e')}
        <path d="M44 90 Q60 86 76 90 L72 100 Q60 104 48 100 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".9"/>
        ${gem(60, 101, 3.2, '#3ad08a', '#8a6a2a')}<path d="M40 114 L80 114" stroke="#3ad08a" stroke-width="1.4"/>`,
    },
    {
      id: 'nicole', name: 'Nicole', element: 'Pyro',
      skin: '#fff2ee', hair: '#f4d0b0', hairStops: [[0, '#f8dcc0'], [0.6, '#f0c8a6'], [1, '#e8b090']], hairLine: '#b08a6a', shineCol: '#ffffff',
      eyes: '#9a8ad8', eyeTop: '#3a3a7a', eyeLow: '#e8e0ff', lash: '#3a2a2a',
      sleeve: '#f7f4f4', cuff: '#e6c25e', hands: '#fff2ee', legs: '#f7f4f4', shoes: '#6a4a3a',
      back: (c) => `${nape(c, 104, 3)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M33 72 L12 64 Q18 80 34 84 Z" fill="${c.skin}" ${line('#d9b8b0')}/>`),
      bangs: (c) => fringe(c, [...bangsList(0, 3), ...sideLocks(110, 12)]),
      front: () => `<g transform="rotate(-10 60 30)">
        <path d="M28 44 Q24 16 60 12 Q96 16 92 42 Q60 34 28 44 Z" fill="#f7f4f0" stroke="#9a8a7a" stroke-width="1.2"/>
        <path d="M28 44 Q60 34 92 42 L90 36 Q60 28 30 38 Z" fill="#e6a84a" stroke="#8a5a1a" stroke-width="1"/>
        <path d="M52 22 Q60 10 68 22 L60 34 Z" fill="#fafafa" stroke="#8a6a2a" stroke-width="1"/><path d="M56 22 L60 16 L64 22 L60 28 Z" fill="#8a6ad8"/>
        <path d="M90 40 Q104 28 108 40 Q100 38 96 46 Z" fill="#e6a84a" stroke="#8a5a1a" stroke-width=".9"/></g>`,
      outfit: () => `${torso('#f7f4f4', '#b8b0b0')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#3a3a5a"/>${gem(60, 104, 3.4, '#ef7a35', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#e6c25e"/>`,
    },
    {
      id: 'nilou', name: 'Nilou', element: 'Hydro',
      skin: '#fff1ec', hair: '#d8422e', hairStops: [[0, '#e24e36'], [0.6, '#d23e2c'], [1, '#b8301e']], hairLine: '#7a1a0e', shineCol: '#ffa080',
      eyes: '#3ac0c8', eyeTop: '#0e5a6a', eyeLow: '#c8fff8', lash: '#3a1410',
      sleeve: '#f7f4f8', cuff: '#e6c25e', hands: '#fff1ec', legs: '#f7f4f8', shoes: '#2a4a8a',
      back: (c) => `<path d="M28 30 Q8 70 16 128 L104 128 Q112 70 92 30 Z" fill="#f7f4f8" fill-opacity=".85" stroke="#9aa4c4" stroke-width="1"/>
        ${nape(c, 110, 3)}${both(H(c, lock(30, 60, 24, 118, 12, -2)))}${H(c, CROWN)}`,
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 64 L${x - 2} 61 L${x - 4} 64`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 64 ${notch} L29 64 Z`);
      },
      front: () => `${both('<path d="M40 32 Q22 26 22 8 Q30 18 44 22 Z" fill="#1e2a5a" stroke="#0a0e2a" stroke-width="1"/><path d="M36 28 L26 20" stroke="#e6c25e" stroke-width="1.2"/>')}
        <path d="M36 34 Q60 22 84 34" fill="none" stroke="#e6c25e" stroke-width="2.4"/>
        <path d="M60 28 L60 44" stroke="#e6c25e" stroke-width="1.2"/><path d="M57 44 L63 44 L60 52 Z" fill="#e6c25e"/>
        ${[44, 52, 68, 76].map((x) => `<circle cx="${x}" cy="${x < 60 ? 30 + (60 - x) / 6 : 30 + (x - 60) / 6}" r="1.5" fill="#e6c25e"/>`).join('')}`,
      outfit: () => `${torso('#f7f4f8', '#9aa4c4')}
        <path d="M44 90 Q60 86 76 90 L72 102 Q60 106 48 102 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>
        <path d="M48 96 L72 96" stroke="#8a6a2a" stroke-width=".8"/>${gem(60, 104, 3.2, '#4cc2f1', '#8a6a2a')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#2a4a8a"/>`,
    },
    {
      id: 'ningguang', name: 'Ningguang', element: 'Geo',
      skin: '#fff2ee', hair: '#f2eee6', hairStops: [[0, '#fcfaf4'], [0.6, '#eeeae0'], [1, '#d4ccbc']], hairLine: '#9a9284', shineCol: '#ffffff',
      eyes: '#c83a3a', eyeTop: '#6a1010', eyeLow: '#ffb0a0', lash: '#3a2a26',
      sleeve: '#1e1a1a', cuff: '#e6c25e', sleeveStyle: 'wide', hands: '#fff2ee', legs: '#1e1a1a', shoes: '#141010',
      back: (c) => `${both(H(c, 'M38 36 L26 10 Q42 14 50 28 Z'))}${longHair(c, 140, 2)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(124, 12)]),
      front: () => `<path d="M60 28 L60 46" stroke="#c42a2a" stroke-width="2.6" stroke-linecap="round"/><circle cx="60" cy="30" r="2" fill="#e6c25e"/>
        <path d="M54 26 Q60 18 66 26 Q62 30 60 26 Q58 30 54 26 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".9"/>
        <path d="M60 22 Q56 16 60 12 Q64 16 60 22" fill="none" stroke="#e6c25e" stroke-width="1.4"/>`,
      outfit: () => `${torso('#1e1a1a', '#0a0808')}
        <path d="M46 90 L60 104 L74 90 Q60 86 46 90 Z" fill="#e6c25e"/><path d="M50 92 L60 100 L70 92" fill="none" stroke="#8a6a2a" stroke-width="1"/>
        ${gem(60, 108, 3.6, '#fab72e', '#e6c25e')}<path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#f2eee6"/>`,
    },
    {
      id: 'noelle', name: 'Noelle', element: 'Geo',
      skin: '#fff1ec', hair: '#c8c8cc', hairStops: [[0, '#d8d8dc'], [0.6, '#c4c4c8'], [1, '#a4a4aa']], hairLine: '#6a6a72', shineCol: '#ffffff',
      eyes: '#5a9a5a', eyeTop: '#1e4a1e', eyeLow: '#d4f4c8', lash: '#2a2a2a',
      sleeve: '#1e1e2a', cuff: '#f4f4f8', hands: '#f4f4f8', legs: '#f4f4f8', shoes: '#1e1e2a',
      back: (c) => `${nape(c, 96)}${H(c, CROWN)}`,
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 66 L${x - 2} 63 L${x - 4} 66`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 66 ${notch} L29 66 Z`) + both(H(c, lock(31, 54, 30, 96, 10, -1)));
      },
      front: () => `<path d="M36 38 Q60 24 84 38" fill="none" stroke="#fafafc" stroke-width="5"/>
        <path d="M38 36 Q60 24 82 36" fill="none" stroke="#b8b8c4" stroke-width="1" stroke-dasharray="3 1.6"/>
        <path d="M50 30 L50 22 L56 26 L60 18 L64 26 L70 22 L70 30 Z" fill="#fafafc" stroke="#9a9aa8" stroke-width=".9"/>
        ${both(flower(30, 48, 8, '#b82a3a', '#6a0e16'))}`,
      outfit: () => `${torso('#1e1e2a', '#0a0a10')}
        <path d="M46 90 L60 98 L74 90 L72 108 Q60 112 48 108 Z" fill="#f4f4f8" stroke="#9aa4b4" stroke-width=".8"/>
        ${bow(60, 94, '#b82a3a', '#6a0e16', 0.8)}<path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#f4f4f8"/>
        <path d="M76 94 Q88 92 88 104 L80 108 Z" fill="#c8c8d0" stroke="#6a6a78" stroke-width="1"/>`,
    },
    {
      id: 'odette', name: 'Odette', element: 'Cryo',
      skin: '#fff3f0', hair: '#b4d4f2', hairStops: [[0, '#c8e0f8'], [0.6, '#aacef0'], [1, '#86b4e4']], hairLine: '#5a8ab8', shineCol: '#ffffff',
      eyes: '#9a72e0', eyeTop: '#442a8a', eyeLow: '#ecdcff', lash: '#2a2a44',
      sleeve: '#f7f7fb', cuff: '#8ab8e8', hands: '#fff3f0', legs: '#f7f7fb', shoes: '#4a6a9a',
      back: (c) => `<path d="M36 34 Q16 20 20 2 Q30 14 44 22 Z M30 30 Q12 26 8 12 Q20 18 36 24 Z" fill="#fafcff" stroke="#9ab0c8" stroke-width="1"/>
        ${nape(c, 106, 5)}${both(H(c, lock(30, 60, 16, 104, 12, -5)))}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [
        [36, 46, 28, 72, 11, -4], [44, 42, 38, 74, 10, -2], [52, 40, 50, 70, 10, -1], [60, 40, 62, 72, 9, 1],
        [68, 40, 74, 70, 10, 2], [77, 42, 86, 72, 10, 4], [85, 48, 94, 74, 9, 4], ...sideLocks(108, 11),
      ]),
      front: () => `<path d="M46 34 Q60 26 74 34" fill="none" stroke="#e8f0fa" stroke-width="2"/>
        <path d="M60 22 L65 30 L60 40 L55 30 Z" fill="#dff0ff" stroke="#8ab0d8" stroke-width=".9"/><circle cx="60" cy="31" r="1.8" fill="#4cc2f1"/>`,
      outfit: () => `${torso('#f7f7fb', '#9aa8c4')}
        <path d="M46 90 L60 102 L74 90 Q60 86 46 90 Z" fill="#dce8f8"/>${gem(60, 104, 3.4, '#9fd6e3', '#c8d4e8')}
        <path d="M36 118 Q60 126 84 118" fill="none" stroke="#8ab8e8" stroke-width="1.6"/>`,
    },
    {
      id: 'prune', name: 'Prune', element: 'Anemo',
      skin: '#fff2ee', hair: '#3a48b8', hairStops: [[0, '#4656c8'], [0.6, '#3642ac'], [1, '#28328a']], shineCol: '#8a9af0',
      eyes: '#a86ad0', eyeTop: '#4a1a7a', eyeLow: '#f0d4ff', lash: '#1a1a3a',
      sleeve: '#1e1e28', cuff: '#e04a8a', hands: '#1e1e28', legs: '#1e1e28', shoes: '#e04a8a',
      back: (c) => `${H(c, lock(84, 40, 106, 96, 16, 6))}${nape(c, 100)}
        <path d="M88 36 L104 14 L110 32 Z M90 40 L112 38 L102 52 Z" fill="#b8307a" stroke="#5a0e3a" stroke-width="1"/>${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(-1, 3), ...sideLocks(100, 11)]),
      front: () => `<path d="M38 52 L48 48" stroke="#f4f4f4" stroke-width="3" stroke-linecap="round"/>
        <g fill="#f4f4f4"><circle cx="37" cy="51" r="2"/><circle cx="38" cy="54" r="2"/><circle cx="48" cy="46" r="2"/><circle cx="49" cy="49" r="2"/></g>
        <circle cx="90" cy="44" r="3" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".8"/>`,
      outfit: () => `${torso('#1e1e28', '#0a0a10')}
        <path d="M48 90 Q60 94 72 90 L72 94 Q60 98 48 94 Z" fill="#3a3a44"/><rect x="57" y="93" width="6" height="4" fill="#c8c8d0"/>
        <path d="M38 96 L50 92 L50 110 L36 108 Z M82 96 L70 92 L70 110 L84 108 Z" fill="#e04a8a"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#2a2a38"/>`,
    },
    {
      id: 'qiqi', name: 'Qiqi', element: 'Cryo',
      skin: '#fbf2f6', hair: '#c8bce4', hairStops: [[0, '#d4caec'], [0.6, '#c2b6e0'], [1, '#a898cc']], hairLine: '#7a6aa0', shineCol: '#ffffff',
      eyes: '#e0508a', eyeTop: '#7a1a44', eyeLow: '#ffc8e0', lash: '#3a2a4a',
      sleeve: '#3a3a7a', cuff: '#f4f0f4', sleeveStyle: 'wide', hands: '#fbf2f6', legs: '#f4f0f4', shoes: '#2a2a5a',
      back: (c) => `${nape(c, 96)}${H(c, lock(84, 60, 92, 118, 8, 2))}${braid(c, [[92, 100], [93, 108], [94, 116]], 3.6)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(96, 10)]),
      front: () => `
        <path d="M32 42 Q28 18 60 16 Q92 18 88 42 Z" fill="#3a2a6a" stroke="#140a30" stroke-width="1.2"/>
        <path d="M30 42 Q60 34 90 42 L90 46 Q60 38 30 46 Z" fill="#2a1e4a"/>
        <circle cx="60" cy="18" r="3.4" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".8"/>
        <path d="M48 36 L60 34 L62 66 L50 68 Z" fill="#f4e8b0" stroke="#b8a060" stroke-width=".9"/>
        <path d="M52 42 L58 41 M52 48 L59 47 M53 54 L59 53 M53 60 L60 59" stroke="#c42a2a" stroke-width="1"/>
        <circle cx="84" cy="52" r="4" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".8"/><rect x="82.6" y="50.6" width="2.8" height="2.8" fill="#8a6a2a"/>`,
      outfit: () => `${torso('#3a3a7a', '#1a1a44')}
        <path d="M46 90 Q60 86 74 90 L72 98 Q60 102 48 98 Z" fill="#f4f0f4"/>${bow(60, 98, '#e0508a', '#8a1a44', 0.9)}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#f4f0f4"/><path d="M52 106 L68 106 M52 112 L68 112" stroke="#e6c25e" stroke-width="1"/>`,
    },
    {
      id: 'rosaria', name: 'Rosaria', element: 'Cryo',
      skin: '#fbeeee', hair: '#7a2a3a', hairStops: [[0, '#862e42'], [0.6, '#722636'], [1, '#b8202e']], shineCol: '#c86a7a',
      eyes: '#c84a6a', eyeTop: '#5a0e24', eyeLow: '#ffb8c8', lash: '#2a1016',
      sleeve: '#1e1a1e', cuff: '#e8e4e8', hands: '#1e1a1e', legs: '#1e1a1e', shoes: '#141014',
      back: (c) => `${longHair(c, 136, 3)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(-2, 2), [64, 40, 74, 84, 14, 3], [72, 42, 82, 86, 13, 2], ...sideLocks(122, 12)]),
      front: () => `
        <path d="M30 40 Q60 22 90 40 L88 32 Q60 16 32 32 Z" fill="#1e1a1e" stroke="#000" stroke-width="1"/>
        <path d="M34 34 L30 20 L40 30 L44 14 L50 28 L60 8 L70 28 L76 14 L80 30 L90 20 L86 34 Q60 22 34 34 Z" fill="#26222a" stroke="#000" stroke-width="1"/>
        <path d="M40 30 L44 20 M60 14 L60 26 M80 30 L76 20" stroke="#e8e4e8" stroke-width="1.4"/>`,
      outfit: () => `${torso('#1e1a1e', '#0a080a')}
        <path d="M46 90 L60 102 L74 90 Q60 86 46 90 Z" fill="#e8e4e8"/><path d="M56 96 L64 96 M60 92 L60 104" stroke="#1e1a1e" stroke-width="1.4"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#3a3238"/>`,
    },
    {
      id: 'sandrone', name: 'Sandrone', element: 'Cryo',
      skin: '#fff1ec', hair: '#9a826a', hairStops: [[0, '#a68e76'], [0.6, '#967e66'], [1, '#7a6450']], shineCol: '#dcc8b4',
      eyes: '#3a5ad8', eyeTop: '#12248a', eyeLow: '#c8d8ff', lash: '#2a1e1a',
      sleeve: '#1e1a1e', cuff: '#c42a36', hands: '#f4f4f4', legs: '#1e1a1e', shoes: '#141014',
      back: (c) => `${nape(c, 100, 4)}${both(`${H(c, 'M28 88 Q16 96 22 108 Q30 106 30 98 Z')}<path d="M26 96 L24 128" stroke="#c42a36" stroke-width="1.6"/>`)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 1), ...sideLocks(98, 12)]),
      front: () => `
        ${both('<path d="M40 30 Q30 14 38 8 Q46 16 50 28 Z M28 44 Q16 40 18 30 Q28 32 34 40 Z" fill="#fafafa" stroke="#9a9aa4" stroke-width="1"/>')}
        <path d="M36 36 Q60 20 84 36 L82 30 Q60 16 38 30 Z" fill="#fafafa" stroke="#9a9aa4" stroke-width="1"/>
        <path d="M40 30 Q60 20 80 30" fill="none" stroke="#c8c8d0" stroke-width=".8" stroke-dasharray="2 1.6"/>`,
      outfit: () => `${torso('#1e1a1e', '#0a080a')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#fafafa"/>${gem(60, 100, 3.2, '#c42a36', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#c42a36"/><path d="M40 110 L80 110" stroke="#c42a36" stroke-width="1.2"/>`,
    },
    {
      id: 'sara', name: 'Kujou Sara', element: 'Electro',
      skin: '#fbeee8', hair: '#262a48', hairStops: [[0, '#2e3254'], [0.6, '#242842'], [1, '#6a78c8']], shineCol: '#6a74a8',
      eyes: '#e0a83a', eyeTop: '#7a4a10', eyeLow: '#fff0b0', lash: '#141626',
      sleeve: '#f4f0ec', cuff: '#1e1a1e', sleeveStyle: 'wide', hands: '#1e1a1e', legs: '#1e1a1e', shoes: '#141014',
      back: (c) => `${nape(c, 106, 2)}${H(c, CROWN)}
        <path d="M84 30 Q100 10 106 2 Q104 18 96 30 M86 34 Q104 24 112 20 Q106 32 94 38" fill="#141418" stroke="#000" stroke-width="1"/>`,
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(108, 12)]),
      front: () => `<g transform="rotate(28 88 42)">
        <path d="M78 30 Q92 26 98 36 L112 68 Q106 70 96 54 Q84 50 78 40 Z" fill="#c42a2a" stroke="#5a0a0a" stroke-width="1.2"/>
        <path d="M82 36 L90 38 M84 42 L92 43" stroke="#fafafa" stroke-width="1.4"/><circle cx="90" cy="34" r="3" fill="#e6c25e" stroke="#6a4a10" stroke-width=".8"/></g>`,
      outfit: () => `${torso('#1e1a1e', '#0a080a')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#f4f0ec"/><circle cx="60" cy="106" r="5" fill="none" stroke="#e6c25e" stroke-width="1.4"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#f4f0ec"/>`,
    },
    {
      id: 'sayu', name: 'Sayu', element: 'Anemo',
      skin: '#fff1ea', hair: '#c4c4a8', hairStops: [[0, '#d0d0b6'], [0.6, '#c0c0a2'], [1, '#a8a88a']], hairLine: '#7a7a5a', shineCol: '#ffffff',
      eyes: '#d04a6a', eyeTop: '#6a1030', eyeLow: '#ffc0d0', lash: '#3a2a1a',
      sleeve: '#7a5a3a', cuff: '#e6c25e', hands: '#fff1ea', legs: '#3a2a1e', shoes: '#2a1e14',
      back: (c) => `<path d="M16 40 Q14 12 40 10 Q60 4 80 10 Q106 12 104 40 L104 110 Q60 124 16 110 Z" fill="#7a5a3a" stroke="#3a2618" stroke-width="1.2"/>
        ${both('<circle cx="26" cy="16" r="11" fill="#6a4a2e" stroke="#3a2618" stroke-width="1.2"/><circle cx="26" cy="16" r="6" fill="#2a1e14"/>')}${nape(c, 96)}${H(c, CROWN)}`,
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 66 L${x - 2} 63 L${x - 4} 66`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 66 ${notch} L29 66 Z`) + both(H(c, lock(31, 54, 30, 96, 10, -1)));
      },
      front: () => `<path d="M20 44 Q18 18 60 14 Q102 18 100 44 Q86 30 60 28 Q34 30 20 44 Z" fill="#f2c870" stroke="#8a6a2a" stroke-width="1.2"/>
        <path d="M48 16 Q60 2 72 16 Q60 20 48 16 Z" fill="#6ab84a" stroke="#2a5a1a" stroke-width="1"/>`,
      outfit: () => `${torso('#7a5a3a', '#3a2618')}
        <path d="M44 90 Q60 86 76 90 L72 98 Q60 102 48 98 Z" fill="#d04a2a"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#3a2a1e"/><path d="M50 104 L70 104 L68 114 L52 114 Z" fill="#f4f0e2"/>`,
    },
    {
      id: 'shenhe', name: 'Shenhe', element: 'Cryo',
      skin: '#fff2f0', hair: '#e4e8f2', hairStops: [[0, '#f4f6fc'], [0.6, '#dce2ee'], [1, '#b8c4dc']], hairLine: '#8a94ac', shineCol: '#ffffff',
      eyes: '#7a8ab8', eyeTop: '#2a3a6a', eyeLow: '#e0e8ff', lash: '#2a2a3a',
      sleeve: '#1e1e28', cuff: '#c42a36', hands: '#1e1e28', legs: '#1e1e28', shoes: '#141418',
      back: (c) => `${longHair(c, 142, 2)}${H(c, CROWN)}
        <path d="M34 32 Q18 36 16 50 Q24 44 30 46 Q24 52 26 60 Q34 50 40 40 Z" fill="#1e1a22" stroke="#000" stroke-width=".9"/>`,
      bangs: (c) => fringe(c, [...bangsList(2, 2), [40, 42, 44, 86, 14, 2], [48, 40, 52, 86, 13, 1], ...sideLocks(128, 12)]),
      front: () => `${flower(34, 34, 9, '#f4f4f8', '#c42a36')}<path d="M30 38 L22 48 M34 40 L30 52" stroke="#c42a36" stroke-width="1.4"/>`,
      outfit: () => `${torso('#1e1e28', '#0a0a10')}
        <path d="M48 90 Q60 94 72 90 L72 96 Q60 100 48 96 Z" fill="#f4f4f8"/>${gem(60, 100, 3.4, '#9fd6e3', '#e6c25e')}
        <path d="M40 110 L80 110" stroke="#c42a36" stroke-width="2" stroke-dasharray="3 2"/>`,
    },
    {
      id: 'sigewinne', name: 'Sigewinne', element: 'Hydro',
      skin: '#fff2f0', hair: '#a8c8f0', hairStops: [[0, '#bcd6f6'], [0.6, '#a0c2ec'], [1, '#e8eef8']], hairLine: '#5a80b8', shineCol: '#ffffff',
      eyes: '#e03a4a', eyeTop: '#7a0e1a', eyeLow: '#ffb8c0', lash: '#2a2a44',
      sleeve: '#f7f7fa', cuff: '#4a78c8', hands: '#fff2f0', legs: '#f7f7fa', shoes: '#2a4a8a',
      back: (c) => `${both(H(c, 'M42 32 Q30 6 36 -2 Q46 8 52 28 Z'))}${nape(c, 96, 3)}${both(`<circle cx="24" cy="104" r="7" fill="#f4f4f8" stroke="#9aa4b4" stroke-width="1"/>`)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(98, 11)]),
      front: () => `<path d="M40 34 Q60 22 80 34 L78 26 Q60 16 42 26 Z" fill="#fafafa" stroke="#9aa4b4" stroke-width="1"/>
        <path d="M58 20 L62 20 L62 24 L66 24 L66 28 L62 28 L62 32 L58 32 L58 28 L54 28 L54 24 L58 24 Z" fill="#e03a4a"/>`,
      outfit: () => `${torso('#f7f7fa', '#9aa4c4')}
        ${bow(60, 96, '#f06a8a', '#c42a4a', 1.4)}${gem(60, 96, 2.6, '#4cc2f1', '#e6c25e')}
        <path d="M36 118 Q60 126 84 118" fill="none" stroke="#4a78c8" stroke-width="1.6"/>`,
    },
    {
      id: 'skirk', name: 'Skirk', element: 'Cryo',
      skin: '#fff2f0', hair: '#d8d4e8', hairStops: [[0, '#e6e2f2'], [0.6, '#d2cce4'], [1, '#aca4c8']], hairLine: '#7a7494', shineCol: '#ffffff',
      eyes: '#e0507a', eyeTop: '#7a1030', eyeLow: '#ffc0d4', lash: '#2a2a3a',
      sleeve: '#1e1e28', cuff: '#4a78c8', hands: '#1e1e28', legs: '#1e1e28', shoes: '#141418',
      back: (c) => `${longHair(c, 140, 4)}${H(c, CROWN)}
        <path d="M86 40 Q98 20 100 4 Q106 20 98 44 Z" fill="#3a6ad8" stroke="#12308a" stroke-width="1"/><path d="M90 38 Q98 24 100 10" stroke="#8ab8f8" stroke-width=".8" fill="none"/>`,
      bangs: (c) => fringe(c, [...bangsList(1, 3), ...sideLocks(126, 12)]),
      outfit: () => `${torso('#1e1e28', '#0a0a10')}
        <path d="M48 90 L60 102 L72 90 Q60 86 48 90 Z" fill="#2a2a38" stroke="#4a78c8" stroke-width=".9"/>${gem(60, 104, 3.4, '#9fd6e3', '#c8d4e8')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#2a2a38"/>`,
    },
    {
      id: 'sucrose', name: 'Sucrose', element: 'Anemo',
      skin: '#fff2ec', hair: '#8ad4b4', hairStops: [[0, '#9adcc0'], [0.6, '#82ccac'], [1, '#4aa88a']], hairLine: '#3a8a6a', shineCol: '#e4fff4',
      eyes: '#e8a030', eyeTop: '#8a4a10', eyeLow: '#fff0a0', lash: '#2a3a2a',
      sleeve: '#2a2a2e', cuff: '#e6c25e', hands: '#fff2ec', legs: '#2a2a2e', shoes: '#1a1a1e',
      back: (c) => `${nape(c, 94, 6)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M32 62 Q10 50 10 36 Q22 42 34 52 Z" fill="${c.hair}" ${line(hairStroke(c))}/>`),
      bangs: (c) => fringe(c, [
        [35, 46, 28, 70, 11, -4], [44, 42, 38, 72, 10, -2], [52, 40, 50, 70, 10, -1], [60, 40, 62, 70, 9, 1],
        [68, 40, 74, 70, 10, 2], [77, 42, 86, 70, 10, 4], [85, 48, 94, 72, 9, 4],
      ]) + both('<path d="M42 30 Q34 20 38 12 Q42 22 48 26 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".8"/>'),
      face: () => both('<circle cx="47.4" cy="74.5" r="8.4" fill="#fff" fill-opacity=".1" stroke="#6a3a1a" stroke-width="1.6"/>') + '<path d="M56 73 Q60 71 64 73" stroke="#6a3a1a" stroke-width="1.4" fill="none"/>',
      outfit: () => `${torso('#2a2a2e', '#0e0e10')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#f4f4f4"/>${gem(60, 102, 3.4, '#74c2a8', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#2a8a7a"/>`,
    },
    {
      id: 'lumine', name: 'Lumine', element: 'Anemo',
      skin: '#fff1ea', hair: '#f2d488', hairStops: [[0, '#f8e09c'], [0.6, '#eecc7a'], [1, '#dcb45a']], hairLine: '#a8843a', shineCol: '#ffffff',
      eyes: '#e8a830', eyeTop: '#8a5410', eyeLow: '#fff0b0', lash: '#3a2a14',
      sleeve: '#fafaf6', cuff: '#e6c25e', hands: '#fafaf6', legs: '#fafaf6', shoes: '#f4ecd8',
      back: (c) => `${nape(c, 100)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 3), [31, 54, 28, 114, 12, -2], [89, 54, 92, 114, 12, 2]]),
      front: () => `${flower(32, 44, 9, '#f8f8fc', '#e6c25e')}${flower(38, 36, 5, '#f8f8fc', '#e6c25e')}
        <path d="M36 52 Q40 60 38 66" stroke="#e6c25e" stroke-width="1.2" fill="none"/>`,
      outfit: () => `${torso('#fafaf6', '#b8b0a0')}
        <path d="M46 90 L60 98 L74 90 L72 102 Q60 106 48 102 Z" fill="#1e1e28"/>
        <path d="M46 90 L60 98 L74 90" fill="none" stroke="#e6c25e" stroke-width="1.6"/>${gem(60, 102, 3.2, '#74c2a8', '#e6c25e')}
        <path d="M36 118 Q60 126 84 118" fill="none" stroke="#e6c25e" stroke-width="1.6"/>`,
    },
    {
      id: 'varesa', name: 'Varesa', element: 'Electro',
      skin: '#fff1ec', hair: '#f4a0a8', hairStops: [[0, '#f8b0b6'], [0.6, '#f096a0'], [1, '#e0808c']], hairLine: '#b0586a', shineCol: '#ffffff',
      eyes: '#9a6ad8', eyeTop: '#442a8a', eyeLow: '#ecdcff', lash: '#3a2030',
      sleeve: '#f4f0e8', cuff: '#1e1a1e', hands: '#fff1ec', legs: '#1e1a1e', shoes: '#6a4a2a',
      back: (c) => `${both('<path d="M34 40 Q10 36 4 14 Q14 22 30 26 Q36 30 40 34 Z" fill="#f8f4ec" stroke="#8a8274" stroke-width="1.1"/>')}
        ${both(H(c, lock(30, 70, 18, 124, 14, -4)))}${nape(c, 100, 2)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M32 62 Q14 58 10 66 Q20 74 34 70 Z" fill="${c.hair}" ${line(hairStroke(c))}/><path d="M28 64 Q18 63 15 66" stroke="#f8d0d4" stroke-width="1.4" fill="none"/>`),
      bangs: (c) => fringe(c, [...bangsList(-1, 3), ...sideLocks(104, 11)]) + H(c, 'M60 24 Q52 8 60 2 Q58 12 66 20 Z')
        + `<path d="${lock(52, 40, 46, 70, 5, -1)} ${lock(84, 48, 90, 100, 4, 2)}" fill="#4ad0c8" opacity=".85"/>`,
      front: () => `<path d="M70 38 L84 50 M84 38 L70 50" stroke="#4ad0c8" stroke-width="4" stroke-linecap="round"/>`,
      face: () => '<rect x="36" y="84" width="7" height="4" rx="1" fill="#f8e8d8" stroke="#c8a888" stroke-width=".6" transform="rotate(-20 39 86)"/>',
      outfit: () => `${torso('#f4f0e8', '#b8b0a0')}
        <path d="M48 90 Q60 95 72 90 L72 94 Q60 99 48 94 Z" fill="#1e1a1e"/><path d="M50 94 L52 97 L54 94 L56 97 L58 94 L60 97 L62 94 L64 97 L66 94 L68 97 L70 94" fill="none" stroke="#1e1a1e" stroke-width="1"/>
        <path d="M34 96 Q40 88 48 92 Q46 100 38 102 Z M86 96 Q80 88 72 92 Q74 100 82 102 Z" fill="#fafaf6" stroke="#b8b0a0" stroke-width=".9"/>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#1e1a1e"/><path d="M40 110 L80 110" stroke="#af8ec1" stroke-width="1.4"/>`,
    },
    {
      id: 'vesna', name: 'Vesna', element: 'Anemo',
      skin: '#fff1ec', hair: '#f0d49a', hairStops: [[0, '#f6dea8'], [0.6, '#eccc8c'], [1, '#d8b06a']], hairLine: '#a8844a', shineCol: '#ffffff',
      eyes: '#3ab8b8', eyeTop: '#0e5a5a', eyeLow: '#c8fff8', lash: '#3a2a1a',
      sleeve: '#f7f7f4', cuff: '#3ab8b8', hands: '#fff1ec', legs: '#f7f7f4', shoes: '#2a5a5a',
      back: (c) => `${longHair(c, 132, 3)}${both('<path d="M30 40 Q16 30 14 14 Q24 22 34 30 Z" fill="#6ad0d0" stroke="#2a7a7a" stroke-width="1"/>')}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M33 72 L12 62 Q18 80 34 84 Z" fill="${c.skin}" ${line('#d9b8b0')}/>`),
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(116, 12)]),
      front: () => `<path d="M36 38 Q60 24 84 38" fill="none" stroke="#d8dce4" stroke-width="3"/>
        <path d="M50 30 L54 20 L60 28 L66 20 L70 30 Z" fill="#e8ecf4" stroke="#7a8494" stroke-width=".9"/>${gem(60, 36, 3, '#6ad0d0', '#d8dce4')}
        ${both('<path d="M40 34 Q32 22 36 14 Q40 24 46 30 Z" fill="#fafafc" stroke="#9aa4b4" stroke-width=".8"/>')}`,
      outfit: () => `${torso('#f7f7f4', '#b8b4a8')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#3ab8b8"/>${gem(60, 102, 3.4, '#74c2a8', '#e6c25e')}
        <path d="M36 118 Q60 126 84 118" fill="none" stroke="#e6c25e" stroke-width="1.6"/>`,
    },
    {
      id: 'vodyanitsa', name: 'Vodyanitsa', element: 'Hydro',
      skin: '#fff3f2', hair: '#3a9a98', hairStops: [[0, '#46a8a6'], [0.6, '#36908e'], [1, '#287674']], shineCol: '#9ae4e0',
      eyes: '#8ab8e0', eyeTop: '#2a5a8a', eyeLow: '#e8f6ff', lash: '#1a3a3a',
      sleeve: '#f4f8f8', cuff: '#3a9a98', hands: '#fff3f2', legs: '#f4f8f8', shoes: '#1e5a5a',
      back: (c) => `${longHair(c, 138, 4)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(1, 2), [40, 42, 42, 84, 14, 1], [48, 40, 52, 86, 14, 1], ...sideLocks(124, 12)]),
      front: () => both(`${flower(28, 42, 10, '#fafafc', '#f2c14e')}<path d="M26 50 Q22 58 24 64" stroke="#8ac8c8" stroke-width="1.2" fill="none"/>`),
      outfit: () => `${torso('#f4f8f8', '#9ab4b4')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#1e5a5a"/>${gem(60, 101, 3.4, '#4cc2f1', '#d8dce4')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#3a9a98"/>`,
    },
    {
      id: 'xiangling', name: 'Xiangling', element: 'Pyro',
      skin: '#fff0e8', hair: '#26305a', hairStops: [[0, '#2e3a68'], [0.6, '#242e54'], [1, '#1a2244']], shineCol: '#6a7ab8',
      eyes: '#e8943a', eyeTop: '#8a4410', eyeLow: '#ffe0a0', lash: '#1a1e30',
      sleeve: '#e8742a', cuff: '#1e1a1e', hands: '#fff0e8', legs: '#1e1a1e', shoes: '#141014',
      back: (c) => `${both(`<path d="M34 32 Q20 32 20 20 Q22 8 34 12 Q42 16 42 26" fill="none" stroke="${hairStroke(c)}" stroke-width="9"/><path d="M34 32 Q20 32 20 20 Q22 8 34 12 Q42 16 42 26" fill="none" stroke="url(#hg-${c.id})" stroke-width="6.6"/>
          <path d="M22 26 l3 -2 M20 18 l3.4 0 M25 11 l2 2.8 M33 10 l0 3.4 M39 15 l-2.4 2" stroke="${hairStroke(c)}" stroke-width=".9"/>`)}
        ${nape(c, 94)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(0, 0), ...sideLocks(96, 12)]),
      front: () => `<circle cx="40" cy="48" r="3" fill="#f2c14e" stroke="#8a6a2a" stroke-width=".8"/>`,
      outfit: () => `${torso('#e8742a', '#8a3a0a')}
        <path d="M36 92 Q42 84 50 90 L48 98 Z M84 92 Q78 84 70 90 L72 98 Z" fill="#e0402a" stroke="#6a1a0a" stroke-width="1"/>
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#1e1a1e"/>${gem(60, 100, 3, '#f2c14e', '#8a6a2a')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#1e1a1e"/>`,
    },
    {
      id: 'xianyun', name: 'Xianyun', element: 'Anemo',
      skin: '#fff1ee', hair: '#1a2430', hairStops: [[0, '#202c3a'], [0.6, '#18222e'], [1, '#1e4a4a']], shineCol: '#5a7a8a',
      eyes: '#3ab8a8', eyeTop: '#0e5a52', eyeLow: '#c8fff4', lash: '#0e1418',
      sleeve: '#1e2a2e', cuff: '#e6c25e', sleeveStyle: 'wide', hands: '#fff1ee', legs: '#1e2a2e', shoes: '#0e1418',
      back: (c) => `${longHair(c, 138, 5)}${H(c, lock(84, 40, 110, 56, 12, -4))}${H(c, CROWN)}
        <path d="M84 36 Q98 24 104 30 Q96 32 92 40 Z" fill="#3ac8b0" stroke="#0e5a52" stroke-width=".9"/>`,
      bangs: (c) => fringe(c, [...bangsList(2, 3), ...sideLocks(126, 12)]),
      front: () => `<path d="M36 36 Q40 32 44 36" stroke="#3ac8b0" stroke-width="2" fill="none"/>`,
      face: () => both('<rect x="37.5" y="67.5" width="19" height="13" rx="3" fill="none" stroke="#c42a2a" stroke-width="1.5"/>') + '<path d="M56.5 72 L63.5 72" stroke="#c42a2a" stroke-width="1.3"/>',
      outfit: () => `${torso('#1e2a2e', '#0a1014')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#f4f4f0"/>${gem(60, 102, 3.4, '#74c2a8', '#e6c25e')}
        <path d="M54 106 L66 106 L64 124 L56 124 Z" fill="#3ac8b0" opacity=".8"/>`,
    },
    {
      id: 'xilonen', name: 'Xilonen', element: 'Geo',
      skin: '#c89070', hair: '#f0dca0', hairStops: [[0, '#f6e6b4'], [0.55, '#ecd494'], [1, '#e0a84a']], hairLine: '#a88a4a', shineCol: '#ffffff',
      eyes: '#6ac04a', eyeTop: '#2a5a1a', eyeLow: '#e0ffb8', lash: '#2a1e14',
      sleeve: '#1e1a1a', cuff: '#e6c25e', hands: '#1e1a1a', legs: '#1e1a1a', shoes: '#3a2a1a',
      back: (c) => `${longHair(c, 134, 8)}${both(H(c, lock(30, 56, 8, 104, 16, -6)))}${H(c, CROWN)}`,
      ears: () => both('<path d="M38 36 L30 10 Q46 16 52 30 Z" fill="#e6c25e" stroke="#6a4a1a" stroke-width="1"/><path d="M38 30 L34 18 Q42 22 46 28 Z" fill="#3ab8b0"/>'),
      bangs: (c) => fringe(c, [
        [36, 46, 26, 74, 11, -5], [44, 41, 36, 76, 11, -3], [53, 40, 48, 72, 10, -2], [62, 40, 62, 70, 9, 0],
        [70, 41, 76, 72, 10, 2], [78, 43, 88, 76, 10, 4], [86, 48, 96, 78, 9, 4], ...sideLocks(118, 13),
      ]),
      outfit: () => `${torso('#1e1a1a', '#0a0808')}
        <path d="M44 90 Q60 86 76 90 L72 98 Q60 102 48 98 Z" fill="#3a3232"/>
        <g fill="#e6c25e">${[46, 52, 58, 64, 70].map((x) => `<circle cx="${x + 2}" cy="${106 + (x % 12 === 10 ? 2 : 0)}" r="1.6"/>`).join('')}</g>
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#e0a84a"/>`,
    },
    {
      id: 'xinyan', name: 'Xinyan', element: 'Pyro',
      skin: '#b8805e', hair: '#2e2020', hairStops: [[0, '#3a2828'], [0.6, '#2a1c1c'], [1, '#1e1414']], shineCol: '#7a5a5a',
      eyes: '#e0803a', eyeTop: '#7a3010', eyeLow: '#ffd0a0', lash: '#1a1010',
      sleeve: '#1e1a1a', cuff: '#c42a2a', hands: '#1e1a1a', legs: '#1e1a1a', shoes: '#141010',
      back: (c) => `${both(`<circle cx="30" cy="30" r="12" fill="url(#hg-${c.id})" ${line(hairStroke(c))}/>
        ${[[-60, 30, 30], [-20, 30, 30], [20, 30, 30], [-100, 30, 30]].map(([a]) => `<path d="M30 30 L30 10 L27 20 Z" transform="rotate(${a} 30 30)" fill="#e0e0e8" stroke="#6a6a78" stroke-width=".8"/>`).join('')}`)}
        ${nape(c, 96)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(2, 2), ...sideLocks(96, 11)]) + `<path d="${lock(44, 42, 38, 74, 6, -2)}" fill="#d02a2a"/>`,
      outfit: () => `${torso('#1e1a1a', '#0a0808')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#c42a2a"/>${gem(60, 102, 3.2, '#ef7a35', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#c42a2a"/>`,
    },
    {
      id: 'yanfei', name: 'Yanfei', element: 'Pyro',
      skin: '#fff1ec', hair: '#f4a890', hairStops: [[0, '#f8b8a2'], [0.6, '#f09e86'], [1, '#e08a72']], hairLine: '#b0604a', shineCol: '#ffffff',
      eyes: '#3ab8a0', eyeTop: '#0e5a4a', eyeLow: '#c8fff0', lash: '#3a2020',
      sleeve: '#f7f4f0', cuff: '#c42a2a', hands: '#fff1ec', legs: '#f7f4f0', shoes: '#6a1a1a',
      back: (c) => `${longHair(c, 136, 3)}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(1, 3), ...sideLocks(120, 12)]),
      front: () => `<g transform="rotate(-10 60 30)">
        <path d="M34 42 Q32 16 60 14 Q88 16 86 42 Z" fill="#a82a2a" stroke="#5a0a0a" stroke-width="1.2"/>
        <path d="M30 42 Q60 34 90 42 L92 48 Q60 40 28 48 Z" fill="#1e1a1e" stroke="#000" stroke-width="1"/>
        <path d="M40 36 Q60 28 80 36" fill="none" stroke="#e6c25e" stroke-width="1.6"/><circle cx="72" cy="26" r="3" fill="#e6c25e"/></g>`,
      outfit: () => `${torso('#f7f4f0', '#b8b0a8')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#c42a2a"/>${gem(60, 102, 3.2, '#ef7a35', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#c42a2a"/>`,
    },
    {
      id: 'yaoyao', name: 'Yaoyao', element: 'Dendro',
      skin: '#fff1ea', hair: '#a8866a', hairStops: [[0, '#b49274'], [0.6, '#a28062'], [1, '#86684e']], shineCol: '#e0c8b0',
      eyes: '#d8502a', eyeTop: '#7a1a0a', eyeLow: '#ffc090', lash: '#3a2218',
      sleeve: '#f4f0e6', cuff: '#6ab84a', hands: '#fff1ea', legs: '#f4f0e6', shoes: '#3a5a2a',
      back: (c) => `${both('<circle cx="16" cy="44" r="14" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1.2"/><path d="M8 40 Q16 34 24 40 M8 48 Q16 42 24 48" stroke="#8a6a2a" stroke-width="1" fill="none"/>')}
        ${both(`<path d="M44 24 Q34 10 46 6 Q54 10 52 22" fill="none" stroke="url(#hg-${c.id})" stroke-width="6"/>`)}${nape(c, 94)}${H(c, CROWN)}`,
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 64 L${x - 2} 61 L${x - 4} 64`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 64 ${notch} L29 64 Z`) + both(H(c, lock(31, 54, 30, 96, 10, -1)));
      },
      front: () => `<path d="M76 50 L82 50 M79 47 L79 53" stroke="#f2c14e" stroke-width="2.2" stroke-linecap="round"/>`,
      outfit: () => `${torso('#f4f0e6', '#b8b0a0')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#1e1a1e"/>${gem(60, 102, 3, '#a5c83b', '#e6c25e')}
        <path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#6ab84a"/>`,
    },
    {
      id: 'yoimiya', name: 'Yoimiya', element: 'Pyro',
      skin: '#fff0e8', hair: '#f0bc7a', hairStops: [[0, '#f6c88a'], [0.6, '#ecb26c'], [1, '#e09850']], hairLine: '#a8703a', shineCol: '#ffffff',
      eyes: '#e8842a', eyeTop: '#8a3a0a', eyeLow: '#ffe0a0', lash: '#3a2214',
      sleeve: '#f4f0e8', cuff: '#c42a2a', hands: '#fff0e8', legs: '#1e1a1e', shoes: '#c42a2a',
      back: (c) => `${H(c, lock(70, 20, 104, 118, 18, 12))}${nape(c, 96)}${H(c, CROWN)}
        <circle cx="86" cy="30" r="6" fill="none" stroke="#3a5ab8" stroke-width="2"/>${bow(74, 22, '#c42a2a', '#6a0a0a', 0.9)}`,
      bangs: (c) => fringe(c, [...bangsList(1, 3), ...sideLocks(104, 11)]),
      front: () => `<circle cx="28" cy="100" r="6" fill="#e8742a" stroke="#6a2a0a" stroke-width="1"/><path d="M28 94 L28 60" stroke="#c42a2a" stroke-width="1"/>`,
      outfit: () => `${torso('#f4f0e8', '#b8b0a0')}
        <path d="M48 90 Q60 94 72 90 L72 94 Q60 98 48 94 Z" fill="#c42a2a"/><circle cx="60" cy="97" r="2" fill="#e6c25e"/>
        <path d="M36 110 L84 110 L84 116 L36 116 Z" fill="#c42a2a"/><path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#1e1a1e"/>`,
    },
    {
      id: 'mizuki', name: 'Yumemizuki Mizuki', element: 'Anemo',
      skin: '#fff3f0', hair: '#c4d4e4', hairStops: [[0, '#d4e0ee'], [0.6, '#bccde0'], [1, '#a0b4cc']], hairLine: '#6a7e98', shineCol: '#ffffff',
      eyes: '#e05a8a', eyeTop: '#7a1a40', eyeLow: '#ffc8e0', lash: '#2a2a3a',
      sleeve: '#f7f5f8', cuff: '#7a4ab8', sleeveStyle: 'wide', hands: '#fff3f0', legs: '#f7f5f8', shoes: '#3a2a5a',
      back: (c) => `<path d="M30 40 Q20 10 60 6 Q100 10 90 40 Z" fill="#fafafc" stroke="#9a9aa8" stroke-width="1.1"/>
        ${longHair(c, 136, 2)}${H(c, CROWN)}`,
      ears: (c) => both(`<path d="M33 72 L12 64 Q18 80 34 84 Z" fill="${c.skin}" ${line('#d9b8b0')}/>`),
      bangs: (c) => fringe(c, [...bangsList(0, 2), ...sideLocks(124, 12)]),
      front: () => `<path d="M34 38 Q60 22 86 38" fill="none" stroke="#7a4ab8" stroke-width="4"/>
        ${both('<path d="M34 38 Q22 30 24 44 Q28 50 36 44 Z" fill="#9a5ad8" stroke="#3a1a6a" stroke-width="1"/><circle cx="30" cy="42" r="2.4" fill="#fafafc"/>')}`,
      outfit: () => `${torso('#f7f5f8', '#a8a4b4')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#1e1a24"/><circle cx="60" cy="98" r="2.6" fill="#e6c25e" stroke="#8a6a2a" stroke-width=".7"/>
        <path d="M38 112 L82 112" stroke="#7a4ab8" stroke-width="2.4"/>`,
    },
    {
      id: 'yunjin', name: 'Yun Jin', element: 'Geo',
      skin: '#fff2ee', hair: '#2a2448', hairStops: [[0, '#322c56'], [0.6, '#282242'], [1, '#1e1a34']], shineCol: '#7a70b0',
      eyes: '#c83a3a', eyeTop: '#6a0e0e', eyeLow: '#ffb0a0', lash: '#141024',
      sleeve: '#f4f4f8', cuff: '#c42a36', sleeveStyle: 'wide', hands: '#fff2ee', legs: '#f4f4f8', shoes: '#2a2448',
      back: (c) => `${longHair(c, 130, 1)}${H(c, CROWN)}`,
      bangs: (c) => {
        const notch = [86, 78, 70, 62, 54, 46, 38].map((x) => `L${x} 64 L${x - 2} 61 L${x - 4} 64`).join(' ');
        return H(c, `M29 66 C26 38 44 25 60 25 C76 25 94 38 91 64 ${notch} L29 64 Z`) + both(H(c, 'M29 54 L28 110 L37 108 L38 58 Z'));
      },
      front: () => `<path d="M30 40 Q30 20 60 18 Q90 20 90 40 Q60 30 30 40 Z" fill="#f4f4f8" stroke="#9aa4b4" stroke-width="1"/>
        <circle cx="60" cy="16" r="8" fill="#e05a7a" stroke="#8a1a3a" stroke-width="1"/>
        ${both('<circle cx="40" cy="22" r="6" fill="#3ab0b0" stroke="#0e5a5a" stroke-width="1"/><circle cx="28" cy="34" r="6" fill="#fafafa" stroke="#9aa4b4" stroke-width="1"/><circle cx="46" cy="12" r="3.4" fill="#e05a7a"/><path d="M26 40 L26 54" stroke="#e6c25e" stroke-width="1.2"/><path d="M24 54 L28 54 L27 62 L25 62 Z" fill="#e6c25e"/>')}`,
      outfit: () => `${torso('#f4f4f8', '#9aa4b4')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#2a2448"/>
        <path d="M54 102 Q60 96 66 102 Q60 108 54 102 Z" fill="#c42a36"/><path d="M36 118 L84 118 L85 124 Q60 132 35 124 Z" fill="#c42a36"/>`,
    },
    {
      id: 'zibai', name: 'Zibai', element: 'Geo',
      skin: '#fff3f0', hair: '#eceef4', hairStops: [[0, '#fafbff'], [0.6, '#e6e8f0'], [1, '#c4c8d8']], hairLine: '#8a8ea0', shineCol: '#ffffff',
      eyes: '#e8c030', eyeTop: '#8a6010', eyeLow: '#fff4b0', lash: '#2a2a2a',
      sleeve: '#f4f4f8', cuff: '#3ab0b0', sleeveStyle: 'wide', hands: '#fff3f0', legs: '#f4f4f8', shoes: '#3a4a5a',
      back: (c) => `${longHair(c, 136, 3)}${both('<path d="M42 28 Q36 10 44 2 Q46 14 52 24 Z" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>')}${H(c, CROWN)}`,
      bangs: (c) => fringe(c, [...bangsList(1, 3), ...sideLocks(122, 12)]) + `<path d="${lock(42, 42, 36, 74, 5, -1)}" fill="#f2d44e" opacity=".9"/>`,
      front: () => both('<path d="M30 86 L30 92" stroke="#e6c25e" stroke-width="1"/><path d="M28 92 L32 92 L33 110 L27 110 Z" fill="#3ab0b0" stroke="#0e5a5a" stroke-width=".8"/>'),
      outfit: () => `${torso('#f4f4f8', '#9aa4b4')}
        <path d="M46 90 L60 100 L74 90 Q60 86 46 90 Z" fill="#c4c8d8"/><circle cx="60" cy="102" r="4" fill="#e6c25e" stroke="#8a6a2a" stroke-width="1"/>
        <circle cx="60" cy="102" r="2" fill="#3ab0b0"/><path d="M36 118 Q60 126 84 118" fill="none" stroke="#3ab0b0" stroke-width="1.6"/>`,
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
      case 'cross': // Arlecchino
        return `<path d="M${cx - 2.6} ${cy - 3} L${cx + 2.6} ${cy + 3} M${cx + 2.6} ${cy - 3} L${cx - 2.6} ${cy + 3}" stroke="#ff3a48" stroke-width="1.5" stroke-linecap="round"/>`;
      case 'slit': // cat eyes (Kirara)
        return `<ellipse cx="${cx}" cy="${cy}" rx="1" ry="3.6" fill="${shade(c.eyeTop || c.eyes, -0.5)}"/>`;
      case 'star': // sparkle pupil
        return `<path d="M${cx} ${cy - 2.6} L${cx + 0.8} ${cy - 0.8} L${cx + 2.6} ${cy} L${cx + 0.8} ${cy + 0.8} L${cx} ${cy + 2.6} L${cx - 0.8} ${cy + 0.8} L${cx - 2.6} ${cy} L${cx - 0.8} ${cy - 0.8} Z" fill="${c.pupilCol || '#fff3b0'}" opacity=".85"/>`;
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
          ${c.noMouth ? '' : `<g transform="translate(60 87.5) scale(.82) translate(-60 -84.5)">${mouth(st.mouth)}</g>`}
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
