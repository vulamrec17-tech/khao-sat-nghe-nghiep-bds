/* Hình minh hoạ vẽ bằng SVG (không tải ảnh nên trang vẫn nhẹ).
   Màu tự đổi theo giai đoạn đang làm và theo chế độ sáng/tối. */
window.ILLUSTRATIONS = (function () {
  "use strict";

  // Toà nhà: [x, chiều cao, chiều rộng]
  const FAR = [[4, 50, 26], [34, 72, 20], [58, 42, 28], [92, 94, 22], [118, 58, 30], [152, 80, 22],
    [178, 48, 28], [210, 102, 24], [238, 64, 24], [266, 86, 26], [296, 54, 26]];
  const NEAR = [[0, 38, 30], [36, 56, 22], [64, 30, 28], [100, 68, 30], [140, 42, 24], [170, 60, 28],
    [206, 34, 26], [238, 74, 28], [272, 46, 22], [298, 58, 24]];

  const rd = (n) => Math.round(n * 10) / 10;

  function svg(inner) {
    return '<svg class="ill" viewBox="0 0 320 180" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }

  function rect(x, y, w, h, cls, extra) {
    return `<rect x="${rd(x)}" y="${rd(y)}" width="${rd(w)}" height="${rd(h)}" class="${cls}"${extra || ""}/>`;
  }

  function city(baseY, k) {
    let s = "";
    FAR.forEach(([x, h, w]) => { s += rect(x, baseY - h * k, w, h * k, "i-far"); });
    NEAR.forEach(([x, h, w]) => {
      const hh = h * k;
      const top = baseY - hh;
      s += rect(x, top, w, hh, "i-near");
      for (let y = top + 6; y < baseY - 9; y += 10) {
        for (let wx = x + 5; wx + 3.5 <= x + w - 4; wx += 8) s += rect(wx, y, 3.5, 5, "i-win");
      }
    });
    return s;
  }

  const sun = '<circle cx="262" cy="42" r="24" class="i-sun"/>';
  const ground = (y) => rect(0, y, 320, 180 - y, "i-ground");

  function pin(x, y, cls, label, k, bob) {
    return `<g transform="translate(${x} ${y}) scale(${k || 1})">` +
      '<ellipse cy="1" rx="7" ry="2.4" class="i-shadow"/>' +
      `<g${bob ? ' class="i-bob"' : ""}>` +
      `<path d="M0 0C-6.5-8-11-13.5-11-20a11 11 0 1 1 22 0C11-13.5 6.5-8 0 0Z" class="${cls}"/>` +
      '<circle cy="-20" r="7" class="i-hole"/>' +
      (label ? `<text y="-16.6" class="i-num">${label}</text>` : "") +
      "</g></g>";
  }

  function flag(x, y, cls) {
    return `<g transform="translate(${x} ${y})">` + rect(-1.2, -30, 2.4, 30, "i-pole") +
      `<path d="M1.2-30h17l-4.5 5.5 4.5 5.5h-17Z" class="${cls}"/></g>`;
  }

  function sparkle(x, y, cls, k, delay) {
    return `<g transform="translate(${x} ${y}) scale(${k})"><path class="${cls} i-twinkle" style="animation-delay:${delay || 0}s" ` +
      'd="M0-8C.8-2.4 2.4-.8 8 0 2.4.8.8 2.4 0 8-.8 2.4-2.4.8-8 0-2.4-.8-.8-2.4 0-8Z"/></g>';
  }

  function bubble(x, bottom, text) {
    const w = text.length * 5.6 + 16;
    const h = 19;
    const cx = Math.min(Math.max(x, w / 2 + 4), 316 - w / 2);
    return rect(cx - w / 2, bottom - h, w, h, "i-ink", ' rx="9.5"') +
      `<path d="M${x - 5} ${bottom - 0.5}h10l-5 6Z" class="i-ink"/>` +
      `<text x="${rd(cx)}" y="${bottom - 5.6}" class="i-bubble">${text}</text>`;
  }

  /* Bản đồ hành trình: con đường qua 3 trạm, cắm cờ ở đích */
  const ROAD = "M-10 166C60 166 60 132 120 134S200 160 250 146S300 124 332 122";
  const PINS = [[59, 149], [158, 139], [250, 146]];

  function map(current) {
    let s = sun + city(116, 0.78) + ground(116) +
      `<path d="${ROAD}" class="i-road"/><path d="${ROAD}" class="i-road-line"/>` + flag(296, 130, "i-s3");
    PINS.forEach(([x, y], i) => {
      const g = i + 1;
      const cls = !current || g <= current ? "i-s" + g : "i-off";
      s += pin(x, y, cls, g, g === current ? 1.35 : 1, g === current);
    });
    if (current) {
      const [x, y] = PINS[current - 1];
      s += bubble(x, y - 48, "Bạn ở đây");
    }
    return svg(s);
  }

  /* Phần A: vạch xuất phát */
  function start() {
    let s = sun + city(104, 0.7) + ground(104) + '<path d="M104 180 152 104h16l48 76Z" class="i-road-fill"/>' +
      '<path d="M160 118V180" class="i-road-line"/>';
    for (let row = 0; row < 2; row++) {
      for (let i = 0, x = 124; x < 196; i++, x += 8) s += rect(x, 146 + row * 5, 8, 5, (i + row) % 2 ? "i-ink" : "i-hole");
    }
    s += rect(98, 96, 4, 68, "i-pole") + rect(218, 96, 4, 68, "i-pole") +
      rect(94, 90, 132, 24, "i-st", ' rx="5"') + '<text x="160" y="106.5" class="i-banner">XUẤT PHÁT</text>' +
      sparkle(70, 62, "i-s2", 0.8, 0) + sparkle(252, 78, "i-s3", 0.7, 0.8);
    return svg(s);
  }

  /* Giai đoạn 1: kính lúp soi vào toà nhà */
  function explore() {
    let s = sun + city(128, 0.85) + ground(128) +
      '<defs><clipPath id="ill-lens"><circle cx="186" cy="82" r="38"/></clipPath></defs>' +
      '<circle cx="186" cy="82" r="38" class="i-paper"/><g clip-path="url(#ill-lens)">' +
      rect(148, 44, 76, 76, "i-st-soft") + rect(164, 56, 44, 72, "i-near");
    for (let y = 64; y < 120; y += 12) {
      [171, 183, 195].forEach((x, i) => { s += rect(x, y, 6, 8, (y + i) % 3 ? "i-win" : "i-lit"); });
    }
    s += "</g>" + '<circle cx="186" cy="82" r="38" class="i-lens"/><path d="M214 110 242 138" class="i-handle"/>' +
      sparkle(116, 52, "i-s2", 1, 0) + sparkle(256, 60, "i-s3", 0.8, 0.6) + sparkle(130, 100, "i-s1", 0.6, 1.2);
    return svg(s);
  }

  /* Giai đoạn 2: biển chỉ đường nhiều hướng */
  function crossroads() {
    const s = sun + city(118, 0.6) + '<path d="M0 132Q160 104 320 132V180H0Z" class="i-ground"/>' +
      '<ellipse cx="160" cy="157" rx="26" ry="5" class="i-shadow"/>' + rect(156, 40, 8, 116, "i-pole") +
      '<path d="M164 48h66l12 11-12 11h-66Z" class="i-s1"/><path d="M176 59h40" class="i-bline"/>' +
      '<path d="M156 78H92l-12 11 12 11h64Z" class="i-s2"/><path d="M104 89h40" class="i-bline"/>' +
      '<path d="M164 108h52l11 10-11 10h-52Z" class="i-s3"/><path d="M176 118h28" class="i-bline"/>' +
      sparkle(70, 52, "i-s1", 0.8, 0) + sparkle(262, 96, "i-s2", 0.7, 0.7) + sparkle(110, 128, "i-s3", 0.6, 1.3);
    return svg(s);
  }

  /* Giai đoạn 3: toà văn phòng, CV và cặp tài liệu */
  function work() {
    let s = sun + city(160, 0.55) + ground(160) + rect(126, 30, 68, 130, "i-near");
    let n = 0;
    for (let y = 42; y < 128; y += 14) {
      [136, 152, 168].forEach((x) => { s += rect(x, y, 10, 8, n++ % 4 === 1 ? "i-lit" : "i-win"); });
    }
    s += rect(150, 134, 20, 26, "i-st") +
      '<g transform="rotate(-8 76 100)">' + rect(52, 66, 48, 62, "i-paper", ' rx="4"') +
      '<circle cx="66" cy="80" r="6" class="i-st-soft"/><path d="M78 78h14M78 84h10M60 98h32M60 107h28M60 116h32" class="i-pline"/></g>' +
      '<circle cx="98" cy="66" r="12" class="i-st"/><path d="M92.5 66l4 4 7-8" class="i-check"/>' +
      '<path d="M238 126v-6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6" class="i-strap"/>' +
      rect(222, 126, 50, 34, "i-st", ' rx="5"') + rect(222, 138, 50, 4, "i-band") +
      sparkle(250, 92, "i-s3", 0.8, 0.4) + sparkle(40, 140, "i-s1", 0.6, 1);
    return svg(s);
  }

  /* Phần E: cờ đích trên đỉnh đồi */
  function finish() {
    let s = sun + city(124, 0.55) + '<path d="M-10 180V150Q160 70 330 150V180Z" class="i-hill"/>' +
      rect(158.8, 58, 2.4, 52, "i-pole");
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) s += rect(161 + col * 7, 58 + row * 7, 7, 7, (row + col) % 2 ? "i-hole" : "i-ink");
    }
    s += sparkle(118, 60, "i-s1", 1, 0) + sparkle(210, 50, "i-s2", 0.9, 0.5) +
      sparkle(234, 92, "i-s3", 0.8, 1) + sparkle(92, 100, "i-s2", 0.6, 1.5);
    return svg(s);
  }

  /* Đường viền thành phố mờ ở đáy màn hình */
  function skyline() {
    const outline = (list, k) => list.reduce((d, [x, h, w]) => d + `L${x} 90V${rd(90 - h * k)}H${x + w}V90`, "M0 90") + "L320 90";
    return '<svg viewBox="0 0 320 90" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      `<path d="${outline(FAR, 0.8)}" class="bg-far"/><path d="${outline(NEAR, 0.8)}" class="bg-near"/></svg>`;
  }

  return { intro: () => map(0), result: map, A: start, B: explore, C: crossroads, D: work, E: finish, skyline };
})();
