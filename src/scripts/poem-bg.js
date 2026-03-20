/**
 * Generative Poem Backgrounds
 * Subtle, slow-moving canvas art behind each poem, responding to theme.
 */

var THEMES = {
  'resilience': { color: [121, 185, 57], draw: drawEmbers },
  'identity': { color: [212, 165, 116], draw: drawForge },
  'heritage': { color: [185, 78, 200], draw: drawRipples },
  'exile': { color: [100, 140, 200], draw: drawDrift },
  'connection': { color: [200, 160, 80], draw: drawThreads },
  'nature': { color: [80, 160, 120], draw: drawRipples },
  'memory': { color: [160, 120, 180], draw: drawDrift },
  'love': { color: [200, 100, 120], draw: drawThreads },
};

var canvas, ctx, raf, particles;

export function initPoemBg(themeStr) {
  var container = document.querySelector('.poem-single');
  if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  canvas = document.createElement('canvas');
  canvas.className = 'poem-bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.style.position = 'relative';
  container.insertBefore(canvas, container.firstChild);

  var theme = THEMES[(themeStr || '').toLowerCase()] || THEMES.resilience;
  particles = [];

  function resize() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Seed particles
  for (var i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 2 + 1,
      a: Math.random() * 0.12 + 0.02,
    });
  }

  function animate() {
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    theme.draw(ctx, particles, theme.color, canvas.width, canvas.height);

    particles.forEach(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });

    raf = requestAnimationFrame(animate);
  }

  animate();
}

export function destroyPoemBg() {
  if (raf) cancelAnimationFrame(raf);
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  canvas = null;
  ctx = null;
  particles = null;
}

function drawEmbers(ctx, particles, color, w, h) {
  particles.forEach(function (p) {
    var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
    grad.addColorStop(0, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + p.a + ')');
    grad.addColorStop(1, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRipples(ctx, particles, color, w, h) {
  particles.forEach(function (p) {
    ctx.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (p.a * 0.5) + ')';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 12 + Math.sin(Date.now() * 0.001 + p.x) * 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawForge(ctx, particles, color, w, h) {
  particles.forEach(function (p) {
    var flicker = Math.sin(Date.now() * 0.003 + p.y) * 0.5 + 0.5;
    ctx.fillStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (p.a * flicker) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (1 + flicker * 2), 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDrift(ctx, particles, color, w, h) {
  ctx.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0.03)';
  ctx.lineWidth = 0.5;
  for (var i = 0; i < particles.length - 1; i++) {
    var a = particles[i];
    var b = particles[i + 1];
    var dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist < 150) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  drawEmbers(ctx, particles, color, w, h);
}

function drawThreads(ctx, particles, color, w, h) {
  ctx.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0.04)';
  ctx.lineWidth = 0.5;
  for (var i = 0; i < particles.length; i++) {
    for (var j = i + 1; j < particles.length; j++) {
      var dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}
