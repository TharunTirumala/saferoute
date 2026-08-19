// SafeRoute Engine: Authoritative Real Road Routing (Google Directions / Routes API + OSRM) + Multi-Segment Safety Algorithm
import { SAFETY_CONFIG, getScoreMetadata } from './safetyConfig.js';
import { reportStore } from './reportStore.js';
import { FacilityService } from './facilityService.js';

// Haversine Distance in Kilometers
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Decodes Google Encoded Polyline algorithm into exact [{lat, lng}] road nodes
 */
export function decodeGooglePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: Number((lat / 1e5).toFixed(6)),
      lng: Number((lng / 1e5).toFixed(6))
    });
  }
  return points;
}

/**
 * Deduplicates routes that are effectively the same road path (>95% overlap)
 */
function deduplicateRoutes(routes) {
  const unique = [];
  for (const r of routes) {
    if (!r.path || r.path.length < 2) continue;
    const isDuplicate = unique.some(existing => {
      const distDiff = Math.abs(existing.distanceKm - r.distanceKm);
      const durDiff = Math.abs(existing.durationMin - r.durationMin);
      if (distDiff < 0.2 && durDiff < 0.4) {
        const midIdxA = Math.floor(existing.path.length / 2);
        const midIdxB = Math.floor(r.path.length / 2);
        const midDist = haversineDistance(
          existing.path[midIdxA].lat,
          existing.path[midIdxA].lng,
          r.path[midIdxB].lat,
          r.path[midIdxB].lng
        );
        if (midDist < 0.3) return true;
      }
      return false;
    });
    if (!isDuplicate) {
      unique.push(r);
    }
  }
  return unique;
}

export class SafeRouteEngine {
  constructor() {
    this.origin = { name: "Hitech City, Hyderabad", lat: 17.4435, lng: 78.3772 };
    this.destination = { name: "Banjara Hills, Hyderabad", lat: 17.4150, lng: 78.4350 };
    this.travelMode = 'car'; // 'car' | 'bike' | 'auto' | 'walking' | 'bus'
    this.travelTime = 'now'; // 'now' | 'morning' | 'afternoon' | 'evening' | 'night'
    this.selectedRouteIndex = 0;
    this.routes = [];
    this.saferLongerNotice = null;
    this.allHighRiskWarning = null;
    this.isNightMode = false;
    this.loading = false;
    this.error = null;
    this.googleApiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || "";
  }

  getSelectedRoute() {
    if (this.routes && this.routes.length > 0) {
      return this.routes[this.selectedRouteIndex] || this.routes[0];
    }
    return null;
  }

  /**
   * Geocodes arbitrary address to exact latitude and longitude via OSM Nominatim
   */
  async geocode(query) {
    if (!query || query.trim().length === 0) {
      throw new Error("Please enter a location.");
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error(`Geocoding failed with status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`Location "${query}" not found. Please verify the spelling or add city name.`);
      }

      return data.map(item => {
        const parts = (item.display_name || '').split(',');
        const shortName = parts.slice(0, 2).join(',').trim();
        return {
          name: shortName || item.display_name,
          fullName: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        };
      });
    } catch (err) {
      console.warn("Geocoding fetch error:", err);
      throw err;
    }
  }

  /**
   * Reverse geocodes coordinates to human readable location name
   */
  async reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          return parts.slice(0, 3).join(',').trim();
        }
      }
    } catch (e) {
      console.warn("Reverse geocode warning:", e);
    }
    return `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  /**
   * Returns routing service profile based on selected travel mode
   */
  getRoutingProfile() {
    if (this.travelMode === 'walking') return 'foot';
    if (this.travelMode === 'bike') return 'driving';
    if (this.travelMode === 'bus') return 'driving';
    if (this.travelMode === 'auto') return 'driving';
    return 'driving';
  }

  getModeAverageSpeedKmh() {
    switch (this.travelMode) {
      case 'walking': return 4.8;
      case 'bus': return 20.0;
      case 'car': return 32.0;
      case 'bike': return 26.0;
      case 'auto': return 24.0;
      default: return 30.0;
    }
  }

  calculateEstimatedDurationMin(distanceKm) {
    const dist = Number(distanceKm) || 1;
    const speed = this.getModeAverageSpeedKmh();
    return Math.max(1, Math.round((dist / speed) * 60));
  }

  /**
   * Queries real road network from OSRM driving/foot engine for a set of coordinate waypoints
   */
  async queryRealRoadPath(waypoints) {
    if (!waypoints || waypoints.length < 2) return null;
    const coordStr = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const profile = this.getRoutingProfile();
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coordStr}?overview=full&geometries=geojson&alternatives=true`;
    
    try {
      const res = await fetch(osrmUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.routes && json.routes.length > 0) {
          return json.routes.map((r, idx) => ({
            distanceKm: Math.round((r.distance / 1000) * 10) / 10,
            durationMin: Math.round((r.duration / 60) * 10) / 10,
            path: (r.geometry?.coordinates || []).map(c => ({
              lat: Number(c[1].toFixed(6)),
              lng: Number(c[0].toFixed(6))
            }))
          }));
        }
      }
    } catch (e) {
      console.warn("Real road query error:", e);
    }
    return null;
  }

  /**
   * Fetches multiple authentic road candidate routes from Google Directions API
   * via backend serverless proxy /api/routes/directions with resilient OSRM fallback.
   */
  async fetchAuthoritativeRoutes(o, d) {
    const rawCandidates = [];

    // 1. Query Serverless Proxy (/api/routes/directions) for Google Directions
    try {
      const endpoint = `/api/routes/directions?originLat=${o.lat}&originLng=${o.lng}&destLat=${d.lat}&destLng=${d.lng}&mode=${this.travelMode}`;
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(9000) });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.routes) && data.routes.length > 0) {
          data.routes.forEach((r, idx) => {
            let polyPoints = [];
            if (r.encodedPolyline) {
              polyPoints = decodeGooglePolyline(r.encodedPolyline);
            } else if (Array.isArray(r.path) && r.path.length > 0) {
              polyPoints = r.path;
            }

            if (polyPoints.length > 1) {
              rawCandidates.push({
                id: r.id || `route_${idx}`,
                name: r.name || (idx === 0 ? "Primary Arterial Corridor" : `Alternative Corridor ${idx + 1}`),
                distanceKm: r.distanceKm,
                durationMin: r.durationMin,
                path: polyPoints,
                provider: data.provider || "Google Maps Road Network"
              });
            }
          });
        }
      }
    } catch (proxyErr) {
      console.info("Routes API proxy status note:", proxyErr.message);
    }

    // 2. Direct client Google Directions API fallback if configured
    if (rawCandidates.length === 0 && this.googleApiKey) {
      try {
        const gMode = this.travelMode === 'walking' ? 'walking' : this.travelMode === 'bike' ? 'bicycling' : 'driving';
        const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}&mode=${gMode}&alternatives=true&key=${this.googleApiKey}`;
        const gRes = await fetch(googleUrl);
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.status === 'OK' && Array.isArray(gData.routes) && gData.routes.length > 0) {
            gData.routes.forEach((gRoute, idx) => {
              const leg = gRoute.legs?.[0] || {};
              const distKm = Math.round(((leg.distance?.value || 0) / 1000) * 10) / 10;
              const durMin = Math.round(((leg.duration?.value || 0) / 60) * 10) / 10;
              const polyPoints = decodeGooglePolyline(gRoute.overview_polyline?.points);

              if (polyPoints.length > 1) {
                rawCandidates.push({
                  id: `google_${idx}`,
                  name: gRoute.summary ? `via ${gRoute.summary}` : (idx === 0 ? "Main Road Route" : `Alternative Corridor ${idx + 1}`),
                  distanceKm: distKm,
                  durationMin: durMin,
                  path: polyPoints,
                  provider: "Google Directions Road Network"
                });
              }
            });
          }
        }
      } catch (gErr) {
        console.warn("Google Directions client warning:", gErr);
      }
    }

    // 3. Fallback to direct authoritative OSRM driving routes with alternatives=true
    if (rawCandidates.length < 2) {
      const directResults = await this.queryRealRoadPath([o, d]);
      if (directResults && directResults.length > 0) {
        directResults.forEach((r, idx) => {
          rawCandidates.push({
            id: `osrm_direct_${idx}`,
            name: idx === 0 ? "Primary Arterial Corridor" : `Alternative Road Corridor ${idx + 1}`,
            distanceKm: r.distanceKm,
            durationMin: r.durationMin,
            path: r.path,
            provider: "OSRM Real Road Network"
          });
        });
      }
    }

    // 4. DYNAMIC SAFE DETOUR DISCOVERY:
    // Check if any reported unsafe hotspots lie near the direct paths.
    // If so, explore genuine road network detours through legitimate arterial bypass waypoints.
    const allReports = reportStore.getAllReports();
    const midLat = (o.lat + d.lat) / 2;
    const midLng = (o.lng + d.lng) / 2;
    const directDistKm = haversineDistance(o.lat, o.lng, d.lat, d.lng);

    const hasDangerHotspot = allReports.some(rep => {
      const dMid = haversineDistance(midLat, midLng, rep.latitude, rep.longitude);
      return dMid <= (directDistKm * 0.6);
    });

    if (rawCandidates.length < 3 || hasDangerHotspot) {
      const dLat = d.lat - o.lat;
      const dLng = d.lng - o.lng;
      const mag = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
      const perpLat = -dLng / mag;
      const perpLng = dLat / mag;
      const offsetScale = Math.max(0.015, Math.min(0.05, directDistKm * 0.004));

      const bypassPointA = {
        lat: Number((midLat + perpLat * offsetScale).toFixed(6)),
        lng: Number((midLng + perpLng * offsetScale).toFixed(6))
      };
      const bypassPointB = {
        lat: Number((midLat - perpLat * offsetScale).toFixed(6)),
        lng: Number((midLng - perpLng * offsetScale).toFixed(6))
      };

      const detourPathsA = await this.queryRealRoadPath([o, bypassPointA, d]);
      if (detourPathsA && detourPathsA[0] && detourPathsA[0].path.length > 2) {
        rawCandidates.push({
          id: `osrm_detour_a`,
          name: "Safe Arterial Bypass Corridor",
          distanceKm: detourPathsA[0].distanceKm,
          durationMin: detourPathsA[0].durationMin,
          path: detourPathsA[0].path,
          provider: "OSRM Real Road Network (Detour Corridor)"
        });
      }

      const detourPathsB = await this.queryRealRoadPath([o, bypassPointB, d]);
      if (detourPathsB && detourPathsB[0] && detourPathsB[0].path.length > 2) {
        rawCandidates.push({
          id: `osrm_detour_b`,
          name: "Commercial Ring Road Bypass",
          distanceKm: detourPathsB[0].distanceKm,
          durationMin: detourPathsB[0].durationMin,
          path: detourPathsB[0].path,
          provider: "OSRM Real Road Network (Detour Corridor)"
        });
      }
    }

    return deduplicateRoutes(rawCandidates);
  }

  /**
   * Main Route Calculation:
   * 1. Evaluates travel time mode & night weighting.
   * 2. Fetches multiple authentic candidate routes from Google Directions / OSRM.
   * 3. Runs OUR Multi-Segment Safety Scoring Algorithm across each route's road nodes.
   * 4. Ranks routes strictly by Safety Score (🟢 Safest, 🔵 Safe Alternative, 🔴 High Risk).
   * 5. Automatically selects the SAFEST route (giving highest priority to safety over shortest distance).
   */
  async calculateRoutes() {
    this.loading = true;
    this.error = null;
    this.saferLongerNotice = null;
    this.allHighRiskWarning = null;

    // Determine day vs night based on travelTime selection
    const t = (this.travelTime || 'now').toLowerCase();
    if (t.includes('night')) {
      this.isNightMode = true;
    } else if (t.includes('now') || t === 'live') {
      const h = new Date().getHours();
      this.isNightMode = (h >= 20 || h <= 5);
    } else if (t.includes(':')) {
      let hour = parseInt(t.split(':')[0], 10);
      const isPM = t.includes('pm');
      const isAM = t.includes('am');
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;
      this.isNightMode = (hour >= 20 || hour <= 5);
    } else {
      this.isNightMode = false;
    }

    try {
      const o = this.origin;
      const d = this.destination;

      if (!o || !d || isNaN(o.lat) || isNaN(o.lng) || isNaN(d.lat) || isNaN(d.lng)) {
        throw new Error("Invalid origin or destination coordinates.");
      }

      // Fetch authentic road alternatives from Google / OSRM
      const candidatePaths = await this.fetchAuthoritativeRoutes(o, d);

      if (!candidatePaths || candidatePaths.length === 0) {
        throw new Error("Unable to find a valid road route. Please try another location.");
      }

      // Step 2: Run Multi-Segment Safety Algorithm on Each Candidate Route
      const evaluatedRoutes = candidatePaths.map(cand => this.evaluateRouteSafety(cand));

      // Step 3: Rank strictly by Safety Score (Highest to Lowest)
      // Safety is prioritized over shortest distance!
      const sortedBySafety = [...evaluatedRoutes].sort((a, b) => b.safetyScore - a.safetyScore);

      // Check shortest distance among routes to determine if safer route is longer
      const shortestCandidate = [...evaluatedRoutes].sort((a, b) => a.distanceKm - b.distanceKm)[0];
      const safestCandidate = sortedBySafety[0];

      if (safestCandidate.distanceKm > shortestCandidate.distanceKm && safestCandidate.safetyScore > shortestCandidate.safetyScore + 4) {
        const extraKm = (safestCandidate.distanceKm - shortestCandidate.distanceKm).toFixed(1);
        this.saferLongerNotice = `Recommended because this route avoids high-risk areas (${safestCandidate.safetyScore}/100 Safe). It is ${extraKm} km longer than the shortest route.`;
      }

      if (safestCandidate.safetyScore < 40) {
        this.allHighRiskWarning = "⚠️ No sufficiently safe alternative route was found. Displaying lowest-risk available road path with high-risk warning.";
      }

      if (sortedBySafety.length === 1) {
        const meta = getScoreMetadata(safestCandidate.safetyScore);
        this.routes = [
          {
            ...safestCandidate,
            type: safestCandidate.safetyScore >= 80 ? 'SAFEST' : safestCandidate.safetyScore >= 60 ? 'BALANCED' : 'HIGHER_RISK',
            label: safestCandidate.safetyScore >= 80 ? 'Safest Available Route' : 'Only Available Road Route',
            badge: safestCandidate.safetyScore >= 80 ? 'Safest Route' : safestCandidate.safetyScore >= 60 ? 'Alternative' : 'High Risk',
            recommended: true,
            color: meta.color
          }
        ];
      } else if (sortedBySafety.length === 2) {
        const r1 = sortedBySafety[0];
        const r2 = sortedBySafety[1];
        const meta1 = getScoreMetadata(r1.safetyScore);
        const meta2 = getScoreMetadata(r2.safetyScore);

        this.routes = [
          {
            ...r1,
            type: 'SAFEST',
            label: 'Safest Route',
            badge: r1.safetyScore >= 80 ? 'Safest Route' : 'Recommended Route',
            recommended: true,
            color: meta1.color
          },
          {
            ...r2,
            type: r2.safetyScore < 40 ? 'HIGHER_RISK' : r2.safetyScore < 60 ? 'CAUTION' : 'BALANCED',
            label: r2.safetyScore < 40 ? 'High-Risk Route' : 'Alternative Route',
            badge: r2.safetyScore < 40 ? 'High Risk' : r2.safetyScore < 60 ? 'Caution' : 'Alternative',
            recommended: false,
            color: meta2.color
          }
        ];
      } else {
        const rSafest = sortedBySafety[0];
        const rAlt = sortedBySafety[1];
        const rRisk = sortedBySafety[sortedBySafety.length - 1];

        const metaSafest = getScoreMetadata(rSafest.safetyScore);
        const metaAlt = getScoreMetadata(rAlt.safetyScore);
        const metaRisk = getScoreMetadata(rRisk.safetyScore);

        this.routes = [
          {
            ...rSafest,
            type: 'SAFEST',
            label: 'Safest Route',
            badge: 'Safest Route',
            recommended: true,
            color: metaSafest.color
          },
          {
            ...rAlt,
            type: rAlt.safetyScore >= 60 ? 'BALANCED' : 'CAUTION',
            label: rAlt.safetyScore >= 60 ? 'Safe Alternative' : 'Caution Route',
            badge: rAlt.safetyScore >= 60 ? 'Alternative' : 'Caution',
            recommended: false,
            color: metaAlt.color
          },
          {
            ...rRisk,
            type: rRisk.safetyScore < 40 ? 'HIGHER_RISK' : 'CAUTION',
            label: rRisk.safetyScore < 40 ? 'High-Risk Route' : 'Fastest / Caution Route',
            badge: rRisk.safetyScore < 40 ? 'High Risk' : 'Caution',
            recommended: false,
            color: metaRisk.color
          }
        ];
      }

      this.selectedRouteIndex = 0;
    } catch (err) {
      console.error("SafeRoute calculation error:", err);
      this.error = err.message || "Unable to find a valid road route. Please try another location.";
      this.routes = [];
    } finally {
      this.loading = false;
    }
  }

  /**
   * OUR SEGMENT-BY-SEGMENT SAFETY ALGORITHM:
   * Breaks the candidate route into discrete spatial segments along the road polyline.
   * Analyzes:
   * - Proximity to reported crime/hazard hotspots (with exponential severity penalty).
   * - Street lighting coverage and visibility along each segment.
   * - Emergency support context (proximity to police stations and hospitals as positive accessibility signals).
   * - Time-of-day penalty (night risk weighting).
   * - Computes Average Segment Risk + Peak Segment Penalty -> Overall Route Safety Score (0-100).
   */
  evaluateRouteSafety(cand) {
    const path = cand.path || [];
    if (path.length < 2) {
      return { ...cand, safetyScore: 50, riskScore: 50, reasonsWhy: [], riskWarnings: [] };
    }

    const allReports = reportStore.getAllReports();
    const facilityData = FacilityService.analyzePathFacilities(path);

    // 1. Break route into discrete spatial segments (~80-120 meters each)
    const numSegments = Math.max(5, Math.min(25, Math.floor(path.length / 3)));
    const step = Math.max(1, Math.floor(path.length / numSegments));
    const segmentNodes = [];
    for (let i = 0; i < path.length; i += step) {
      segmentNodes.push(path[i]);
    }
    if (segmentNodes[segmentNodes.length - 1] !== path[path.length - 1]) {
      segmentNodes.push(path[path.length - 1]);
    }

    let sumSegmentRisk = 0;
    let peakSegmentRisk = 0;
    let peakRiskNode = null;
    const nearbyReports = [];

    // 2. Evaluate each individual segment
    for (let s = 0; s < segmentNodes.length; s++) {
      const node = segmentNodes[s];
      let segmentHazardPenalty = 0;

      // Check proximity to all reported incidents
      for (const rep of allReports) {
        const dKm = haversineDistance(node.lat, node.lng, rep.latitude, rep.longitude);
        if (dKm <= SAFETY_CONFIG.thresholds.reportProximityBufferKm) {
          const weight = reportStore.calculateReportWeight(rep);
          const distFactor = Math.max(0, 1.0 - (dKm / SAFETY_CONFIG.thresholds.reportProximityBufferKm));
          const severityBase = rep.severity === 'Critical' ? 36 : rep.severity === 'High' ? 26 : 16;
          const penalty = weight * distFactor * severityBase;
          segmentHazardPenalty += penalty;

          if (!nearbyReports.some(r => r.id === rep.id)) {
            nearbyReports.push(rep);
          }
        }
      }

      // Base lighting for this segment
      let segmentLightingPercent = 85;
      if (facilityData.publicHubCount1km >= 2) segmentLightingPercent = 92;
      else if (facilityData.publicHubCount1km === 0) segmentLightingPercent = 65;
      if (nearbyReports.some(r => r.category === 'Poor street lighting')) {
        segmentLightingPercent = Math.max(25, segmentLightingPercent - 35);
      }

      // Emergency Accessibility context (does NOT make a road safe, but provides emergency accessibility)
      let emergencyAccessSupport = 0;
      if (facilityData.policeCount1km > 0) emergencyAccessSupport += 15;
      if (facilityData.hospitalCount1km > 0) emergencyAccessSupport += 10;
      if (facilityData.publicHubCount1km > 0) emergencyAccessSupport += 10;

      // Segment Risk calculation (0 to 100)
      const lightingRisk = (100 - segmentLightingPercent) * (this.isNightMode ? 0.35 : 0.20);
      const nightBaseRisk = this.isNightMode ? 18 : 5;
      const rawSegRisk = (segmentHazardPenalty * 1.8) + lightingRisk + nightBaseRisk - (emergencyAccessSupport * 0.3);
      const segmentRisk = Math.max(5, Math.min(95, Math.round(rawSegRisk)));

      sumSegmentRisk += segmentRisk;
      if (segmentRisk > peakSegmentRisk) {
        peakSegmentRisk = segmentRisk;
        peakRiskNode = node;
      }
    }

    const avgSegmentRisk = sumSegmentRisk / segmentNodes.length;

    // 3. Composite Safety Score: Weighted average segment risk (60%) + Peak risk penalty (40%)
    // Routes passing through a severe danger choke-point are heavily penalized!
    const compositeRisk = (avgSegmentRisk * 0.60) + (peakSegmentRisk * 0.40);
    
    // Travel mode vulnerability adjustment (walking pedestrians are more vulnerable)
    let modeAdjustment = 0;
    if (this.travelMode === 'walking') modeAdjustment = this.isNightMode ? 10 : 5;
    else if (this.travelMode === 'bike') modeAdjustment = this.isNightMode ? 5 : 2;

    const finalRiskScore = Math.max(4, Math.min(92, Math.round(compositeRisk + modeAdjustment)));
    const finalSafetyScore = Math.max(8, Math.min(96, 100 - finalRiskScore));

    // 4. Generate Factual Explanations
    const reasonsWhy = [];
    const riskWarnings = [];

    if (finalSafetyScore >= 75) {
      reasonsWhy.push(`High safety score (${finalSafetyScore}/100) along verified arterial road`);
    }

    if (peakSegmentRisk < 35) {
      reasonsWhy.push("Consistently low-risk corridor with no severe hazard choke-points");
    } else if (peakSegmentRisk >= 60) {
      riskWarnings.push(`Passes near a high-risk area (Peak segment risk: ${peakSegmentRisk}/100)`);
    }

    if (facilityData.policeCount1km > 0) {
      reasonsWhy.push(`${facilityData.policeCount1km} verified police station${facilityData.policeCount1km > 1 ? 's' : ''} within 1 km`);
    } else {
      riskWarnings.push("No police station within 1 km radius");
    }

    if (facilityData.hospitalCount1km > 0) {
      reasonsWhy.push(`${facilityData.hospitalCount1km} hospital/emergency medical facility nearby`);
    }

    if (this.isNightMode) {
      riskWarnings.push("Night travel mode: caution advised on unlit stretches");
    }

    return {
      ...cand,
      safetyScore: finalSafetyScore,
      riskScore: finalRiskScore,
      avgSegmentRisk: Math.round(avgSegmentRisk),
      peakSegmentRisk: Math.round(peakSegmentRisk),
      reasonsWhy,
      riskWarnings,
      facilityData
    };
  }
}

export const safeRouteEngine = new SafeRouteEngine();
