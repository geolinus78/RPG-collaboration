// Small, deliberately drawn map miniatures. Shared lighting comes from upper left.
export function polygon(ctx, points, fill, stroke, width = .8) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (points.length > 2) ctx.closePath();
  if (fill && fill !== "transparent") { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.stroke(); }
}
export function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
export function shade(hex, amount) {
  const rgb = hex.startsWith("rgb")
    ? hex.match(/[\d.]+/g).slice(0, 3).map(Number)
    : hex.replace("#", "").slice(0, 6).match(/../g).map(v => parseInt(v, 16));
  return `rgb(${rgb.map(v => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)).join(",")})`;
}
const line = (c, pts, color = "#493d32", w = 1) => polygon(c, pts, null, color, w);
const rect = (c, x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
const shadow = (c, w = 18, h = 7) => ellipse(c, 5, 3, w, h, "#173e3438");

function box(c, x, y, w, d, h, color) {
  polygon(c, [[x + w, y + w * .5], [x + w - d, y + (w + d) * .5], [x + w - d, y + (w + d) * .5 - h], [x + w, y + w * .5 - h]], shade(color, -.15), "#342f2b75");
  polygon(c, [[x - d, y + d * .5], [x + w - d, y + (w + d) * .5], [x + w - d, y + (w + d) * .5 - h], [x - d, y + d * .5 - h]], shade(color, .13), "#342f2b75");
  polygon(c, [[x, y - h], [x + w, y + w * .5 - h], [x + w - d, y + (w + d) * .5 - h], [x - d, y + d * .5 - h]], shade(color, .23), "#342f2b75");
}

function house(c, x, y, roof, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale); shadow(c, 23, 8);
  // Plaster walls, timber corners, deep door and warm inset windows.
  polygon(c, [[-20, -19], [0, -9], [0, 11], [-20, 1]], "#e4d4a9", "#665844");
  polygon(c, [[0, -9], [20, -19], [20, 1], [0, 11]], "#b4a17b", "#665844");
  line(c, [[-20, -17], [-20, 1], [0, 11], [20, 1], [20, -17]], "#6b5139", 2);
  line(c, [[0, -9], [0, 11]], "#6b5139", 2);
  polygon(c, [[-14, -2], [-7, 1], [-7, -10], [-14, -13]], "#4b503e", "#ae8850");
  line(c, [[-10.5, -11], [-10.5, 0]], "#c9a768");
  polygon(c, [[7, 7], [13, 4], [13, -8], [7, -5]], "#483d32", "#856947");
  ellipse(c, 11, 0, .8, .8, "#e1b95e");
  polygon(c, [[-25, -18], [-4, -43], [23, -29], [2, -4]], shade(roof, .08), "#5b4137");
  polygon(c, [[2, -4], [23, -29], [25, -16]], shade(roof, -.3), "#5b4137");
  // Roof shingles follow the slope, each with a fine sunlit lip.
  for (let r = 1; r < 6; r++) {
    const t = r / 6, ax = -4 - 21 * t, ay = -43 + 25 * t;
    line(c, [[ax, ay], [ax + 27, ay + 14]], shade(roof, -.25), .8);
    for (let col = 1; col < 6; col++) {
      const px = ax + col * 4.5, py = ay + col * 2.3;
      line(c, [[px, py], [px - 3.3, py + 4]], shade(roof, .24), .6);
    }
  }
  line(c, [[-4, -43], [23, -29]], "#f0c897", 1.5);
  box(c, 9, -27, 4, 4, 15, "#8d7861");
  rect(c, -18, 0, 13, 2, "#69864a");
  for (let i = 0; i < 4; i++) ellipse(c, -17 + i * 3, -1 - i % 2, 1.5, 1.5, i % 2 ? "#eadca2" : "#d78d75");
  c.restore();
}

function tree(c, item, island) {
  const v = item.variant ?? .5, green = item.color || island.palette.highland;
  c.save(); c.scale(.75 + v * .45, .75 + v * .45); shadow(c, 15, 6);
  rect(c, -2, -24, 4, 27, "#6e5438"); rect(c, -2, -24, 1, 25, "#b39866");
  if (island.id === "finn-island" || v > .58) {
    for (let i = 0; i < 3; i++) {
      const y = -12 - i * 10, w = 17 - i * 3;
      polygon(c, [[0, y - 24], [w, y], [3, y - 2], [0, y + 2], [-w, y]], shade(green, i * .045), "#244b3d90");
      polygon(c, [[0, y - 24], [-w, y], [-3, y - 4]], shade(green, .21));
      line(c, [[-w + 3, y - 1], [-4, y - 4]], "#a3ba714d");
    }
  } else {
    line(c, [[0, -15], [-9, -28]], "#6e5438", 2);
    const clusters = [[-9, -30, 11], [8, -28, 12], [-1, -42, 14], [-9, -40, 9], [9, -40, 8]];
    for (const [x, y, r] of clusters) {
      ellipse(c, x + 2, y + 3, r, r * .82, shade(green, -.08));
      ellipse(c, x - 2, y - 2, r * .85, r * .7, shade(green, .16));
      for (let j = 0; j < 4; j++) line(c, [[x - 5 + j * 3, y - 4 + j % 2 * 3], [x - 3 + j * 3, y - 5 + j % 2 * 3]], "#d5dda13d");
    }
  }
  c.restore();
}

function rock(c, color, size = 1) {
  c.save(); c.scale(size, size); shadow(c, 11, 4);
  polygon(c, [[-12, -2], [-9, -12], [2, -18], [12, -10], [14, 0], [3, 5]], shade(color, -.16), "#35433d80");
  polygon(c, [[-12, -2], [-9, -12], [2, -18], [1, -5]], shade(color, .28));
  polygon(c, [[1, -5], [2, -18], [12, -10], [14, 0]], shade(color, .02));
  line(c, [[-7, -10], [-2, -8], [1, -5], [3, 5]], shade(color, -.32));
  line(c, [[-8, 0], [-3, 1]], "#c6c4a57d"); c.restore();
}

function crystal(c, color, size = 1, time = 0) {
  c.save(); c.scale(size, size); shadow(c, 13, 5);
  const glow = c.createRadialGradient(0, -13, 0, 0, -13, 30);
  glow.addColorStop(0, `${color}42`); glow.addColorStop(1, `${color}00`);
  ellipse(c, 0, -13, 30, 30, glow);
  for (const [x, y, s] of [[-9, 1, .55], [7, 1, .65], [0, 0, 1]]) {
    c.save(); c.translate(x, y); c.scale(s, s);
    polygon(c, [[0, -34], [8, -20], [6, -3], [0, 3], [-7, -3], [-8, -20]], shade(color, .1), shade(color, -.35));
    polygon(c, [[0, -34], [0, 3], [-7, -3], [-8, -20]], shade(color, .55));
    polygon(c, [[0, -34], [8, -20], [6, -3], [0, 3], [3, -21]], shade(color, -.18));
    line(c, [[-4, -22], [-3, -10]], "#ffffffb0", 1); c.restore();
  }
  if (Math.sin(time * 1.6) > .5) { line(c, [[10, -32], [10, -26]], "#f9e9b6"); line(c, [[7, -29], [13, -29]], "#f9e9b6"); }
  c.restore();
}

function tower(c, color, time) {
  shadow(c, 24, 9); box(c, 0, -5, 16, 16, 4, "#a6a087");
  polygon(c, [[-12, -4], [0, 3], [13, -4], [10, -58], [-10, -58]], "#d9d3b6", "#716d59");
  polygon(c, [[0, 3], [13, -4], [10, -58], [0, -53]], "#a69f88");
  for (let row = 0; row < 7; row++) {
    const y = -5 - row * 7;
    line(c, [[-11, y - 5], [0, y], [12, y - 5]], "#8c87706e");
    line(c, [[row % 2 ? -7 : -3, y - 4], [row % 2 ? -7 : -3, y - 9]], "#8c87706e");
  }
  polygon(c, [[-3, -27], [2, -25], [2, -38], [-3, -40]], "#354d48", "#eee1b4");
  polygon(c, [[-17, -56], [0, -48], [17, -56], [0, -64]], "#d7cda8", "#786b4e");
  rect(c, -9, -71, 2, 15, "#6b5640"); rect(c, 8, -71, 2, 15, "#6b5640");
  ellipse(c, 0, -64, 5, 7, color); ellipse(c, -1, -66, 2, 3, "#fff4b2");
  polygon(c, [[-19, -71], [0, -85], [19, -71], [0, -64]], "#516f69", "#344b45");
  polygon(c, [[-19, -71], [0, -85], [0, -64]], "#7f9a80");
  line(c, [[0, -84], [0, -95]], "#6b5640", 1.5);
  polygon(c, [[0, -95], [13, -93 + Math.sin(time) * 1.5], [0, -88]], color);
  polygon(c, [[-4, 1], [-4, -12], [2, -9], [2, 4]], "#3d4538");
}

function ruins(c, color, gate = false) {
  shadow(c, 31, 10); box(c, 0, -2, 23, 23, 3, shade(color, -.15));
  for (const [x, y, h] of [[-19, -7, 40], [16, -4, gate ? 40 : 30], [-6, -15, 27]]) {
    box(c, x, y, 6, 6, h, color);
    for (let i = 6; i < h; i += 8) line(c, [[x - 6, y + 3 - i], [x, y - i], [x + 6, y + 3 - i]], shade(color, -.3));
    box(c, x, y - h, 8, 8, 3, shade(color, .1));
  }
  if (gate) {
    box(c, -16, -44, 36, 8, 7, color);
    polygon(c, [[-10, -6], [11, 5], [11, -31], [-10, -42]], "#2d453e", "#857b5a");
    for (let i = 0; i < 3; i++) { ellipse(c, -4 + i * 6, -21 + i * 3, 2, 3, "#d4b474"); }
    line(c, [[-20, -40], [-24, -24], [-19, -13], [-22, -5]], "#547246", 3);
  } else { box(c, -20, -47, 23, 8, 5, color); rock(c, color, .65); }
  for (let i = 0; i < 6; i++) ellipse(c, -22 + i * 8, 5 + i % 2 * 4, 3, 1.5, "#668552");
}

function boat(c, color, wreck, time) {
  shadow(c, 31, 9);
  c.save(); c.translate(3, -4 + (wreck ? 0 : Math.sin(time * 1.3) * .7));
  polygon(c, [[-26, -3], [-18, 9], [8, 15], [28, 2], [18, -6]], "#70472f", "#423d30", 1.3);
  polygon(c, [[-26, -3], [-7, -12], [28, 2], [7, 8]], "#c39a60", "#4d4330");
  polygon(c, [[-20, -3], [-7, -9], [21, 2], [7, 5]], "#654b35");
  for (let i = 0; i < 4; i++) line(c, [[-19 + i * 8, -4 + i * 2], [-10 + i * 8, 6 + i * 1.5]], "#b09160", 2);
  line(c, [[0, 4], [wreck ? -8 : 0, -56]], "#574832", 2.5);
  if (!wreck) {
    polygon(c, [[2, -53], [23, -18], [3, -24]], "#f4e8bd", "#a79367");
    polygon(c, [[-2, -48], [-18, -27], [-2, -24]], shade(color, .16), "#8d7955");
    line(c, [[2, -53], [23, -18], [3, 3]], "#b4a376", .7);
    polygon(c, [[0, -58], [11, -56], [0, -51]], color);
  } else { line(c, [[-8, -40], [12, -33]], "#6c5136", 2); polygon(c, [[-8, -39], [8, -33], [2, -23], [-2, -29]], "#c5b389"); }
  line(c, [[-18, 7], [7, 13], [24, 3]], "#bb9560"); c.restore();
}

function camp(c, color, time) {
  shadow(c, 26, 9);
  polygon(c, [[-26, 0], [-8, -33], [18, -20], [0, 13]], shade(color, .12), "#785640");
  polygon(c, [[0, 13], [18, -20], [28, 0]], shade(color, -.23), "#785640");
  polygon(c, [[5, 9], [18, -16], [23, 1]], "#504837");
  line(c, [[-8, -34], [18, -21]], "#e4c99a", 1.5);
  line(c, [[-26, 0], [-34, 7]], "#d4c89a"); line(c, [[28, 0], [36, 8]], "#d4c89a");
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ellipse(c, 26 + Math.cos(a) * 8, 13 + Math.sin(a) * 4, 3, 2, "#99917b"); }
  line(c, [[21, 15], [31, 11]], "#6d4832", 3);
  polygon(c, [[21, 12], [25, -2 - Math.sin(time * 5) * 2], [28, 4], [30, -2], [32, 12]], "#e79345");
  polygon(c, [[24, 12], [27, 3], [30, 12]], "#ffe7a0");
}

function creature(c, item, time) {
  const color = item.color || "#d0a35c", t = time + (item.phase || 0);
  shadow(c, 9, 3);
  if (item.kind === "bird") {
    c.translate(0, -15 + Math.sin(t * 2) * 2);
    polygon(c, [[0, 0], [-7, -6 - Math.sin(t * 3) * 3], [-17, -3], [-7, 0]], color, shade(color, -.3));
    polygon(c, [[0, 0], [7, -6 - Math.sin(t * 3) * 3], [17, -3], [7, 0]], shade(color, -.08), shade(color, -.3));
    ellipse(c, 0, 0, 4, 6, color); ellipse(c, 0, -4, 3, 3, color); polygon(c, [[0, -4], [6, -3], [0, -1]], "#cc9947");
  } else if (item.kind === "spirit") {
    c.translate(0, -13 + Math.sin(t * 2) * 3);
    const glow = c.createRadialGradient(0, 0, 2, 0, 0, 19); glow.addColorStop(0, `${color}65`); glow.addColorStop(1, `${color}00`); ellipse(c, 0, 0, 19, 19, glow);
    ellipse(c, 0, -3, 7, 9, color); polygon(c, [[-6, 1], [0, 17], [5, 2]], color);
    ellipse(c, -2, -5, 1, 1.5, "#37575b"); ellipse(c, 3, -5, 1, 1.5, "#37575b");
  } else if (item.kind === "crawler") {
    for (let i = 0; i < 3; i++) { line(c, [[-5, -4 + i * 2], [-11, -6 + i * 4]], "#514d43", 2); line(c, [[5, -4 + i * 2], [11, -6 + i * 4]], "#514d43", 2); }
    ellipse(c, 0, -5, 8, 6, color); line(c, [[0, -11], [0, 0]], shade(color, .3)); ellipse(c, 0, 1, 4, 3, shade(color, .2)); ellipse(c, -2, 1, 1, 1, "#202e29"); ellipse(c, 2, 1, 1, 1, "#202e29");
  } else {
    polygon(c, [[7, -6], [21, -12], [17, -3], [6, 0]], color, shade(color, -.2));
    polygon(c, [[17, -10], [21, -12], [17, -3], [13, -2]], "#ead9b9");
    ellipse(c, 0, -6, 9, 5, color); rect(c, -6, -3, 2, 7, "#4b4133"); rect(c, 4, -3, 2, 7, "#4b4133");
    ellipse(c, -7, -12, 6, 6, color); polygon(c, [[-12, -15], [-12, -23], [-6, -17]], color, "#5d503c"); polygon(c, [[-5, -16], [-1, -22], [0, -13]], color, "#5d503c");
    polygon(c, [[-13, -12], [-16, -7], [-7, -8]], "#f0dfc0"); ellipse(c, -16, -7, 1.5, 1.2, "#32362d"); ellipse(c, -10, -13, 1, 1, "#27372e");
  }
}

function hero(c, item) {
  const body = { trail: "#3f7e9a", guard: "#ba5c46", star: "#776b9d" }[item.style] || "#3f7e9a";
  const bob = item.moving ? Math.sin(item.walk) * 1.2 : 0;
  ellipse(c, 0, 2, 12, 5, "#fff2b12b");
  c.strokeStyle = "#f8df99"; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 2, 12, 5, 0, 0, Math.PI * 2); c.stroke();
  shadow(c, 8, 3); c.translate(0, bob);
  rect(c, -5, -8, 4, 10 + (item.moving ? Math.sin(item.walk) * 2 : 0), "#3b4b42"); rect(c, 2, -8, 4, 10 - (item.moving ? Math.sin(item.walk) * 2 : 0), "#3b4b42");
  ellipse(c, 0, -14, 8, 10, shade(body, -.2)); polygon(c, [[-7, -21], [1, -23], [6, -19], [6, -7], [-7, -8]], body, "#374f46");
  box(c, -7, -9, 5, 4, 11, "#ad8752"); line(c, [[-6, -19], [4, -9]], "#d8bc80", 1.5);
  ellipse(c, 2, -28, 6, 7, "#e5bf8f"); ellipse(c, 5, -28, .8, 1, "#394c40");
  ellipse(c, 0, -33, 11, 3, item.style === "star" ? "#787097" : "#8a7249");
  polygon(c, [[-7, -34], [-4, -43], [5, -41], [8, -33]], item.style === "star" ? "#6a608d" : "#a88f58", "#625b40");
  line(c, [[-7, -34], [8, -33]], "#d8bc80", 2);
  line(c, [[11, -17], [12, 3]], "#775e3d", 1.5); ellipse(c, 10, -17, 2, 2, "#e5bf8f");
  polygon(c, [[-1, -53], [3, -49], [-1, -45], [-5, -49]], "#f7df9b", "#fff4cb");
}

function prop(c, item, island, time) {
  const color = item.color || "#ac9566";
  shadow(c, 18, 6);
  switch (item.kind) {
    case "palm":
      polygon(c, [[-3, 1], [3, 1], [8, -39], [4, -39]], "#ac9461", "#6d6744");
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7, x = Math.cos(a) * 26 + 6, y = Math.sin(a) * 13 - 39;
        polygon(c, [[6, -40], [x, y], [x - 4, y + 7], [10, -37]], shade(color, (i % 3 - 1) * .15), "#3f6d4380");
      }
      ellipse(c, 5, -34, 3, 3, "#8c7046"); break;
    case "cactus":
      rect(c, -4, -30, 8, 33, color); ellipse(c, 0, -30, 4, 4, color);
      line(c, [[-3, -10], [-12, -10], [-12, -22]], color, 6); line(c, [[3, -18], [12, -18], [12, -28]], color, 6);
      line(c, [[-1, -29], [-1, 1]], shade(color, .35)); ellipse(c, 0, -34, 2, 2, "#d3a483"); break;
    case "mushroom":
      for (const [x, y, s] of [[-10, 0, .6], [4, 3, 1], [13, -3, .5]]) {
        c.save(); c.translate(x, y); c.scale(s, s); rect(c, -2, -12, 4, 14, "#e1d2a8");
        ellipse(c, 0, -12, 9, 5, color); ellipse(c, -3, -14, 2, 1, "#f0dfb6"); ellipse(c, 4, -12, 1, 1, "#f0dfb6"); c.restore();
      } break;
    case "windmill":
      house(c, 0, 0, "#7c8d7b", .8); c.save(); c.translate(2, -40); c.rotate(time * .2);
      for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); polygon(c, [[0, 0], [3, -28], [11, -28], [6, -3]], "#dfd4ac", "#857755"); for (let j = 7; j < 27; j += 5) line(c, [[3, -j], [9, -j]], "#a7976f"); }
      ellipse(c, 0, 0, 3, 3, "#b2915b"); c.restore(); break;
    case "well":
      ellipse(c, 0, 2, 16, 8, color); rect(c, -16, -9, 32, 11, color); ellipse(c, 0, -9, 16, 8, shade(color, .2)); ellipse(c, 0, -9, 11, 5, "#375c5a");
      rect(c, -12, -36, 3, 29, "#886e49"); rect(c, 10, -36, 3, 29, "#886e49");
      polygon(c, [[-20, -34], [0, -45], [20, -34], [0, -26]], "#b98155", "#796044"); line(c, [[0, -33], [0, -10]], "#c9b884"); break;
    case "bridge":
      for (let i = 0; i < 9; i++) { const x = -24 + i * 6, y = -Math.sin(i / 8 * Math.PI) * 8; polygon(c, [[x, y - 5], [x + 5, y - 5], [x + 5, y + 7], [x, y + 7]], color, "#715c40"); }
      for (const y of [-6, 8]) { line(c, [[-24, y - 8], [0, y - 17], [29, y - 8]], "#826c48", 2); for (const x of [-24, 0, 29]) line(c, [[x, y], [x, y - 12]], "#826c48", 2); } break;
    case "barrel":
      ellipse(c, 0, 0, 10, 5, shade(color, -.25)); polygon(c, [[-10, 0], [-12, -12], [-9, -24], [9, -24], [12, -12], [10, 0]], color, "#6b583e");
      ellipse(c, 0, -24, 9, 4, shade(color, .25)); for (const y of [-18, -6]) line(c, [[-11, y], [0, y + 3], [11, y]], "#5e665b", 2); line(c, [[-4, -22], [-4, -1]], shade(color, .3)); break;
    case "crate": case "hay":
      box(c, 0, -8, 15, 15, 19, color); line(c, [[-14, -1], [-1, -15], [-14, -20], [-1, 4]], shade(color, -.35), 1.5);
      if (item.kind === "hay") for (let i = -12; i < 12; i += 3) line(c, [[i, 1], [i, -12]], "#ead48d", .7); break;
    case "chest":
      box(c, 0, -6, 17, 13, 14, color); ellipse(c, 2, -18, 15, 6, shade(color, .2));
      line(c, [[-8, -18], [-8, -2]], "#ddc374", 2); line(c, [[10, -17], [10, 0]], "#ddc374", 2); rect(c, 1, -9, 4, 5, "#e7cf83"); break;
    case "bench":
      for (const x of [-15, 12]) { rect(c, x, -5, 3, 10, "#6b6047"); line(c, [[x, -3], [x, -22]], "#6b6047", 2); }
      for (let i = 0; i < 3; i++) polygon(c, [[-19, -5 + i * 3], [18, -5 + i * 3], [22, -2 + i * 3], [-15, -2 + i * 3]], color, "#806a48");
      rect(c, -18, -20, 35, 4, color); rect(c, -18, -14, 35, 4, color); break;
    case "sign":
      rect(c, -2, -34, 4, 37, "#8e7850"); polygon(c, [[-17, -32], [13, -32], [20, -27], [13, -22], [-17, -22]], color, "#715f43"); line(c, [[-10, -27], [11, -27]], shade(color, -.3)); break;
    case "flag":
      line(c, [[0, 2], [0, -45]], "#a5915f", 2); polygon(c, [[1, -44], [23, -41 + Math.sin(time) * 2], [18, -28], [1, -31]], color, shade(color, -.2)); ellipse(c, 0, 1, 7, 3, "#a49e7f"); break;
    case "lantern":
      line(c, [[-3, 3], [-3, -40], [8, -40], [8, -32]], "#62664f", 2);
      box(c, 8, -20, 5, 5, 12, color); polygon(c, [[2, -33], [8, -39], [15, -32]], "#69705c"); ellipse(c, 8, -26, 2, 4, "#fff1af"); break;
    case "fence":
      for (const x of [-20, 0, 20]) { rect(c, x - 2, -22, 4, 25, color); polygon(c, [[x - 2, -22], [x, -27], [x + 2, -22]], shade(color, .2)); }
      for (const y of [-15, -6]) rect(c, -22, y, 44, 3, shade(color, -.1)); break;
    case "statue":
      box(c, 0, -2, 12, 12, 6, shade(color, -.15)); polygon(c, [[-8, -3], [8, -3], [5, -33], [-4, -33]], color, shade(color, -.25));
      ellipse(c, 0, -39, 7, 9, shade(color, .2)); line(c, [[-3, -41], [3, -41]], shade(color, -.35)); line(c, [[8, -25], [16, -36], [16, 0]], shade(color, -.15), 3); break;
    case "fountain":
      ellipse(c, 0, 0, 22, 11, shade(color, -.2)); ellipse(c, 0, -4, 22, 11, color); ellipse(c, 0, -5, 17, 7, "#6aacae");
      box(c, 0, -7, 5, 5, 22, color); ellipse(c, 0, -28, 12, 5, shade(color, .2));
      for (let i = 0; i < 5; i++) { const x = (i - 2) * 7; line(c, [[0, -30], [x * .5, -35], [x, -6 + Math.sin(time * 2 + i)]], "#bfebe0b0", 1.5); } break;
  }
}

export function drawSymbol(c, item, island, time) {
  switch (item.kind) {
    case "tree": tree(c, item, island); break;
    case "rock": rock(c, item.color || island.palette.rock, .5 + (item.variant ?? .5) * .55); break;
    case "flowers":
      for (let i = 0; i < 5; i++) { const x = Math.sin(i * 4) * 10, y = Math.cos(i * 3) * 3; line(c, [[x, y], [x, y - 6]], "#537747"); ellipse(c, x, y - 7, 2, 1.7, ["#eacb78", "#f0e3bf", "#cf8e83"][i % 3]); ellipse(c, x, y - 7, .6, .6, "#bd9153"); } break;
    case "village": house(c, -18, -12, item.color, .8); house(c, 22, -9, item.color, .65); house(c, -1, 12, item.color, .9); break;
    case "house": house(c, 0, 0, item.color); break;
    case "tower": tower(c, item.color, time); break;
    case "gate": ruins(c, item.color, true); break;
    case "ruins": ruins(c, item.color); break;
    case "boat": boat(c, item.color, false, time); break;
    case "shipwreck": boat(c, item.color, true, time); break;
    case "camp": camp(c, item.color, time); break;
    case "crystal": crystal(c, item.color, item.landmark ? 1.55 : .45 + (item.variant ?? .5) * .35, time); break;
    case "hero": hero(c, item); break;
    case "bird": case "spirit": case "fox": case "crawler": creature(c, item, time); break;
    default: prop(c, item, island, time);
  }
}
