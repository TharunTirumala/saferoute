// Serverless Function: /api/routes/directions
// Google Maps Platform Directions & Routes API Proxy
// Returns multiple real road candidate routes with exact geometries and travel modes

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let oLat, oLng, dLat, dLng, mode = 'driving';

    if (req.method === 'POST') {
      const body = req.body || {};
      oLat = parseFloat(body.origin?.lat || body.originLat || body.oLat);
      oLng = parseFloat(body.origin?.lng || body.originLng || body.oLng);
      dLat = parseFloat(body.destination?.lat || body.destLat || body.dLat);
      dLng = parseFloat(body.destination?.lng || body.destLng || body.dLng);
      if (body.mode) mode = body.mode.toLowerCase();
    } else {
      oLat = parseFloat(req.query.originLat || req.query.oLat || req.query.lat1);
      oLng = parseFloat(req.query.originLng || req.query.oLng || req.query.lng1);
      dLat = parseFloat(req.query.destLat || req.query.dLat || req.query.lat2);
      dLng = parseFloat(req.query.destLng || req.query.dLng || req.query.lng2);
      if (req.query.mode) mode = req.query.mode.toLowerCase();
    }

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      return res.status(400).json({ error: 'Valid origin and destination coordinates are required.' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_DIRECTIONS_API_KEY;

    let googleMode = 'driving';
    if (mode === 'walking') googleMode = 'walking';
    else if (mode === 'bike' || mode === 'bicycling') googleMode = 'bicycling';
    else if (mode === 'bus' || mode === 'transit') googleMode = 'transit';
    else if (mode === 'auto' || mode === 'car') googleMode = 'driving';

    const candidateRoutes = [];
    let usedProvider = 'None';

    // 1. If Google API Key is present, query Google Maps Directions API with alternatives=true
    if (apiKey) {
      usedProvider = 'Google Maps Platform Directions API';
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${oLat},${oLng}&destination=${dLat},${dLng}&mode=${googleMode}&alternatives=true&key=${apiKey}`;
        const gRes = await fetch(googleUrl, { signal: AbortSignal.timeout(8000) });
        
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.status === 'OK' && Array.isArray(gData.routes) && gData.routes.length > 0) {
            gData.routes.forEach((gRoute, idx) => {
              const leg = gRoute.legs?.[0] || {};
              const distKm = Math.round(((leg.distance?.value || 0) / 1000) * 10) / 10;
              const durMin = Math.round(((leg.duration?.value || 0) / 60) * 10) / 10;
              const encodedPoly = gRoute.overview_polyline?.points || '';
              const summaryName = gRoute.summary ? `via ${gRoute.summary}` : (idx === 0 ? 'Primary Arterial Corridor' : `Alternative Corridor ${idx + 1}`);

              candidateRoutes.push({
                id: `google_${idx}`,
                name: summaryName,
                distanceKm: distKm,
                durationMin: durMin,
                encodedPolyline: encodedPoly,
                warnings: gRoute.warnings || [],
                provider: 'Google Maps Directions'
              });
            });
          }
        }
      } catch (gErr) {
        console.warn('Google Directions API query note:', gErr.message);
      }
    }

    // 2. If Google returned 0 routes or API key is not present, use authoritative OSRM real road network
    if (candidateRoutes.length === 0) {
      usedProvider = apiKey ? 'Google Maps / OSRM Live Road Network' : 'OSRM Live Road Network';
      try {
        const profile = (mode === 'walking') ? 'foot' : 'driving';
        const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
        const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });

        if (osrmRes.ok) {
          const osrmData = await osrmRes.json();
          if (osrmData.routes && osrmData.routes.length > 0) {
            osrmData.routes.forEach((r, idx) => {
              const coords = (r.geometry?.coordinates || []).map(c => ({
                lat: Number(c[1].toFixed(6)),
                lng: Number(c[0].toFixed(6))
              }));

              candidateRoutes.push({
                id: `osrm_${idx}`,
                name: idx === 0 ? 'Main Arterial Corridor' : `Alternative Bypass Corridor ${idx + 1}`,
                distanceKm: Math.round((r.distance / 1000) * 10) / 10,
                durationMin: Math.round((r.duration / 60) * 10) / 10,
                path: coords,
                provider: 'OSRM Real Road Network'
              });
            });
          }
        }
      } catch (osrmErr) {
        console.warn('OSRM Live Road Network note:', osrmErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      provider: usedProvider,
      travelMode: mode,
      count: candidateRoutes.length,
      routes: candidateRoutes
    });
  } catch (err) {
    console.error('Error in /api/routes/directions:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch candidate routes.',
      routes: []
    });
  }
}
