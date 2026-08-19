// LeafletMap: Interactive Safety Map, Polylines, Exact Pins, Heatmap Layer & Click-Picker
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reportStore } from './reportStore.js';
import { VERIFIED_FACILITIES } from './facilityService.js';

export class LeafletMapRenderer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.map = null;
    this.routesLayer = null;
    this.reportsLayer = null;
    this.facilitiesLayer = null;
    this.policePlacesLayer = null;
    this.hospitalPlacesLayer = null;
    this.publicPlacesLayer = null;
    this.heatmapLayer = null;
    this.previewLayer = null;
    this.previewMarker = null;
    this.previewAnimationId = null;
    this.userLocationMarker = null;

    this.showHeatmap = true;
    this.showFacilities = true;
    this.pickingMode = 'none'; // 'none' | 'source' | 'destination' | 'report'
    this.onMapClickCallback = options.onMapClick || null;
    this.onSelectRouteCallback = options.onSelectRoute || null;
    this.onReportActionCallback = options.onReportAction || null;
    this.onMapMoveEndCallback = options.onMapMoveEnd || null;
    this.onPreviewProgressCallback = options.onPreviewProgress || null;

    this.initMap();
  }

  initMap() {
    if (!this.container) return;

    this.map = L.map(this.container, {
      center: [17.4350, 78.4100],
      zoom: 13,
      zoomControl: true,
      preferCanvas: true
    });

    // Dark sleek map tiles matching SafeRoute theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    this.routesLayer = L.layerGroup().addTo(this.map);
    this.reportsLayer = L.layerGroup().addTo(this.map);
    this.facilitiesLayer = L.layerGroup().addTo(this.map);
    this.policePlacesLayer = L.layerGroup().addTo(this.map);
    this.hospitalPlacesLayer = L.layerGroup().addTo(this.map);
    this.publicPlacesLayer = L.layerGroup().addTo(this.map);
    this.heatmapLayer = L.layerGroup().addTo(this.map);
    this.previewLayer = L.layerGroup().addTo(this.map);

    // Map click handler for interactive picking
    this.map.on('click', (e) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      if (this.onMapClickCallback) {
        this.onMapClickCallback(lat, lng, this.pickingMode);
      }
    });

    // Map moveend handler for dynamic pan/drag discovery across any location in India
    this.map.on('moveend', () => {
      if (!this.map) return;
      const center = this.map.getCenter();
      if (this.onMapMoveEndCallback && center) {
        this.onMapMoveEndCallback(Number(center.lat.toFixed(6)), Number(center.lng.toFixed(6)));
      }
    });

    setTimeout(() => this.map.invalidateSize(), 100);
  }

  setPickingMode(mode) {
    this.pickingMode = mode;
    if (this.container) {
      if (mode !== 'none') {
        this.container.style.cursor = 'crosshair';
      } else {
        this.container.style.cursor = '';
      }
    }
  }

  toggleHeatmap(enabled) {
    this.showHeatmap = enabled;
    if (enabled) {
      this.heatmapLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.heatmapLayer);
    }
  }

  toggleFacilities(enabled) {
    this.showFacilities = enabled;
    if (enabled) {
      this.facilitiesLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.facilitiesLayer);
    }
  }

  render(engine) {
    if (!this.map) return;

    this.routesLayer.clearLayers();
    this.reportsLayer.clearLayers();
    this.facilitiesLayer.clearLayers();
    this.heatmapLayer.clearLayers();

    const allPoints = [];

    // 1. Draw Routes
    const routes = engine.routes || [];
    const routeLines = [];

    routes.forEach((route, idx) => {
      const isSelected = idx === engine.selectedRouteIndex;
      const latlngs = route.path.map(p => [p.lat, p.lng]);
      allPoints.push(...latlngs);

      const strokeColor = route.color || (route.type === 'SAFEST' ? '#16a34a' : route.type === 'BALANCED' ? '#2563eb' : '#dc2626');

      const polyline = L.polyline(latlngs, {
        color: strokeColor,
        weight: isSelected ? 8 : 4,
        opacity: isSelected ? 1.0 : 0.55,
        dashArray: isSelected ? undefined : '6,8',
        lineJoin: 'round',
        zIndexOffset: isSelected ? 1000 : 100
      });

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '180px';
      popupContent.style.fontFamily = 'sans-serif';
      popupContent.innerHTML = `
        <div style="font-weight:bold;color:${strokeColor};font-size:13px;margin-bottom:2px;">
          ${route.badge || route.label}
        </div>
        <div style="font-size:12px;color:#1e293b;">
          ⏱ <b>${route.durationMin} min</b> &nbsp;|&nbsp; 📏 <b>${route.distanceKm} km</b>
        </div>
        <div style="font-size:12px;font-weight:bold;color:${strokeColor};margin-top:4px;">
          🛡️ Safety Score: ${route.safetyScore}/100 (${route.scoreLabel})
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">
          💡 Lighting: <b>${route.lightingPercent}%</b> | 🚓 Police: <b>${route.policeCount} nearby</b>
        </div>
      `;

      polyline.bindPopup(popupContent);

      polyline.on('click', () => {
        if (this.onSelectRouteCallback) {
          this.onSelectRouteCallback(idx);
        }
      });

      polyline.addTo(this.routesLayer);
      routeLines.push(polyline);
    });

    // 2. Draw Start & End Markers
    if (engine.origin) {
      allPoints.push([engine.origin.lat, engine.origin.lng]);
      const startIcon = L.divIcon({
        className: 'saferoute-pin',
        html: `<div style="background:#16a34a;color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">🟢 START: ${engine.origin.name}</div>`,
        iconSize: [120, 24],
        iconAnchor: [60, 24]
      });
      L.marker([engine.origin.lat, engine.origin.lng], { icon: startIcon })
        .bindPopup(`<b>Start Location:</b><br>${engine.origin.name}<br>(${engine.origin.lat.toFixed(4)}, ${engine.origin.lng.toFixed(4)})`)
        .addTo(this.routesLayer);
    }

    if (engine.destination) {
      allPoints.push([engine.destination.lat, engine.destination.lng]);
      const endIcon = L.divIcon({
        className: 'saferoute-pin',
        html: `<div style="background:#ef4444;color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">🔴 DESTINATION: ${engine.destination.name}</div>`,
        iconSize: [140, 24],
        iconAnchor: [70, 24]
      });
      L.marker([engine.destination.lat, engine.destination.lng], { icon: endIcon })
        .bindPopup(`<b>Destination:</b><br>${engine.destination.name}<br>(${engine.destination.lat.toFixed(4)}, ${engine.destination.lng.toFixed(4)})`)
        .addTo(this.routesLayer);
    }

    // 3. Draw Community Unsafe Reports & Heatmap Circles
    const reports = reportStore.getAllReports();

    reports.forEach((rep) => {
      const isCritical = rep.severity === 'Critical' || rep.severity === 'High';
      const color = isCritical ? '#ef4444' : '#f59e0b';

      // Heatmap concentration circle
      const weight = reportStore.calculateReportWeight(rep);
      const heatCircle = L.circle([rep.latitude, rep.longitude], {
        radius: Math.round(500 * weight),
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 1
      });
      heatCircle.addTo(this.heatmapLayer);

      // Report marker pin
      const repIcon = L.divIcon({
        className: 'saferoute-report-pin',
        html: `<div style="background:#fff;color:${color};border:2px solid ${color};border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;font-weight:bold;">⚠️</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const popupDiv = document.createElement('div');
      popupDiv.style.minWidth = '200px';
      popupDiv.style.fontFamily = 'sans-serif';
      popupDiv.innerHTML = `
        <div style="font-weight:bold;color:${color};font-size:13px;">⚠️ ${rep.category}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;"><b>Location:</b> ${rep.locationName}</div>
        <div style="font-size:11px;color:#1e293b;margin-top:4px;line-height:1.3;">${rep.description}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
          Severity: <b style="color:${color};">${rep.severity}</b> | Reported: ${new Date(rep.reportedAt).toLocaleDateString()}
        </div>
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;gap:6px;">
          <button id="btnConfirm_${rep.id}" style="background:#16a34a;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:bold;cursor:pointer;">
            👍 Confirm (${rep.confirmations})
          </button>
          <button id="btnDisagree_${rep.id}" style="background:#64748b;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:bold;cursor:pointer;">
            👎 Outdated (${rep.disagreements})
          </button>
        </div>
      `;

      const marker = L.marker([rep.latitude, rep.longitude], { icon: repIcon })
        .bindPopup(popupDiv)
        .addTo(this.reportsLayer);

      marker.on('popupopen', () => {
        const btnC = document.getElementById(`btnConfirm_${rep.id}`);
        const btnD = document.getElementById(`btnDisagree_${rep.id}`);
        if (btnC) {
          btnC.onclick = () => {
            reportStore.confirmReport(rep.id);
            if (this.onReportActionCallback) this.onReportActionCallback();
            marker.closePopup();
          };
        }
        if (btnD) {
          btnD.onclick = () => {
            reportStore.disagreeReport(rep.id);
            if (this.onReportActionCallback) this.onReportActionCallback();
            marker.closePopup();
          };
        }
      });
    });

    // 4. Draw Verified Emergency Facilities (Police, Hospitals, Public Hubs)
    if (this.showFacilities) {
      VERIFIED_FACILITIES.forEach((fac) => {
        let glyph = '🛡️';
        let color = '#2563eb';
        if (fac.category === 'Police') {
          glyph = '👮';
          color = '#1d4ed8';
        } else if (fac.category === 'Hospital') {
          glyph = '🏥';
          color = '#15803d';
        } else {
          glyph = '🏪';
          color = '#d97706';
        }

        const facIcon = L.divIcon({
          className: 'saferoute-fac-pin',
          html: `<div style="background:#fff;border:1.5px solid ${color};border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,0.25);">${glyph}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        L.marker([fac.lat, fac.lng], { icon: facIcon })
          .bindPopup(`<b>${fac.name}</b><br><span style="color:#64748b;font-size:11px;">${fac.category} · ${fac.city}</span>${fac.phone ? `<br>📞 <b>${fac.phone}</b>` : ''}`)
          .addTo(this.facilitiesLayer);
      });
    }

    // Auto-fit bounds
    if (allPoints.length > 1) {
      try {
        const bounds = L.latLngBounds(allPoints);
        this.map.fitBounds(bounds.pad(0.16), { animate: false });
      } catch (e) {
        console.warn("fitBounds warning:", e);
      }
    }
  }

  updateUserLocation(lat, lng) {
    if (!this.map) return;
    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng([lat, lng]);
    } else {
      const uIcon = L.divIcon({
        className: 'saferoute-user-dot',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      this.userLocationMarker = L.marker([lat, lng], { icon: uIcon })
        .bindPopup('<b>Your Current GPS Position</b>')
        .addTo(this.map);
    }
  }

  renderNearbySafetyPlaces(placesByCategory, activeCategories = { police: true, hospital: true, public: true }, userLocation = null) {
    if (!this.map) return;

    if (this.policePlacesLayer) this.policePlacesLayer.clearLayers();
    if (this.hospitalPlacesLayer) this.hospitalPlacesLayer.clearLayers();
    if (this.publicPlacesLayer) this.publicPlacesLayer.clearLayers();

    if (!placesByCategory) return;

    // 1. Police Stations Layer
    if (activeCategories.police && this.policePlacesLayer) {
      (placesByCategory.police || []).forEach(place => {
        const icon = L.divIcon({
          className: 'nearby-place-pin police-pin',
          html: `<div class="nearby-marker-bubble police" title="${place.name}">
            <span class="marker-emoji">🚓</span>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15]
        });

        const popupContent = `
          <div class="safety-place-popup police">
            <div class="place-popup-header">
              <span class="place-type-badge police">🚓 Police Station</span>
              <span class="place-dist-tag">${place.distanceText || 'Nearby'}</span>
            </div>
            <h4 class="place-name">${place.name}</h4>
            <p class="place-address">${place.address}</p>
            <div class="place-popup-actions">
              <a href="${place.googleMapsUri}" target="_blank" rel="noopener noreferrer" class="btn-gmaps-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>View on Google Maps</span>
              </a>
            </div>
          </div>
        `;

        L.marker([place.lat, place.lng], { icon })
          .bindPopup(popupContent, { maxWidth: 280, className: 'clean-safety-popup' })
          .addTo(this.policePlacesLayer);
      });
    }

    // 2. Hospitals Layer
    if (activeCategories.hospital && this.hospitalPlacesLayer) {
      (placesByCategory.hospital || []).forEach(place => {
        const icon = L.divIcon({
          className: 'nearby-place-pin hospital-pin',
          html: `<div class="nearby-marker-bubble hospital" title="${place.name}">
            <span class="marker-emoji">🏥</span>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15]
        });

        const popupContent = `
          <div class="safety-place-popup hospital">
            <div class="place-popup-header">
              <span class="place-type-badge hospital">🏥 Hospital / Medical</span>
              <span class="place-dist-tag">${place.distanceText || 'Nearby'}</span>
            </div>
            <h4 class="place-name">${place.name}</h4>
            <p class="place-address">${place.address}</p>
            <div class="place-popup-actions">
              <a href="${place.googleMapsUri}" target="_blank" rel="noopener noreferrer" class="btn-gmaps-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>View on Google Maps</span>
              </a>
            </div>
          </div>
        `;

        L.marker([place.lat, place.lng], { icon })
          .bindPopup(popupContent, { maxWidth: 280, className: 'clean-safety-popup' })
          .addTo(this.hospitalPlacesLayer);
      });
    }

    // 3. Public Places Layer
    if (activeCategories.public && this.publicPlacesLayer) {
      (placesByCategory.public || []).forEach(place => {
        const icon = L.divIcon({
          className: 'nearby-place-pin public-pin',
          html: `<div class="nearby-marker-bubble public" title="${place.name}">
            <span class="marker-emoji">🏫</span>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15]
        });

        const popupContent = `
          <div class="safety-place-popup public">
            <div class="place-popup-header">
              <span class="place-type-badge public">🏫 Public / Safety Hub</span>
              <span class="place-dist-tag">${place.distanceText || 'Nearby'}</span>
            </div>
            <h4 class="place-name">${place.name}</h4>
            <p class="place-address">${place.address}</p>
            <div class="place-popup-actions">
              <a href="${place.googleMapsUri}" target="_blank" rel="noopener noreferrer" class="btn-gmaps-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>View on Google Maps</span>
              </a>
            </div>
          </div>
        `;

        L.marker([place.lat, place.lng], { icon })
          .bindPopup(popupContent, { maxWidth: 280, className: 'clean-safety-popup' })
          .addTo(this.publicPlacesLayer);
      });
    }
  }

  /**
   * Starts smooth animated route preview following the exact road geometry of the selected route
   */
  startRoutePreview(routePath, travelMode = 'car') {
    this.stopRoutePreview();
    if (!this.map || !routePath || routePath.length < 2) return;

    const smoothPoints = generateSmoothRoutePoints(routePath, 160);
    if (smoothPoints.length < 2) return;

    let currentIndex = 0;
    const totalFrames = smoothPoints.length;
    const animationDurationMs = 6800; // ~6.8 seconds for smooth comprehension
    const intervalPerFrame = animationDurationMs / totalFrames;

    const modeEmoji = travelMode === 'walking' ? '🚶' : travelMode === 'bike' ? '🏍️' : travelMode === 'auto' ? '🛺' : travelMode === 'bus' ? '🚌' : '🚗';

    const createVehicleIcon = (bearing) => {
      return L.divIcon({
        className: 'route-preview-vehicle-pin',
        html: `
          <div class="vehicle-preview-container" style="transform: rotate(${bearing}deg);">
            <div class="vehicle-preview-halo"></div>
            <div class="vehicle-preview-arrow">▲</div>
            <div class="vehicle-preview-badge">${modeEmoji}</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
    };

    const startPt = smoothPoints[0];
    this.previewMarker = L.marker([startPt.lat, startPt.lng], {
      icon: createVehicleIcon(startPt.bearing),
      zIndexOffset: 2000
    }).addTo(this.previewLayer);

    if (this.onPreviewProgressCallback) {
      this.onPreviewProgressCallback({
        progressPercent: 0,
        isComplete: false,
        travelMode
      });
    }

    let lastTime = performance.now();
    let accumulatedTime = 0;

    const animateStep = (now) => {
      const delta = now - lastTime;
      lastTime = now;
      accumulatedTime += delta;

      while (accumulatedTime >= intervalPerFrame && currentIndex < totalFrames) {
        currentIndex++;
        accumulatedTime -= intervalPerFrame;
      }

      if (currentIndex >= totalFrames) {
        const lastPt = smoothPoints[totalFrames - 1];
        if (this.previewMarker) {
          this.previewMarker.setLatLng([lastPt.lat, lastPt.lng]);
          this.previewMarker.setIcon(createVehicleIcon(lastPt.bearing));
        }
        if (this.onPreviewProgressCallback) {
          this.onPreviewProgressCallback({
            progressPercent: 100,
            isComplete: true,
            travelMode
          });
        }
        this.previewAnimationId = null;
        return;
      }

      const pt = smoothPoints[currentIndex];
      if (this.previewMarker) {
        this.previewMarker.setLatLng([pt.lat, pt.lng]);
        this.previewMarker.setIcon(createVehicleIcon(pt.bearing));
      }

      if (this.onPreviewProgressCallback) {
        this.onPreviewProgressCallback({
          progressPercent: Math.round(pt.progress * 100),
          isComplete: false,
          travelMode
        });
      }

      this.previewAnimationId = requestAnimationFrame(animateStep);
    };

    this.previewAnimationId = requestAnimationFrame((now) => {
      lastTime = now;
      animateStep(now);
    });
  }

  /**
   * Stops any running route preview animation and removes preview markers
   */
  stopRoutePreview() {
    if (this.previewAnimationId) {
      cancelAnimationFrame(this.previewAnimationId);
      this.previewAnimationId = null;
    }
    if (this.previewLayer) {
      this.previewLayer.clearLayers();
    }
    this.previewMarker = null;
  }
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const y = Math.sin((lon2 - lon1) * toRad) * Math.cos(lat2 * toRad);
  const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
            Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lon2 - lon1) * toRad);
  const brng = Math.atan2(y, x) * toDeg;
  return (brng + 360) % 360;
}

function calculateSubDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateSmoothRoutePoints(path, totalSamples = 160) {
  if (!path || path.length < 2) return [];
  
  const distances = [0];
  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = calculateSubDistanceKm(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
    totalDist += d;
    distances.push(totalDist);
  }

  if (totalDist === 0) return [{ lat: path[0].lat, lng: path[0].lng, bearing: 0, progress: 1 }];

  const samples = [];
  const step = totalDist / (totalSamples - 1);

  let currentSegmentIdx = 0;
  for (let i = 0; i < totalSamples; i++) {
    const targetDist = i * step;

    while (currentSegmentIdx < distances.length - 2 && distances[currentSegmentIdx + 1] < targetDist) {
      currentSegmentIdx++;
    }

    const segStartDist = distances[currentSegmentIdx];
    const segEndDist = distances[currentSegmentIdx + 1];
    const segLen = segEndDist - segStartDist;

    const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;
    const clampedT = Math.max(0, Math.min(1, t));

    const p1 = path[currentSegmentIdx];
    const p2 = path[currentSegmentIdx + 1];

    const lat = p1.lat + (p2.lat - p1.lat) * clampedT;
    const lng = p1.lng + (p2.lng - p1.lng) * clampedT;
    const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);

    samples.push({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      bearing: Math.round(bearing),
      progress: Math.min(1.0, i / (totalSamples - 1))
    });
  }

  return samples;
}
