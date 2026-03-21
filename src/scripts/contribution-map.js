/**
 * Contribution Map — Glowing world map of poem contributors
 *
 * Draws a minimal equirectangular world map with glowing dots
 * for each contributor's location (city/country from socials JSON).
 */

// Country centroids (lat, lng) — covers most common countries
var COUNTRY_COORDS = {
  'nigeria': [9.08, 8.68], 'united states': [37.09, -95.71], 'usa': [37.09, -95.71],
  'united kingdom': [55.38, -3.44], 'uk': [55.38, -3.44], 'england': [52.36, -1.17],
  'canada': [56.13, -106.35], 'australia': [-25.27, 133.78], 'india': [20.59, 78.96],
  'germany': [51.17, 10.45], 'france': [46.23, 2.21], 'japan': [36.20, 138.25],
  'brazil': [-14.24, -51.93], 'south africa': [30.56, 22.94], 'mexico': [23.63, -102.55],
  'china': [35.86, 104.20], 'spain': [40.46, -3.75], 'italy': [41.87, 12.57],
  'kenya': [-0.02, 37.91], 'ghana': [7.95, -1.02], 'egypt': [26.82, 30.80],
  'netherlands': [52.13, 5.29], 'sweden': [60.13, 18.64], 'norway': [60.47, 8.47],
  'south korea': [35.91, 127.77], 'korea': [35.91, 127.77], 'argentina': [-38.42, -63.62],
  'colombia': [4.57, -74.30], 'portugal': [39.40, -8.22], 'ireland': [53.14, -7.69],
  'poland': [51.92, 19.15], 'turkey': [38.96, 35.24], 'philippines': [12.88, 121.77],
  'indonesia': [-0.79, 113.92], 'pakistan': [30.38, 69.35], 'bangladesh': [23.68, 90.36],
  'thailand': [15.87, 100.99], 'vietnam': [14.06, 108.28], 'malaysia': [4.21, 101.98],
  'singapore': [1.35, 103.82], 'new zealand': [-40.90, 174.89], 'chile': [-35.68, -71.54],
  'peru': [-9.19, -75.02], 'ethiopia': [9.15, 40.49], 'tanzania': [-6.37, 34.89],
  'morocco': [31.79, -7.09], 'ukraine': [48.38, 31.17], 'russia': [61.52, 105.32],
  'czech republic': [49.82, 15.47], 'denmark': [56.26, 9.50], 'finland': [61.92, 25.75],
  'austria': [47.52, 14.55], 'switzerland': [46.82, 8.23], 'belgium': [50.50, 4.47],
  'greece': [39.07, 21.82], 'romania': [45.94, 24.97], 'hungary': [47.16, 19.50],
  'scotland': [56.49, -4.20], 'wales': [52.13, -3.78], 'jamaica': [18.11, -77.30],
  'trinidad': [10.69, -61.22], 'uae': [23.42, 53.85], 'saudi arabia': [23.89, 45.08],
  'israel': [31.05, 34.85], 'qatar': [25.35, 51.18], 'cuba': [21.52, -77.78],
  'senegal': [14.50, -14.45], 'cameroon': [7.37, 12.35], 'uganda': [1.37, 32.29],
  'rwanda': [-1.94, 29.87], 'zimbabwe': [-19.02, 29.15], 'botswana': [-22.33, 24.68],
};

// Major cities (lat, lng)
var CITY_COORDS = {
  'new york': [40.71, -74.01], 'los angeles': [34.05, -118.24], 'chicago': [41.88, -87.63],
  'london': [51.51, -0.13], 'paris': [48.86, 2.35], 'berlin': [52.52, 13.41],
  'tokyo': [35.68, 139.69], 'lagos': [6.52, 3.38], 'nairobi': [1.29, 36.82],
  'toronto': [43.65, -79.38], 'sydney': [-33.87, 151.21], 'melbourne': [-37.81, 144.96],
  'mumbai': [19.08, 72.88], 'delhi': [28.70, 77.10], 'bangalore': [12.97, 77.59],
  'san francisco': [37.77, -122.42], 'seattle': [47.61, -122.33], 'boston': [42.36, -71.06],
  'miami': [25.76, -80.19], 'houston': [29.76, -95.37], 'atlanta': [33.75, -84.39],
  'cape town': [-33.93, 18.42], 'johannesburg': [-26.20, 28.05], 'accra': [5.60, -0.19],
  'dubai': [25.20, 55.27], 'singapore': [1.35, 103.82], 'hong kong': [22.32, 114.17],
  'shanghai': [31.23, 121.47], 'beijing': [39.90, 116.41], 'seoul': [37.57, 126.98],
  'amsterdam': [52.37, 4.90], 'barcelona': [41.39, 2.17], 'madrid': [40.42, -3.70],
  'rome': [41.90, 12.50], 'lisbon': [38.72, -9.14], 'dublin': [53.35, -6.26],
  'stockholm': [59.33, 18.07], 'oslo': [59.91, 10.75], 'copenhagen': [55.68, 12.57],
  'vienna': [48.21, 16.37], 'zurich': [47.38, 8.54], 'brussels': [50.85, 4.35],
  'buenos aires': [-34.60, -58.38], 'sao paulo': [-23.55, -46.63], 'rio de janeiro': [-22.91, -43.17],
  'mexico city': [19.43, -99.13], 'bogota': [4.71, -74.07], 'lima': [-12.05, -77.04],
  'cairo': [30.04, 31.24], 'casablanca': [33.57, -7.59], 'addis ababa': [9.02, 38.75],
  'dar es salaam': [-6.79, 39.28], 'manila': [14.60, 120.98], 'jakarta': [-6.21, 106.85],
  'bangkok': [13.76, 100.50], 'hanoi': [21.03, 105.85], 'kuala lumpur': [3.14, 101.69],
  'washington': [38.91, -77.04], 'dc': [38.91, -77.04], 'austin': [30.27, -97.74],
  'denver': [39.74, -104.99], 'portland': [45.51, -122.68], 'philadelphia': [39.95, -75.17],
  'abuja': [9.06, 7.49], 'kigali': [-1.94, 30.06], 'kampala': [0.35, 32.58],
  'edinburgh': [55.95, -3.19], 'manchester': [53.48, -2.24], 'glasgow': [55.86, -4.25],
  'birmingham': [52.49, -1.90], 'montreal': [45.50, -73.57], 'vancouver': [49.28, -123.12],
  'auckland': [-36.85, 174.76], 'wellington': [-41.29, 174.78],
};

/**
 * Parse location from a poem line's author_link JSON
 * Returns { city, country } or null
 */
function parseLocation(line) {
  if (!line.author_link) return null;
  try {
    var socials = JSON.parse(line.author_link);
    if (socials && (socials.city || socials.country)) {
      return {
        city: (socials.city || '').toLowerCase().trim(),
        country: (socials.country || '').toLowerCase().trim(),
      };
    }
  } catch (e) {}
  return null;
}

/**
 * Resolve a location to [lat, lng] coordinates
 */
function resolveCoords(loc) {
  if (!loc) return null;
  // Try city first
  if (loc.city && CITY_COORDS[loc.city]) return CITY_COORDS[loc.city];
  // Try country
  if (loc.country && COUNTRY_COORDS[loc.country]) return COUNTRY_COORDS[loc.country];
  return null;
}

/**
 * Convert lat/lng to canvas x/y (equirectangular projection)
 */
function latLngToXY(lat, lng, w, h) {
  var x = ((lng + 180) / 360) * w;
  var y = ((90 - lat) / 180) * h;
  return [x, y];
}

/**
 * Draw simplified continent outlines
 */
function drawContinents(ctx, w, h) {
  ctx.strokeStyle = 'rgba(122, 123, 117, 0.15)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(122, 123, 117, 0.04)';

  // Simplified continent shapes as polylines (lat/lng pairs)
  var continents = [
    // North America
    [[-10, 70], [-25, 60], [-60, 55], [-75, 48], [-80, 38], [-82, 30], [-100, 28], [-118, 34], [-124, 48], [-140, 60], [-168, 65], [-165, 72], [-80, 72], [-60, 65], [-10, 70]],
    // South America
    [[-80, 10], [-75, -5], [-70, -15], [-58, -35], [-68, -55], [-75, -50], [-70, -20], [-82, 5], [-80, 10]],
    // Europe
    [[0, 72], [30, 72], [50, 68], [40, 55], [28, 42], [25, 35], [12, 37], [-5, 36], [-10, 44], [-8, 58], [0, 62], [0, 72]],
    // Africa
    [[-17, 15], [-5, 36], [12, 37], [25, 32], [35, 12], [50, 12], [42, -5], [35, -15], [28, -33], [18, -35], [12, -18], [8, 5], [-17, 15]],
    // Asia
    [[50, 68], [70, 72], [180, 68], [160, 55], [145, 48], [130, 35], [120, 22], [105, 12], [98, 16], [80, 8], [77, 15], [68, 25], [48, 30], [40, 38], [40, 55], [50, 68]],
    // Australia
    [[114, -10], [130, -12], [150, -15], [154, -28], [148, -38], [135, -35], [114, -22], [114, -10]],
  ];

  continents.forEach(function (shape) {
    ctx.beginPath();
    shape.forEach(function (point, i) {
      var xy = latLngToXY(point[1], point[0], w, h);
      if (i === 0) ctx.moveTo(xy[0], xy[1]);
      else ctx.lineTo(xy[0], xy[1]);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
}

/**
 * Draw a glowing dot at the given canvas position
 */
function drawGlowDot(ctx, x, y, radius, color) {
  // Outer glow
  var grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
  grad.addColorStop(0, color.replace(')', ', 0.6)').replace('rgb', 'rgba'));
  grad.addColorStop(0.5, color.replace(')', ', 0.15)').replace('rgb', 'rgba'));
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
  ctx.fill();

  // Core dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Lazy-initialize the contribution map using IntersectionObserver.
 * The map only renders when the canvas scrolls into (or near) the viewport.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} lines - poem_lines data
 */
export function lazyInitContributionMap(canvas, lines) {
  if (!canvas) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: initialize immediately if IO is unsupported
    initContributionMap(canvas, lines);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          initContributionMap(canvas, lines);
          observer.disconnect();
        }
      });
    },
    { rootMargin: '200px' }
  );

  observer.observe(canvas);
}

/**
 * Initialize the contribution map
 * @param {HTMLCanvasElement} canvas
 * @param {Array} lines - poem_lines data
 */
export function initContributionMap(canvas, lines) {
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var container = canvas.parentElement;
  var w = container.offsetWidth;
  var h = Math.round(w * 0.5); // 2:1 aspect ratio for equirectangular
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  // Background
  ctx.fillStyle = '#13100D';
  ctx.fillRect(0, 0, w, h);

  // Draw continents
  drawContinents(ctx, w, h);

  // Collect locations from lines
  var points = [];
  var seen = {};
  lines.forEach(function (line) {
    var loc = parseLocation(line);
    var coords = resolveCoords(loc);
    if (coords) {
      var key = coords[0] + ',' + coords[1];
      if (seen[key]) {
        seen[key].count++;
      } else {
        seen[key] = { lat: coords[0], lng: coords[1], count: 1 };
        points.push(seen[key]);
      }
    }
  });

  if (points.length === 0) {
    // No locations yet — show a subtle message
    ctx.fillStyle = 'rgba(122, 123, 117, 0.4)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Locations appear as contributors share where they write from', w / 2, h / 2);
    return;
  }

  // Draw dots with glow
  var maxCount = Math.max.apply(null, points.map(function (p) { return p.count; }));

  points.forEach(function (point) {
    var xy = latLngToXY(point.lat, point.lng, w, h);
    var intensity = Math.min(1, point.count / maxCount);
    var radius = 2 + intensity * 4;
    var green = Math.round(185 + intensity * 70);
    var color = 'rgb(121, ' + Math.min(255, green) + ', 57)';
    drawGlowDot(ctx, xy[0], xy[1], radius, color);
  });

  // Stats
  ctx.fillStyle = 'rgba(122, 123, 117, 0.5)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(points.length + ' location' + (points.length !== 1 ? 's' : ''), 12, h - 10);
}
