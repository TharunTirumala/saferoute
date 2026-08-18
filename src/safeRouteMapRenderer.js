// Interactive Tactical Map Renderer for SafeRoute (Delhi NCR & Haversine Polylines)

export class SafeRouteMapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Bounds for Delhi NCR
    this.bounds = {
      minLat: 28.45,
      maxLat: 28.78,
      minLng: 77.00,
      maxLng: 77.52
    };

    this.animTime = 0;
  }

  // GPS (Lat, Lng) to Canvas (X, Y) projection
  project(lat, lng) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pad = 40;

    const x = pad + ((lng - this.bounds.minLng) / (this.bounds.maxLng - this.bounds.minLng)) * (w - pad * 2);
    // Lat increases upwards, Y increases downwards
    const y = h - pad - ((lat - this.bounds.minLat) / (this.bounds.maxLat - this.bounds.minLat)) * (h - pad * 2);

    return { x, y };
  }

  // Inverse Canvas (X, Y) to GPS (Lat, Lng)
  unproject(x, y) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pad = 40;

    const lng = this.bounds.minLng + ((x - pad) / (w - pad * 2)) * (this.bounds.maxLng - this.bounds.minLng);
    const lat = this.bounds.minLat + ((h - pad - y) / (h - pad * 2)) * (this.bounds.maxLat - this.bounds.minLat);

    return { lat, lng };
  }

  render(engine, hoveredSpot = null) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.animTime += 0.03;
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Map Background & Dark Grid
    this.drawMapBase(ctx, w, h);

    // 2. Draw Yamuna River & Major Arterials
    this.drawGeographyAndRoads(ctx);

    // 3. Draw Crime Hotspots & Danger Radii
    this.drawCrimeHotspots(ctx, engine, hoveredSpot);

    // 4. Draw Alternative Route Polylines
    this.drawRoutes(ctx, engine);

    // 5. Draw Origin & Destination Pins
    this.drawEndpoints(ctx, engine);

    // 6. Draw Map Overlay HUD
    this.drawMapHud(ctx, w, h);
  }

  drawMapBase(ctx, w, h) {
    // Dark tactical map gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(1, '#0e1526');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Grid coordinates
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawGeographyAndRoads(ctx) {
    // Yamuna River curve
    const riverPoints = [
      { lat: 28.76, lng: 77.23 },
      { lat: 28.71, lng: 77.24 },
      { lat: 28.66, lng: 77.26 },
      { lat: 28.61, lng: 77.27 },
      { lat: 28.53, lng: 77.31 },
      { lat: 28.46, lng: 77.35 }
    ];

    ctx.save();
    ctx.beginPath();
    const p0 = this.project(riverPoints[0].lat, riverPoints[0].lng);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < riverPoints.length; i++) {
      const pt = this.project(riverPoints[i].lat, riverPoints[i].lng);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = 'rgba(14, 116, 144, 0.35)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // River label
    const rMid = this.project(28.64, 77.265);
    ctx.font = 'italic 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.fillText('~ YAMUNA RIVER ~', rMid.x + 8, rMid.y);
    ctx.restore();

    // Inner & Outer Ring Road Schematics
    const cp = this.project(28.6315, 77.2167); // Connaught Place
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 35, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 85, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillText('CONNAUGHT PLACE (CP)', cp.x - 55, cp.y - 4);
    ctx.restore();
  }

  drawCrimeHotspots(ctx, engine, hoveredSpot) {
    for (const spot of engine.hotspots) {
      const pt = this.project(spot.lat, spot.lng);
      const isHovered = hoveredSpot && hoveredSpot.name === spot.name;

      // Color mapping
      let color = '#f59e0b';
      if (spot.danger === 'Critical') color = '#ef4444';
      if (spot.danger === 'Low') color = '#38bdf8';

      // 1. Draw Danger Radius Zone Circle
      ctx.save();
      const radiusPx = 36;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = spot.danger === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.08)';
      ctx.fill();

      // Pulsing perimeter ring
      const pulseRadius = radiusPx + Math.sin(this.animTime * 2 + spot.lat * 10) * 4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = spot.danger === 'Critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.2)';
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.restore();

      // 2. Hotspot Map Pin Marker
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isHovered ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pin Label
      ctx.font = isHovered ? 'bold 11px "Inter", sans-serif' : '10px "Inter", sans-serif';
      ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(248, 250, 252, 0.75)';
      ctx.fillText(spot.name, pt.x + 10, pt.y + 3);

      if (spot.count > 1) {
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = color;
        ctx.fillText(`[${spot.count} crimes]`, pt.x + 10, pt.y + 14);
      }
      ctx.restore();
    }
  }

  drawRoutes(ctx, engine) {
    engine.routes.forEach((route, idx) => {
      const isSelected = idx === engine.selectedRouteIndex;
      const pts = route.points.map((p) => this.project(p.lat, p.lng));
      if (pts.length < 2) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }

      // Polyline styling
      ctx.strokeStyle = route.color;
      ctx.lineWidth = isSelected ? 5 : 2.5;
      ctx.globalAlpha = isSelected ? 1 : 0.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Animated glowing traffic dots on selected route
      if (isSelected) {
        ctx.globalAlpha = 1;
        const totalPts = pts.length;
        const dotOffset = (this.animTime * 15) % totalPts;
        const currentPtIndex = Math.floor(dotOffset);
        const nextPtIndex = (currentPtIndex + 1) % totalPts;
        const subFrac = dotOffset - currentPtIndex;

        const p1 = pts[currentPtIndex];
        const p2 = pts[nextPtIndex];
        const dotX = p1.x + (p2.x - p1.x) * subFrac;
        const dotY = p1.y + (p2.y - p1.y) * subFrac;

        // Glowing dot
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = route.color;
        ctx.shadowBlur = 12;
        ctx.fill();
      }

      ctx.restore();
    });
  }

  drawEndpoints(ctx, engine) {
    const oPt = this.project(engine.origin.lat, engine.origin.lng);
    const dPt = this.project(engine.destination.lat, engine.destination.lng);

    // Origin (A) - Green
    ctx.save();
    ctx.beginPath();
    ctx.arc(oPt.x, oPt.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', oPt.x, oPt.y);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`START: ${engine.origin.name}`, oPt.x + 14, oPt.y);
    ctx.restore();

    // Destination (B) - Purple / Red
    ctx.save();
    ctx.beginPath();
    ctx.arc(dPt.x, dPt.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', dPt.x, dPt.y);

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`END: ${engine.destination.name}`, dPt.x + 14, dPt.y);
    ctx.restore();
  }

  drawMapHud(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(16, 16, 260, 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(16, 16, 260, 32);

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📍 DELHI NCR // HAVERSINE SAFETY GRID', 26, 32);
    ctx.restore();
  }
}
