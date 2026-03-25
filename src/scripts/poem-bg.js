/**
 * Per-Poem Visual Resonance
 * Each poem gets a bespoke generative canvas that reflects its content.
 * Falls back to theme-based visuals for any unrecognized slug.
 */

var canvas, ctx, raf, state;

/* ── Slug → unique visual mapping ── */
var POEM_VISUALS = {
  'we-were-living-in-the-good-old-days': {
    color: [212, 175, 100],
    init: initGoodOldDays,
    draw: drawGoodOldDays,
  },
  'halfway-there': {
    color: [121, 185, 57],
    init: initHalfway,
    draw: drawHalfway,
  },
  'my-favorite-things': {
    color: [180, 200, 220],
    init: initFavoriteThings,
    draw: drawFavoriteThings,
  },
  'it-is-calm-here': {
    color: [100, 120, 160],
    init: initCalmHere,
    draw: drawCalmHere,
  },
  'still-we-fight': {
    color: [200, 80, 40],
    init: initStillWeFight,
    draw: drawStillWeFight,
  },
  'blacksmith': {
    color: [212, 165, 116],
    init: initBlacksmith,
    draw: drawBlacksmith,
  },
  'the-race-betwixt': {
    color: [140, 100, 180],
    init: initRaceBetwixt,
    draw: drawRaceBetwixt,
  },
  'nemesis-of-the-fly': {
    color: [80, 160, 120],
    init: initNemesis,
    draw: drawNemesis,
  },
  'dearth': {
    color: [160, 80, 80],
    init: initDearth,
    draw: drawDearth,
  },
  'phobia': {
    color: [180, 50, 50],
    init: initPhobia,
    draw: drawPhobia,
  },
  'fate': {
    color: [120, 100, 160],
    init: initFate,
    draw: drawFate,
  },
  'nomad-of-shadows': {
    color: [80, 100, 140],
    init: initNomad,
    draw: drawNomad,
  },
  'a-meditation-on-forces': {
    color: [200, 100, 140],
    init: initForces,
    draw: drawForces,
  },
  'we-were-all-strangers-once': {
    color: [200, 170, 80],
    init: initStrangers,
    draw: drawStrangers,
  },
  'pimpled-ambivalence': {
    color: [200, 180, 140],
    init: initPimpled,
    draw: drawPimpled,
  },
};

/* ── Theme fallbacks ── */
var THEMES = {
  'resilience': { color: [121, 185, 57], init: initGeneric, draw: drawGenericEmbers },
  'identity':   { color: [212, 165, 116], init: initGeneric, draw: drawGenericEmbers },
  'heritage':   { color: [185, 78, 200], init: initGeneric, draw: drawGenericRipples },
  'exile':      { color: [100, 140, 200], init: initGeneric, draw: drawGenericDrift },
  'connection': { color: [200, 160, 80], init: initGeneric, draw: drawGenericThreads },
  'nature':     { color: [80, 160, 120], init: initGeneric, draw: drawGenericRipples },
  'memory':     { color: [160, 120, 180], init: initGeneric, draw: drawGenericDrift },
  'love':       { color: [200, 100, 120], init: initGeneric, draw: drawGenericThreads },
  'nostalgia':  { color: [212, 175, 100], init: initGeneric, draw: drawGenericEmbers },
  'beauty':     { color: [180, 200, 220], init: initGeneric, draw: drawGenericRipples },
  'reflection': { color: [100, 120, 160], init: initGeneric, draw: drawGenericRipples },
  'humor':      { color: [200, 180, 140], init: initGeneric, draw: drawGenericEmbers },
  'mortality':  { color: [120, 100, 160], init: initGeneric, draw: drawGenericDrift },
};

/* ── Helpers ── */
function rgba(c, a) {
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return Math.random() * (max - min) + min; }

/* ══════════════════════════════════════════════════
   1. WE WERE LIVING IN THE GOOD OLD DAYS
   Golden photographs drifting, warm light leaks, nostalgia haze
   ══════════════════════════════════════════════════ */
function initGoodOldDays(w, h) {
  var photos = [];
  for (var i = 0; i < 8; i++) {
    photos.push({
      x: rand(0, w), y: rand(0, h),
      w: rand(40, 80), h: rand(50, 90),
      rot: rand(-0.2, 0.2),
      drift: rand(0.15, 0.3),
      phase: rand(0, Math.PI * 2),
      opacity: rand(0.2, 0.27),
    });
  }
  var lights = [];
  for (var i = 0; i < 15; i++) {
    lights.push({
      x: rand(0, w), y: rand(0, h),
      r: rand(30, 120),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.04, 0.128),
    });
  }
  return { photos: photos, lights: lights };
}

function drawGoodOldDays(ctx, s, color, w, h, t) {
  // Warm light leaks
  s.lights.forEach(function(l) {
    var pulse = Math.sin(t * l.speed + l.phase) * 0.5 + 0.5;
    var grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    grad.addColorStop(0, rgba(color, 0.45 * pulse));
    grad.addColorStop(0.5, rgba([255, 200, 100], 0.4 * pulse));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  });
  // Floating polaroid ghosts
  s.photos.forEach(function(p) {
    ctx.save();
    p.y -= p.drift;
    if (p.y < -100) { p.y = h + 100; p.x = rand(0, w); }
    var breathe = Math.sin(t * 0.001 + p.phase) * 0.02;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot + breathe);
    ctx.strokeStyle = rgba([255, 240, 200], p.opacity);
    ctx.lineWidth = 1;
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    // Inner "photo" area
    ctx.fillStyle = rgba([255, 220, 150], p.opacity * 0.5);
    ctx.fillRect(-p.w / 2 + 4, -p.h / 2 + 4, p.w - 8, p.h - 16);
    ctx.restore();
  });
}

/* ══════════════════════════════════════════════════
   2. HALFWAY THERE
   A path drawing itself, stepping stones, a pulsing midpoint
   ══════════════════════════════════════════════════ */
function initHalfway(w, h) {
  var steps = [];
  var pathY = h * 0.15;
  for (var i = 0; i < 20; i++) {
    pathY += rand(h * 0.03, h * 0.05);
    steps.push({
      x: w * 0.3 + Math.sin(i * 0.5) * w * 0.15,
      y: pathY,
      r: rand(2, 4),
      delay: i * 300,
      lit: false,
    });
  }
  return { steps: steps, progress: 0 };
}

function drawHalfway(ctx, s, color, w, h, t) {
  s.progress = (t * 0.0003) % 1;
  var litCount = Math.floor(s.progress * s.steps.length);
  var midIdx = Math.floor(s.steps.length / 2);
  // Draw path line
  ctx.beginPath();
  ctx.strokeStyle = rgba(color, 0.45);
  ctx.lineWidth = 1;
  for (var i = 0; i < s.steps.length; i++) {
    if (i === 0) ctx.moveTo(s.steps[i].x, s.steps[i].y);
    else ctx.lineTo(s.steps[i].x, s.steps[i].y);
  }
  ctx.stroke();
  // Draw stepping stones
  s.steps.forEach(function(step, i) {
    var isLit = i <= litCount;
    var isMid = i === midIdx;
    var alpha = isLit ? 0.30 : 0.12;
    if (isMid) {
      // Pulsing midpoint beacon
      var pulse = Math.sin(t * 0.003) * 0.5 + 0.5;
      var grad = ctx.createRadialGradient(step.x, step.y, 0, step.x, step.y, 20 + pulse * 15);
      grad.addColorStop(0, rgba(color, 0.5 * pulse));
      grad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(step.x, step.y, 35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    ctx.arc(step.x, step.y, step.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ══════════════════════════════════════════════════
   3. MY FAVORITE THINGS
   Cycling natural elements: dewdrops, waves, clouds, imperfection
   ══════════════════════════════════════════════════ */
function initFavoriteThings(w, h) {
  var dewdrops = [];
  for (var i = 0; i < 25; i++) {
    dewdrops.push({
      x: rand(0, w), y: rand(0, h),
      r: rand(2, 6),
      phase: rand(0, Math.PI * 2),
      wobble: rand(0.5, 2),
    });
  }
  var waves = [];
  for (var i = 0; i < 5; i++) {
    waves.push({
      y: h * 0.5 + i * 30,
      amp: rand(8, 20),
      freq: rand(0.24, 0.42),
      speed: rand(0.04, 0.128),
      phase: rand(0, Math.PI * 2),
    });
  }
  return { dewdrops: dewdrops, waves: waves };
}

function drawFavoriteThings(ctx, s, color, w, h, t) {
  var cycle = (t * 0.0001) % 3;
  // Dewdrops — glistening, imperfect circles
  if (cycle < 1) {
    s.dewdrops.forEach(function(d) {
      var shimmer = Math.sin(t * 0.008 * d.wobble + d.phase) * 0.5 + 0.5;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(1 + shimmer * 0.3, 1 - shimmer * 0.1);
      var grad = ctx.createRadialGradient(0, -d.r * 0.3, 0, 0, 0, d.r);
      grad.addColorStop(0, rgba([220, 240, 255], 0.5 * shimmer));
      grad.addColorStop(0.6, rgba([180, 220, 255], 0.375));
      grad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, d.r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Tiny highlight
      ctx.fillStyle = rgba([255, 255, 255], 0.5 * shimmer);
      ctx.beginPath();
      ctx.arc(-d.r * 0.2, -d.r * 0.3, d.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  // Waves — malformed, silver under moon
  else if (cycle < 2) {
    s.waves.forEach(function(wave) {
      ctx.beginPath();
      ctx.strokeStyle = rgba([200, 210, 230], 0.36);
      ctx.lineWidth = 1;
      for (var x = 0; x < w; x += 3) {
        var y = wave.y + Math.sin(x * wave.freq + t * wave.speed + wave.phase) * wave.amp
          + Math.sin(x * wave.freq * 2.3 + t * wave.speed * 0.7) * wave.amp * 0.3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    // Moonlight reflection
    var moonY = h * 0.45;
    var moonGrad = ctx.createRadialGradient(w * 0.7, moonY, 0, w * 0.7, moonY, 80);
    moonGrad.addColorStop(0, rgba([230, 230, 255], 0.3));
    moonGrad.addColorStop(1, rgba([200, 210, 240], 0));
    ctx.fillStyle = moonGrad;
    ctx.fillRect(0, 0, w, h);
  }
  // Clouds — lumpy, drifting
  else {
    for (var i = 0; i < 4; i++) {
      var cx = (w * 0.2 + i * w * 0.2 + t * 0.01) % (w + 200) - 100;
      var cy = h * 0.2 + i * 50 + Math.sin(t * 0.0005 + i) * 20;
      for (var j = 0; j < 5; j++) {
        var ox = (j - 2) * 18 + Math.sin(j * 1.5 + i) * 8;
        var oy = Math.cos(j * 2 + i) * 6;
        var r = rand(15, 25);
        ctx.fillStyle = rgba([200, 210, 230], 0.25);
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/* ══════════════════════════════════════════════════
   4. IT IS CALM HERE
   Eerie stillness, barely perceptible, then storm edges creeping
   ══════════════════════════════════════════════════ */
function initCalmHere(w, h) {
  var motes = [];
  for (var i = 0; i < 30; i++) {
    motes.push({
      x: rand(0, w), y: rand(0, h),
      vx: 0, vy: 0,
      r: rand(1, 3),
      phase: rand(0, Math.PI * 2),
    });
  }
  return { motes: motes, tension: 0 };
}

function drawCalmHere(ctx, s, color, w, h, t) {
  // Slowly building tension
  s.tension = (Math.sin(t * 0.0002) * 0.5 + 0.5);
  // Edge storm - dark vignette that pulses
  var stormAlpha = s.tension * 0.20;
  var edgeGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
  edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(20,20,40,' + stormAlpha + ')');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, w, h);
  // Almost frozen motes — eerily still
  s.motes.forEach(function(m) {
    // Barely drift, more at higher tension
    m.x += Math.sin(t * 0.0003 + m.phase) * 0.05 * (1 + s.tension * 3);
    m.y += Math.cos(t * 0.0002 + m.phase) * 0.03;
    // Subtle flicker at the edges as storm builds
    var distFromCenter = Math.hypot(m.x - w / 2, m.y - h / 2) / (w / 2);
    var edgeBoost = distFromCenter * s.tension * 0.20;
    ctx.fillStyle = rgba(color, 0.12 + edgeBoost);
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Lightning hint at peak tension
  if (s.tension > 0.9 && Math.random() > 0.98) {
    ctx.fillStyle = rgba([150, 160, 200], 0.24);
    ctx.fillRect(0, 0, w, h);
  }
}

/* ══════════════════════════════════════════════════
   5. STILL, WE FIGHT
   Rising embers and sparks, forge glow, defiant upward motion
   ══════════════════════════════════════════════════ */
function initStillWeFight(w, h) {
  var embers = [];
  for (var i = 0; i < 50; i++) {
    embers.push({
      x: rand(0, w), y: rand(h * 0.5, h),
      vy: -rand(0.3, 1.2),
      vx: rand(-0.3, 0.3),
      r: rand(1, 3),
      life: rand(0, 1),
      maxLife: rand(0.5, 1),
      phase: rand(0, Math.PI * 2),
    });
  }
  return { embers: embers };
}

function drawStillWeFight(ctx, s, color, w, h, t) {
  // Base glow from below
  var baseGrad = ctx.createLinearGradient(0, h, 0, h * 0.6);
  baseGrad.addColorStop(0, rgba([200, 60, 20], 0.3));
  baseGrad.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);
  // Rising embers
  s.embers.forEach(function(e) {
    e.y += e.vy;
    e.x += e.vx + Math.sin(t * 0.002 + e.phase) * 0.2;
    e.life += 0.002;
    if (e.life > e.maxLife || e.y < 0) {
      e.y = h + rand(0, 50);
      e.x = rand(0, w);
      e.life = 0;
    }
    var alpha = Math.sin(e.life / e.maxLife * Math.PI) * 0.38;
    var flicker = Math.sin(t * 0.01 + e.phase) * 0.5 + 0.5;
    var r = e.r * (0.5 + flicker * 0.5);
    var grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 4);
    grad.addColorStop(0, rgba([255, 140, 40], alpha * flicker));
    grad.addColorStop(0.5, rgba(color, alpha * 0.5));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ══════════════════════════════════════════════════
   6. BLACKSMITH
   Hammer shockwaves, molten sparks, anvil rhythm
   ══════════════════════════════════════════════════ */
function initBlacksmith(w, h) {
  var sparks = [];
  for (var i = 0; i < 30; i++) {
    sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false });
  }
  return {
    sparks: sparks,
    anvilX: w * 0.5,
    anvilY: h * 0.4,
    lastStrike: 0,
    shockwave: 0,
    strikeInterval: 3000,
  };
}

function drawBlacksmith(ctx, s, color, w, h, t) {
  // Periodic hammer strikes
  if (t - s.lastStrike > s.strikeInterval) {
    s.lastStrike = t;
    s.shockwave = 1;
    // Burst sparks
    s.sparks.forEach(function(sp) {
      var angle = rand(0, Math.PI * 2);
      var speed = rand(0.5, 3);
      sp.x = s.anvilX;
      sp.y = s.anvilY;
      sp.vx = Math.cos(angle) * speed;
      sp.vy = Math.sin(angle) * speed - rand(0.5, 1.5);
      sp.life = 1;
      sp.active = true;
    });
  }
  // Shockwave ring
  if (s.shockwave > 0) {
    var radius = (1 - s.shockwave) * 150;
    ctx.strokeStyle = rgba(color, s.shockwave * 0.25);
    ctx.lineWidth = 2 * s.shockwave;
    ctx.beginPath();
    ctx.arc(s.anvilX, s.anvilY, radius, 0, Math.PI * 2);
    ctx.stroke();
    s.shockwave -= 0.008;
  }
  // Forge glow
  var glow = Math.sin(t * 0.002) * 0.5 + 0.5;
  var forgeGrad = ctx.createRadialGradient(s.anvilX, s.anvilY, 0, s.anvilX, s.anvilY, 100);
  forgeGrad.addColorStop(0, rgba([255, 180, 80], 0.45 * glow));
  forgeGrad.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = forgeGrad;
  ctx.fillRect(s.anvilX - 100, s.anvilY - 100, 200, 200);
  // Sparks
  s.sparks.forEach(function(sp) {
    if (!sp.active) return;
    sp.x += sp.vx;
    sp.y += sp.vy;
    sp.vy += 0.03; // gravity
    sp.life -= 0.008;
    if (sp.life <= 0) { sp.active = false; return; }
    ctx.fillStyle = rgba([255, 200, 100], sp.life * 0.30);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 1 + sp.life, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ══════════════════════════════════════════════════
   7. THE RACE BETWIXT
   Chasing shadows, a cliff edge, falling/rising vertigo
   ══════════════════════════════════════════════════ */
function initRaceBetwixt(w, h) {
  var hounds = [];
  for (var i = 0; i < 6; i++) {
    hounds.push({
      x: rand(-50, w * 0.3),
      y: h * 0.3 + i * h * 0.1,
      speed: rand(0.3, 0.8),
      size: rand(8, 16),
      phase: rand(0, Math.PI * 2),
    });
  }
  return { hounds: hounds, fallOffset: 0 };
}

function drawRaceBetwixt(ctx, s, color, w, h, t) {
  // Vertigo: subtle vertical oscillation on the whole canvas
  s.fallOffset = Math.sin(t * 0.001) * 3;
  ctx.save();
  ctx.translate(0, s.fallOffset);
  // Chasing shadows — dark forms pursuing from the left
  s.hounds.forEach(function(hound) {
    hound.x += hound.speed;
    if (hound.x > w + 50) { hound.x = -50; hound.y = rand(h * 0.2, h * 0.8); }
    var breathe = Math.sin(t * 0.004 + hound.phase) * 3;
    var grad = ctx.createRadialGradient(hound.x, hound.y, 0, hound.x + 10, hound.y, hound.size + breathe);
    grad.addColorStop(0, rgba([40, 20, 60], 0.4));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(hound.x, hound.y, hound.size + breathe, hound.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Cliff edge — a line near the right with depth beneath
  var cliffX = w * 0.75;
  ctx.strokeStyle = rgba(color, 0.36);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cliffX, 0);
  ctx.lineTo(cliffX, h);
  ctx.stroke();
  // Depth gradient beyond the cliff
  var depthGrad = ctx.createLinearGradient(cliffX, 0, w, 0);
  depthGrad.addColorStop(0, rgba([20, 10, 30], 0));
  depthGrad.addColorStop(1, rgba([20, 10, 30], 0.36));
  ctx.fillStyle = depthGrad;
  ctx.fillRect(cliffX, 0, w - cliffX, h);
  ctx.restore();
}

/* ══════════════════════════════════════════════════
   8. NEMESIS OF THE FLY
   A single erratic buzzing dot, sudden violent stillness
   ══════════════════════════════════════════════════ */
function initNemesis(w, h) {
  return {
    fly: { x: w / 2, y: h / 2, tx: w / 2, ty: h / 2 },
    dead: false,
    deathTime: 0,
    nextDeath: rand(5000, 12000),
    trail: [],
  };
}

function drawNemesis(ctx, s, color, w, h, t) {
  var f = s.fly;
  if (!s.dead) {
    // Erratic buzzing
    if (Math.random() > 0.92) {
      f.tx = rand(w * 0.1, w * 0.9);
      f.ty = rand(h * 0.1, h * 0.9);
    }
    f.x += (f.tx - f.x) * 0.08 + rand(-2, 2);
    f.y += (f.ty - f.y) * 0.08 + rand(-2, 2);
    // Trail
    s.trail.push({ x: f.x, y: f.y, a: 0.20 });
    if (s.trail.length > 20) s.trail.shift();
    // Check for death
    if (t > s.nextDeath) {
      s.dead = true;
      s.deathTime = t;
    }
  }
  // Draw trail
  s.trail.forEach(function(pt, i) {
    pt.a *= 0.92;
    ctx.fillStyle = rgba(color, pt.a);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2);
    ctx.fill();
  });
  if (!s.dead) {
    // The fly — buzzing
    ctx.fillStyle = rgba(color, 0.45);
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    var wingPhase = t * 0.05;
    ctx.strokeStyle = rgba(color, 0.375);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(f.x - 3, f.y - 2, 3, 1.5 * Math.abs(Math.sin(wingPhase)), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(f.x + 3, f.y - 2, 3, 1.5 * Math.abs(Math.cos(wingPhase)), 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Dead — stillness, then reset
    var sinceDeath = t - s.deathTime;
    if (sinceDeath < 2000) {
      // Impact mark
      ctx.fillStyle = rgba(color, 0.18 * (1 - sinceDeath / 2000));
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Respawn
      s.dead = false;
      s.nextDeath = t + rand(5000, 12000);
      s.trail = [];
      f.x = rand(w * 0.2, w * 0.8);
      f.y = rand(h * 0.2, h * 0.8);
    }
  }
}

/* ══════════════════════════════════════════════════
   9. DEARTH
   Tears falling, fading map lines, widowed earth
   ══════════════════════════════════════════════════ */
function initDearth(w, h) {
  var tears = [];
  for (var i = 0; i < 20; i++) {
    tears.push({
      x: rand(0, w), y: rand(-h, 0),
      speed: rand(0.5, 1.5),
      length: rand(8, 20),
      opacity: rand(0.3, 0.3),
    });
  }
  return { tears: tears };
}

function drawDearth(ctx, s, color, w, h, t) {
  // Mournful dark wash
  ctx.fillStyle = rgba([40, 20, 20], 0.05);
  ctx.fillRect(0, 0, w, h);
  // Falling tears
  s.tears.forEach(function(tear) {
    tear.y += tear.speed;
    if (tear.y > h + 20) { tear.y = -20; tear.x = rand(0, w); }
    ctx.strokeStyle = rgba([180, 120, 120], tear.opacity);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tear.x, tear.y);
    ctx.lineTo(tear.x, tear.y + tear.length);
    ctx.stroke();
    // Teardrop at bottom
    ctx.fillStyle = rgba(color, tear.opacity * 0.5);
    ctx.beginPath();
    ctx.arc(tear.x, tear.y + tear.length, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // Fading continental outlines — abstract curves
  ctx.strokeStyle = rgba(color, 0.1);
  ctx.lineWidth = 0.5;
  var drift = t * 0.0001;
  ctx.beginPath();
  for (var x = 0; x < w; x += 5) {
    var y1 = h * 0.35 + Math.sin(x * 0.01 + drift) * 30 + Math.sin(x * 0.03 + drift * 2) * 10;
    if (x === 0) ctx.moveTo(x, y1);
    else ctx.lineTo(x, y1);
  }
  ctx.stroke();
}

/* ══════════════════════════════════════════════════
   10. PHOBIA
   Skittering at edges, sudden bursts, visceral chaos
   ══════════════════════════════════════════════════ */
function initPhobia(w, h) {
  var bugs = [];
  for (var i = 0; i < 8; i++) {
    var edge = Math.floor(rand(0, 4));
    bugs.push({
      x: edge < 2 ? (edge === 0 ? 0 : w) : rand(0, w),
      y: edge >= 2 ? (edge === 2 ? 0 : h) : rand(0, h),
      vx: rand(-1, 1), vy: rand(-1, 1),
      panic: false, panicTime: 0,
    });
  }
  return { bugs: bugs, burstTime: 0, nextBurst: rand(3000, 8000) };
}

function drawPhobia(ctx, s, color, w, h, t) {
  // Edge skittering
  s.bugs.forEach(function(b) {
    if (t > s.nextBurst && !b.panic) {
      b.panic = true;
      b.panicTime = t;
      b.vx = rand(-4, 4);
      b.vy = rand(-4, 4);
    }
    if (b.panic) {
      b.x += b.vx + rand(-2, 2);
      b.y += b.vy + rand(-2, 2);
      if (t - b.panicTime > 600) {
        b.panic = false;
        b.vx = rand(-0.5, 0.5);
        b.vy = rand(-0.5, 0.5);
      }
    } else {
      b.x += b.vx + rand(-0.5, 0.5);
      b.y += b.vy + rand(-0.5, 0.5);
    }
    // Keep near edges
    if (!b.panic) {
      if (b.x > w * 0.3 && b.x < w * 0.7) b.vx -= (b.x - w / 2) * 0.001;
      if (b.y > h * 0.3 && b.y < h * 0.7) b.vy -= (b.y - h / 2) * 0.001;
    }
    b.x = Math.max(0, Math.min(w, b.x));
    b.y = Math.max(0, Math.min(h, b.y));
    var alpha = b.panic ? 0.12 : 0.04;
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.panic ? 3 : 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // Reset burst timer
  if (t > s.nextBurst + 800) {
    s.nextBurst = t + rand(3000, 8000);
  }
  // Visceral flash on burst
  if (t > s.nextBurst - 800 && t < s.nextBurst) {
    if (Math.random() > 0.95) {
      ctx.fillStyle = rgba(color, 0.075);
      ctx.fillRect(0, 0, w, h);
    }
  }
}

/* ══════════════════════════════════════════════════
   11. FATE
   Hourglass sand falling, time dissolving
   ══════════════════════════════════════════════════ */
function initFate(w, h) {
  var grains = [];
  for (var i = 0; i < 40; i++) {
    grains.push({
      x: w / 2 + rand(-30, 30),
      y: rand(0, h * 0.4),
      vy: 0,
      fallen: false,
      phase: rand(0, Math.PI * 2),
    });
  }
  return { grains: grains, neckY: h * 0.48 };
}

function drawFate(ctx, s, color, w, h, t) {
  // Hourglass silhouette — very subtle
  ctx.strokeStyle = rgba(color, 0.16);
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Top triangle
  ctx.moveTo(w / 2 - 50, h * 0.15);
  ctx.lineTo(w / 2, s.neckY);
  ctx.lineTo(w / 2 + 50, h * 0.15);
  // Bottom triangle
  ctx.moveTo(w / 2 - 50, h * 0.8);
  ctx.lineTo(w / 2, s.neckY + 10);
  ctx.lineTo(w / 2 + 50, h * 0.8);
  ctx.stroke();
  // Sand grains falling through the neck
  s.grains.forEach(function(g) {
    if (!g.fallen) {
      // Drift toward center neck
      g.x += (w / 2 - g.x) * 0.003;
      g.y += 0.15;
      if (g.y > s.neckY) {
        g.fallen = true;
        g.vy = rand(0.5, 1.5);
        g.x = w / 2 + rand(-3, 3);
      }
    } else {
      g.y += g.vy;
      g.x += rand(-0.3, 0.3);
      g.vy += 0.01;
      if (g.y > h * 0.78) {
        // Reset
        g.y = rand(-20, h * 0.15);
        g.x = w / 2 + rand(-40, 40);
        g.fallen = false;
        g.vy = 0;
      }
    }
    var alpha = 0.06 + Math.sin(t * 0.001 + g.phase) * 0.02;
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    ctx.arc(g.x, g.y, 1, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ══════════════════════════════════════════════════
   12. NOMAD OF SHADOWS
   Wandering figure trace, foreign constellations, ocean edge
   ══════════════════════════════════════════════════ */
function initNomad(w, h) {
  var stars = [];
  for (var i = 0; i < 60; i++) {
    stars.push({
      x: rand(0, w), y: rand(0, h * 0.6),
      r: rand(0.5, 1.5),
      twinkle: rand(0, Math.PI * 2),
      speed: rand(0.08, 0.192),
    });
  }
  return {
    stars: stars,
    wanderer: { x: 0, y: h * 0.72, speed: 0.15 },
    footprints: [],
  };
}

function drawNomad(ctx, s, color, w, h, t) {
  // Foreign constellations
  s.stars.forEach(function(star) {
    var twinkle = Math.sin(t * star.speed + star.twinkle) * 0.5 + 0.5;
    ctx.fillStyle = rgba([180, 200, 240], 0.03 + twinkle * 0.05);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r * twinkle, 0, Math.PI * 2);
    ctx.fill();
  });
  // Connect some stars as alien constellations
  ctx.strokeStyle = rgba(color, 0.075);
  ctx.lineWidth = 0.5;
  for (var i = 0; i < s.stars.length - 3; i += 4) {
    ctx.beginPath();
    ctx.moveTo(s.stars[i].x, s.stars[i].y);
    ctx.lineTo(s.stars[i + 1].x, s.stars[i + 1].y);
    ctx.lineTo(s.stars[i + 2].x, s.stars[i + 2].y);
    ctx.stroke();
  }
  // Ocean at bottom
  ctx.strokeStyle = rgba([60, 80, 120], 0.16);
  ctx.lineWidth = 1;
  for (var layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    for (var x = 0; x < w; x += 4) {
      var oy = h * 0.85 + layer * 12 + Math.sin(x * 0.008 + t * 0.0008 + layer) * 6;
      if (x === 0) ctx.moveTo(x, oy);
      else ctx.lineTo(x, oy);
    }
    ctx.stroke();
  }
  // Wandering figure — a subtle vertical line that walks
  var wand = s.wanderer;
  wand.x += wand.speed;
  if (wand.x > w + 20) { wand.x = -20; }
  // Leave fading footprints
  if (Math.floor(t / 400) !== Math.floor((t - 16) / 400)) {
    s.footprints.push({ x: wand.x, y: wand.y + 10, a: 0.06 });
    if (s.footprints.length > 30) s.footprints.shift();
  }
  s.footprints.forEach(function(fp) {
    fp.a *= 0.998;
    ctx.fillStyle = rgba(color, fp.a);
    ctx.fillRect(fp.x - 1, fp.y, 2, 1);
  });
  // The wanderer silhouette
  ctx.fillStyle = rgba([50, 60, 80], 0.24);
  ctx.fillRect(wand.x - 1, wand.y - 14, 2, 14);
  ctx.fillRect(wand.x - 3, wand.y - 16, 6, 4);
}

/* ══════════════════════════════════════════════════
   13. A MEDITATION ON FORCES
   Orbital bodies, tidal pull, two satellites drifting apart
   ══════════════════════════════════════════════════ */
function initForces(w, h) {
  return {
    center: { x: w / 2, y: h / 2 },
    bodyA: { angle: 0, dist: 60, speed: 0.0008 },
    bodyB: { angle: Math.PI, dist: 60, speed: 0.0006 },
    tides: [],
    separation: 0,
  };
}

function drawForces(ctx, s, color, w, h, t) {
  s.separation = 40 + Math.sin(t * 0.0002) * 35;
  var cx = w / 2, cy = h / 2;
  // Body A orbit
  s.bodyA.angle += s.bodyA.speed;
  var ax = cx + Math.cos(s.bodyA.angle) * s.separation;
  var ay = cy + Math.sin(s.bodyA.angle) * s.separation * 0.6;
  // Body B orbit
  s.bodyB.angle += s.bodyB.speed;
  var bx = cx + Math.cos(s.bodyB.angle) * (s.separation * 1.2);
  var by = cy + Math.sin(s.bodyB.angle) * (s.separation * 0.8);
  // Gravitational field lines
  ctx.strokeStyle = rgba(color, 0.1);
  ctx.lineWidth = 0.5;
  for (var i = 0; i < 8; i++) {
    var angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, s.separation + 20 + i * 15, angle, angle + Math.PI * 0.3);
    ctx.stroke();
  }
  // Tidal waves from center
  var tidePhase = t * 0.001;
  for (var r = 20; r < 180; r += 30) {
    var tideAlpha = 0.02 * (1 - r / 180);
    ctx.strokeStyle = rgba([200, 140, 180], tideAlpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r + Math.sin(tidePhase + r * 0.02) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Body A — warm
  var gradA = ctx.createRadialGradient(ax, ay, 0, ax, ay, 12);
  gradA.addColorStop(0, rgba([255, 160, 140], 0.3));
  gradA.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradA;
  ctx.beginPath();
  ctx.arc(ax, ay, 12, 0, Math.PI * 2);
  ctx.fill();
  // Body B — cool
  var gradB = ctx.createRadialGradient(bx, by, 0, bx, by, 10);
  gradB.addColorStop(0, rgba([140, 160, 255], 0.25));
  gradB.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradB;
  ctx.beginPath();
  ctx.arc(bx, by, 10, 0, Math.PI * 2);
  ctx.fill();
  // Thread between them that stretches
  var dist = Math.hypot(ax - bx, ay - by);
  var threadAlpha = Math.max(0.01, 0.06 - dist * 0.0003);
  ctx.strokeStyle = rgba(color, threadAlpha);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(cx, cy - 20, bx, by);
  ctx.stroke();
}

/* ══════════════════════════════════════════════════
   14. WE WERE ALL STRANGERS ONCE
   Particles that start isolated, slowly find each other with golden threads
   ══════════════════════════════════════════════════ */
function initStrangers(w, h) {
  var souls = [];
  for (var i = 0; i < 30; i++) {
    souls.push({
      x: rand(0, w), y: rand(0, h),
      homeX: rand(w * 0.2, w * 0.8),
      homeY: rand(h * 0.2, h * 0.8),
      vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3),
      connected: false,
      r: rand(1.5, 3),
    });
  }
  return { souls: souls, connectionPhase: 0 };
}

function drawStrangers(ctx, s, color, w, h, t) {
  // Connection builds over time, then resets
  s.connectionPhase = (Math.sin(t * 0.00015) * 0.5 + 0.5);
  var connectDist = 40 + s.connectionPhase * 150;
  // Souls drift, but slowly gravitate toward each other as connection grows
  s.souls.forEach(function(soul) {
    // Gentle drift
    soul.x += soul.vx;
    soul.y += soul.vy;
    // Pull toward cluster center at high connection
    if (s.connectionPhase > 0.3) {
      soul.x += (soul.homeX - soul.x) * 0.0005 * s.connectionPhase;
      soul.y += (soul.homeY - soul.y) * 0.0005 * s.connectionPhase;
    }
    // Wrap
    if (soul.x < 0) soul.x = w;
    if (soul.x > w) soul.x = 0;
    if (soul.y < 0) soul.y = h;
    if (soul.y > h) soul.y = 0;
    // Draw soul
    var alpha = 0.04 + s.connectionPhase * 0.06;
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    ctx.arc(soul.x, soul.y, soul.r, 0, Math.PI * 2);
    ctx.fill();
  });
  // Golden threads between nearby souls
  ctx.strokeStyle = rgba(color, 0.02 + s.connectionPhase * 0.03);
  ctx.lineWidth = 0.5;
  for (var i = 0; i < s.souls.length; i++) {
    for (var j = i + 1; j < s.souls.length; j++) {
      var dist = Math.hypot(s.souls[i].x - s.souls[j].x, s.souls[i].y - s.souls[j].y);
      if (dist < connectDist) {
        ctx.beginPath();
        ctx.moveTo(s.souls[i].x, s.souls[i].y);
        ctx.lineTo(s.souls[j].x, s.souls[j].y);
        ctx.stroke();
      }
    }
  }
}

/* ══════════════════════════════════════════════════
   15. PIMPLED AMBIVALENCE
   Playful bumps popping up, comically annoying, self-deflating
   ══════════════════════════════════════════════════ */
function initPimpled(w, h) {
  var bumps = [];
  return { bumps: bumps, nextBump: rand(500, 2000), w: w, h: h };
}

function drawPimpled(ctx, s, color, w, h, t) {
  // Spawn new bumps periodically
  if (t > s.nextBump) {
    s.bumps.push({
      x: rand(w * 0.15, w * 0.85),
      y: rand(h * 0.15, h * 0.85),
      r: 0,
      maxR: rand(6, 18),
      growing: true,
      life: 1,
      born: t,
    });
    s.nextBump = t + rand(800, 2500);
  }
  // Draw and update bumps
  for (var i = s.bumps.length - 1; i >= 0; i--) {
    var b = s.bumps[i];
    if (b.growing) {
      b.r += (b.maxR - b.r) * 0.03;
      if (b.r > b.maxR * 0.95) b.growing = false;
    } else {
      b.life -= 0.005;
    }
    if (b.life <= 0) { s.bumps.splice(i, 1); continue; }
    // The bump — raised circle with highlight
    var alpha = b.life * 0.08;
    ctx.fillStyle = rgba([220, 180, 160], alpha);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    // Highlight on top
    ctx.fillStyle = rgba([255, 230, 210], alpha * 0.6);
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Subtle ring
    ctx.strokeStyle = rgba(color, alpha * 0.5);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ══════════════════════════════════════════════════
   Generic fallbacks (theme-based)
   ══════════════════════════════════════════════════ */
function initGeneric(w, h) {
  var particles = [];
  for (var i = 0; i < 40; i++) {
    particles.push({
      x: rand(0, w), y: rand(0, h),
      vx: rand(-0.15, 0.15), vy: rand(-0.1, 0.1),
      r: rand(1, 3), a: rand(0.08, 0.3),
    });
  }
  return { particles: particles };
}

function drawGenericEmbers(ctx, s, color, w, h, t) {
  s.particles.forEach(function(p) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
    grad.addColorStop(0, rgba(color, p.a));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGenericRipples(ctx, s, color, w, h, t) {
  s.particles.forEach(function(p) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    ctx.strokeStyle = rgba(color, p.a * 0.5);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 12 + Math.sin(t * 0.001 + p.x) * 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawGenericDrift(ctx, s, color, w, h, t) {
  ctx.strokeStyle = rgba(color, 0.12);
  ctx.lineWidth = 0.5;
  for (var i = 0; i < s.particles.length - 1; i++) {
    var a = s.particles[i]; var b = s.particles[i + 1];
    a.x += a.vx; a.y += a.vy;
    if (a.x < 0) a.x = w; if (a.x > w) a.x = 0;
    if (a.y < 0) a.y = h; if (a.y > h) a.y = 0;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 150) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  drawGenericEmbers(ctx, s, color, w, h, t);
}

function drawGenericThreads(ctx, s, color, w, h, t) {
  s.particles.forEach(function(p) { p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
  });
  ctx.strokeStyle = rgba(color, 0.3);
  ctx.lineWidth = 0.5;
  for (var i = 0; i < s.particles.length; i++) {
    for (var j = i + 1; j < s.particles.length; j++) {
      if (Math.hypot(s.particles[i].x - s.particles[j].x, s.particles[i].y - s.particles[j].y) < 120) {
        ctx.beginPath();
        ctx.moveTo(s.particles[i].x, s.particles[i].y);
        ctx.lineTo(s.particles[j].x, s.particles[j].y);
        ctx.stroke();
      }
    }
  }
}

/* ══════════════════════════════════════════════════
   Main entry points
   ══════════════════════════════════════════════════ */
export function initPoemBg(themeStr, slugStr) {
  var container = document.querySelector('.poem-single');
  if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  canvas = document.createElement('canvas');
  canvas.className = 'poem-bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.style.position = 'relative';
  container.insertBefore(canvas, container.firstChild);

  // Prefer slug-specific visual, fall back to theme
  var visual = POEM_VISUALS[(slugStr || '').toLowerCase()]
    || THEMES[(themeStr || '').toLowerCase()]
    || THEMES.resilience;

  function resize() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  state = visual.init(canvas.width, canvas.height);
  var drawFn = visual.draw;
  var color = visual.color;
  var startTime = performance.now();

  function animate() {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var elapsed = performance.now() - startTime;
    drawFn(ctx, state, color, canvas.width, canvas.height, elapsed);
    raf = requestAnimationFrame(animate);
  }

  animate();
}

export function destroyPoemBg() {
  if (raf) cancelAnimationFrame(raf);
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  canvas = null;
  ctx = null;
  state = null;
}
