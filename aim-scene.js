(() => {
  'use strict';

  const eyeY = 1.78;
  const near = .22;
  const halfRoom = 11.8;
  const roomHeight = 7.4;
  const roomFront = -1;
  const roomBack = 28;
  const tau = Math.PI * 2;
  const light = [-.46, .74, -.49];
  const preview = Object.freeze([
    Object.freeze({ x: -2.25, y: 1.15, z: 7.8, radius: .78 }),
    Object.freeze({ x: 3.12, y: 4.20, z: 13.3, radius: .92 }),
    Object.freeze({ x: .55, y: 2.25, z: 20.1, radius: 1.02 }),
  ]);

  function sample(random = Math.random) {
    const z = 6.5 + random() * 15.3;
    const radius = .70 + random() * .17 + (z - 6.5) * .015;
    const maxX = .41 * z - 1.25 * radius;
    const bottom = Math.max(radius + .19, eyeY - z * .23);
    const top = Math.min(roomHeight - radius - .43, eyeY + z * .29);
    return { x: (random() * 2 - 1) * maxX, y: bottom + random() * (top - bottom), z, radius };
  }

  const validTarget = (target) => target && Number.isFinite(target.x) && Number.isFinite(target.y)
    && Number.isFinite(target.z) && Number.isFinite(target.radius) && target.radius > 0;

  const point = (x, y, z) => [x, y, z];
  const floor = (x, z) => point(x, 0, z);
  const back = (x, y) => point(x, y, roomBack);
  const groundPatch = (left, right, start, end, y = .012) => [point(left, y, start), point(right, y, start), point(right, y, end), point(left, y, end)];
  const ceilingPatch = (left, right, start, end) => groundPatch(left, right, start, end, roomHeight - .014);
  const faces = [
    { points: [floor(-halfRoom, roomFront), floor(halfRoom, roomFront), floor(halfRoom, roomBack), floor(-halfRoom, roomBack)], colors: ['#34523a', '#15241b'] },
    { points: [point(-halfRoom, roomHeight, roomFront), point(-halfRoom, roomHeight, roomBack), point(halfRoom, roomHeight, roomBack), point(halfRoom, roomHeight, roomFront)], colors: ['#0c1611', '#202f23'] },
    { points: [floor(-halfRoom, roomFront), back(-halfRoom, 0), back(-halfRoom, roomHeight), point(-halfRoom, roomHeight, roomFront)], colors: ['#1d3025', '#294233'] },
    { points: [floor(halfRoom, roomFront), point(halfRoom, roomHeight, roomFront), back(halfRoom, roomHeight), back(halfRoom, 0)], colors: ['#182a21', '#22392b'] },
    { points: [back(-halfRoom, 0), back(halfRoom, 0), back(halfRoom, roomHeight), back(-halfRoom, roomHeight)], colors: ['#304736', '#1c3023'] },
    { points: [floor(-halfRoom, roomFront), point(-halfRoom, roomHeight, roomFront), point(halfRoom, roomHeight, roomFront), floor(halfRoom, roomFront)], colors: ['#18261d', '#1b2b21'] },
  ];
  const grid = [];
  for (let x = -11; x <= 11; x += 2) {
    grid.push([floor(x, 0), floor(x, roomBack)]);
    grid.push([back(x, 0), back(x, roomHeight)]);
  }
  for (let z = 2; z <= roomBack; z += 2) {
    grid.push([floor(-halfRoom, z), floor(halfRoom, z)]);
    if (z % 4 === 0) {
      grid.push([floor(-halfRoom, z), point(-halfRoom, roomHeight, z)]);
      grid.push([floor(halfRoom, z), point(halfRoom, roomHeight, z)]);
    }
  }
  for (let y = 1.2; y < roomHeight; y += 1.2) {
    grid.push([back(-halfRoom, y), back(halfRoom, y)]);
    grid.push([point(-halfRoom, y, 0), back(-halfRoom, y)]);
    grid.push([point(halfRoom, y, 0), back(halfRoom, y)]);
  }

  const rails = [
    [floor(-halfRoom, 0), back(-halfRoom, 0)], [floor(halfRoom, 0), back(halfRoom, 0)],
    [back(-halfRoom, 0), back(halfRoom, 0)], [back(-halfRoom, roomHeight), back(halfRoom, roomHeight)],
    [back(-halfRoom, 0), back(-halfRoom, roomHeight)], [back(halfRoom, 0), back(halfRoom, roomHeight)],
    [point(-halfRoom, 1.2, 0), back(-halfRoom, 1.2)], [point(halfRoom, 1.2, 0), back(halfRoom, 1.2)],
  ];
  const backPanel = [back(-7.95, .60), back(7.95, .60), back(7.95, 6.65), back(-7.95, 6.65)];
  const rangeOutline = [back(-7.95, .60), back(7.95, .60), back(7.95, 6.65), back(-7.95, 6.65), back(-7.95, .60)];
  const strips = [{ points: groundPatch(-2.9, 2.9, roomFront, roomBack), fill: '#8fb88410' }];
  for (const edge of [-2.9, 2.9]) {
    strips.push({ points: groundPatch(edge - .025, edge + .025, roomFront, roomBack, .016), fill: '#c0e0a661' });
    for (let z = 2.7; z < roomBack - 1; z += 3.3) {
      strips.push({ points: groundPatch(edge - .16, edge + .16, z, z + .055, .017), fill: '#c5e6ad7a' });
    }
  }
  for (const x of [-4.4, 4.4]) {
    for (let z = 3; z < roomBack - 1; z += 5.6) {
      strips.push({ points: ceilingPatch(x - .31, x + .31, z, z + 2.5), fill: '#afdd9c2d' });
      strips.push({ points: ceilingPatch(x - .05, x + .05, z + .18, z + 2.32), fill: '#c9efb256' });
    }
  }
  const ribs = [];
  for (const z of [4.4, 10.6, 17.2, 23.8]) {
    const inner = halfRoom - .46;
    const cap = roomHeight - .38;
    ribs.push(
      { points: [point(-halfRoom, 0, z), point(-inner, 0, z), point(-inner, cap, z), point(-halfRoom, roomHeight, z)], fill: '#8ebd9b24' },
      { points: [point(halfRoom, 0, z), point(inner, 0, z), point(inner, cap, z), point(halfRoom, roomHeight, z)], fill: '#8ebd9b1e' },
      { points: [point(-halfRoom, roomHeight, z), point(halfRoom, roomHeight, z), point(inner, cap, z), point(-inner, cap, z)], fill: '#a8cda91f' },
    );
  }

  const clamp = (value, limit) => Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value)) : 0;
  const basis = (yaw, pitch) => {
    yaw = clamp(yaw, .7);
    pitch = clamp(pitch, .38);
    const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    return { right: [cy, 0, -sy], up: [-sy * sp, cp, -cy * sp], forward: [sy * cp, sp, cy * cp] };
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const viewPoint = ([x, y, z], camera) => {
    const delta = [x, y - eyeY, z];
    return [dot(delta, camera.right), dot(delta, camera.up), dot(delta, camera.forward)];
  };
  const atNear = (a, b) => {
    const blend = (near - a[2]) / (b[2] - a[2]);
    return [a[0] + (b[0] - a[0]) * blend, a[1] + (b[1] - a[1]) * blend, near];
  };
  function clipPolygon(points) {
    const clipped = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if (a[2] >= near) clipped.push(a);
      if ((a[2] >= near) !== (b[2] >= near)) clipped.push(atNear(a, b));
    }
    return clipped;
  }

  window.createAimScene = (canvas) => {
    let ctx;
    try { ctx = canvas?.getContext('2d', { alpha: false }); }
    catch { return null; }
    if (!ctx) return null;

    const measure = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width <= 0 || height <= 0) return null;
      return { width, height, cx: width / 2, cy: height / 2, focal: Math.min(height * .95, width * 1.05) };
    };
    const screen = ([x, y, z], view) => [view.cx + view.focal * x / z, view.cy - view.focal * y / z];
    function polygon(points, view) {
      const clipped = clipPolygon(points);
      if (clipped.length < 3) return false;
      ctx.beginPath();
      ctx.moveTo(...screen(clipped[0], view));
      clipped.slice(1).forEach((p) => ctx.lineTo(...screen(p, view)));
      ctx.closePath();
      return true;
    }
    function line(a, b, camera, view) {
      let start = viewPoint(a, camera), end = viewPoint(b, camera);
      if (start[2] < near && end[2] < near) return;
      if (start[2] < near) start = atNear(start, end);
      else if (end[2] < near) end = atNear(start, end);
      ctx.moveTo(...screen(start, view));
      ctx.lineTo(...screen(end, view));
    }

    function drawRoom(camera, view) {
      const { width, height } = view;
      ctx.fillStyle = '#142019';
      ctx.fillRect(0, 0, width, height);
      const panels = faces.map((face) => ({ ...face, projected: face.points.map((p) => viewPoint(p, camera)) }));
      const depth = (panel) => panel.projected.reduce((total, p) => total + p[2], 0) / panel.projected.length;
      panels.sort((a, b) => depth(b) - depth(a));
      for (const panel of panels) {
        if (!polygon(panel.projected, view)) continue;
        const fill = ctx.createLinearGradient(0, 0, 0, height);
        fill.addColorStop(0, panel.colors[0]);
        fill.addColorStop(1, panel.colors[1]);
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (polygon(backPanel.map((p) => viewPoint(p, camera)), view)) {
        ctx.fillStyle = '#07161046';
        ctx.fill();
      }
      for (const { points, fill } of strips) {
        if (!polygon(points.map((p) => viewPoint(p, camera)), view)) continue;
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.lineWidth = .72;
      ctx.strokeStyle = '#cde8c329';
      ctx.beginPath();
      grid.forEach(([a, b]) => line(a, b, camera, view));
      ctx.stroke();
      for (const { points, fill } of ribs) {
        if (!polygon(points.map((p) => viewPoint(p, camera)), view)) continue;
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = '#c0e69c5a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      rails.forEach(([a, b]) => line(a, b, camera, view));
      rangeOutline.slice(1).forEach((b, i) => line(rangeOutline[i], b, camera, view));
      ctx.stroke();
      const shade = ctx.createRadialGradient(view.cx, view.cy, Math.min(width, height) * .13,
        view.cx, view.cy, Math.hypot(view.cx, view.cy));
      shade.addColorStop(0, '#0a130b00');
      shade.addColorStop(1, '#06100b70');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
    }

    function drawShadow({ x, y, z, radius }, camera, view) {
      const height = Math.max(0, y - radius);
      const size = radius * (1 + height * .14);
      const castX = x - light[0] * height * .60;
      const castZ = z - light[2] * height * .60;
      for (let layer = 5; layer >= 1; layer--) {
        const spread = size * (.52 + layer * .19);
        const points = Array.from({ length: 20 }, (_, i) => {
          const angle = i * tau / 20;
          return viewPoint([castX + Math.cos(angle) * spread, .023, castZ + Math.sin(angle) * spread * 1.12], camera);
        });
        if (polygon(points, view)) {
          ctx.fillStyle = `rgba(2, 8, 4, ${.21 / (1 + height * .32)})`;
          ctx.fill();
        }
      }
    }

    function drawSphere(center, radius, camera, view) {
      if (center[2] - radius <= near) return;
      // Project the sphere's tangent circle, not a fixed screen-space sprite.
      const length = Math.hypot(...center);
      const axis = center.map((v) => v / length);
      const horizontalLength = Math.hypot(axis[0], axis[2]);
      const right = [axis[2] / horizontalLength, 0, -axis[0] / horizontalLength];
      const up = [axis[1] * right[2], axis[2] * right[0] - axis[0] * right[2], -axis[1] * right[0]];
      const tangentRadius = radius * Math.sqrt(1 - (radius / length) ** 2);
      const tangentCenter = center.map((v) => v * (1 - (radius / length) ** 2));
      const outline = Array.from({ length: 42 }, (_, i) => {
        const angle = i * tau / 42;
        return screen(tangentCenter.map((v, k) => v + tangentRadius * (right[k] * Math.cos(angle) + up[k] * Math.sin(angle))), view);
      });
      const left = Math.min(...outline.map(([x]) => x)), rightEdge = Math.max(...outline.map(([x]) => x));
      const top = Math.min(...outline.map(([, y]) => y)), bottom = Math.max(...outline.map(([, y]) => y));
      if (rightEdge < 0 || left > view.width || bottom < 0 || top > view.height) return;
      const x = (left + rightEdge) / 2, y = (top + bottom) / 2;
      const r = Math.max(rightEdge - left, bottom - top) / 2;
      ctx.beginPath();
      ctx.moveTo(...outline[0]);
      outline.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.closePath();
      const lx = dot(light, camera.right), ly = -dot(light, camera.up);
      const surface = ctx.createRadialGradient(x + lx * r * .57, y + ly * r * .57, 0, x - lx * r * .09, y - ly * r * .09, r * 1.12);
      surface.addColorStop(0, '#e1ff85');
      surface.addColorStop(.25, '#bfe953');
      surface.addColorStop(.53, '#89b932');
      surface.addColorStop(.79, '#497a20');
      surface.addColorStop(1, '#1f4216');
      ctx.fillStyle = surface;
      ctx.fill();
      ctx.save();
      ctx.clip();
      const glintX = x + lx * r * .66, glintY = y + ly * r * .66;
      const glint = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, r * .33);
      glint.addColorStop(0, '#fbffe9b8');
      glint.addColorStop(.31, '#f5ffc461');
      glint.addColorStop(1, '#f4ffc800');
      ctx.fillStyle = glint;
      ctx.fillRect(left, top, rightEdge - left, bottom - top);
      const bounceX = x - lx * r * .82, bounceY = y - ly * r * .82;
      const bounce = ctx.createRadialGradient(bounceX, bounceY, 0, bounceX, bounceY, r * .77);
      bounce.addColorStop(0, '#bcf48531');
      bounce.addColorStop(1, '#bcf48500');
      ctx.fillStyle = bounce;
      ctx.fillRect(left, top, rightEdge - left, bottom - top);
      ctx.restore();
      ctx.lineWidth = .7;
      const rim = ctx.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
      rim.addColorStop(0, '#d6fa9d92');
      rim.addColorStop(.64, '#a0c67242');
      rim.addColorStop(1, '#233d1d77');
      ctx.strokeStyle = rim;
      ctx.stroke();
    }

    function draw({ yaw = 0, pitch = 0, targets = [] } = {}) {
      const view = measure();
      if (!view) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(view.width * dpr));
      const pixelHeight = Math.max(1, Math.round(view.height * dpr));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      ctx.setTransform(pixelWidth / view.width, 0, 0, pixelHeight / view.height, 0, 0);
      const camera = basis(yaw, pitch);
      drawRoom(camera, view);
      const visible = targets.filter(validTarget).map((target) => ({ target, center: viewPoint([target.x, target.y, target.z], camera) }));
      visible.forEach(({ target }) => drawShadow(target, camera, view));
      visible.sort((a, b) => b.center[2] - a.center[2]);
      visible.forEach(({ target, center }) => drawSphere(center, target.radius, camera, view));
    }

    function project(target, yaw = 0, pitch = 0) {
      const view = measure();
      if (!view || !validTarget(target)) return null;
      const { x: worldX, y: worldY, z, radius } = target;
      const p = viewPoint([worldX, worldY, z], basis(yaw, pitch));
      if (p[2] - radius <= near) return null;
      const [x, y] = screen(p, view);
      return { u: x / view.width, v: y / view.height, depth: p[2], radius: view.focal * radius / Math.sqrt(p[2] ** 2 - radius ** 2) };
    }

    function pick({ yaw = 0, pitch = 0, targets = [] } = {}, u, v) {
      const view = measure();
      if (!view || !Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1) return null;
      const camera = basis(yaw, pitch);
      const sx = (u * view.width - view.cx) / view.focal;
      const sy = (view.cy - v * view.height) / view.focal;
      const length = Math.hypot(sx, sy, 1);
      const direction = camera.forward.map((component, i) => (component + sx * camera.right[i] + sy * camera.up[i]) / length);
      let selected = null;
      let closest = Infinity;
      for (const target of targets) {
        if (!validTarget(target)) continue;
        const { x, y, z, radius } = target;
        const center = [x, y - eyeY, z];
        const along = dot(center, direction);
        const discriminant = along ** 2 - dot(center, center) + radius ** 2;
        if (discriminant < 0) continue;
        const distance = along - Math.sqrt(discriminant);
        if (distance >= near && distance < closest) {
          closest = distance;
          selected = target;
        }
      }
      return selected;
    }

    return { draw, pick, project, sample, preview };
  };
})();
