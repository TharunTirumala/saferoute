// Serverless Function: /api/places/nearby
// Google Maps Platform Places API (New) / Nearby Search Proxy
// Finds real nearby Police Stations, Hospitals, and Safety-Relevant Public Places

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let lat, lng, radius = 3500, categories = ['police', 'hospital', 'public'];

    if (req.method === 'POST') {
      const body = req.body || {};
      lat = parseFloat(body.latitude || body.lat);
      lng = parseFloat(body.longitude || body.lng);
      if (body.radius) radius = Math.min(Math.max(parseInt(body.radius), 500), 10000);
      if (body.categories && Array.isArray(body.categories)) categories = body.categories;
    } else {
      lat = parseFloat(req.query.lat || req.query.latitude);
      lng = parseFloat(req.query.lng || req.query.longitude);
      if (req.query.radius) radius = Math.min(Math.max(parseInt(req.query.radius), 500), 10000);
      if (req.query.categories) {
        categories = req.query.categories.split(',').map(c => c.trim().toLowerCase());
      }
    }

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

    // Google Places API (New) Type Mapping
    const typeMapping = {
      police: ['police'],
      hospital: ['hospital', 'doctor'],
      public: [
        'school',
        'university',
        'library',
        'community_center',
        'transit_station',
        'subway_station',
        'train_station',
        'bus_station',
        'park',
        'city_hall',
        'courthouse',
        'fire_station',
        'local_government_office',
        'post_office'
      ]
    };

    const results = {
      police: [],
      hospital: [],
      public: []
    };

    let usedProvider = 'None';

    // 1. If Google Maps / Places API Key is present, query Google Places API (New)
    if (apiKey) {
      usedProvider = 'Google Places API (New)';
      const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.googleMapsUri';

      for (const cat of categories) {
        const types = typeMapping[cat];
        if (!types) continue;

        try {
          const gRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': fieldMask
            },
            body: JSON.stringify({
              includedTypes: types,
              maxResultCount: 15,
              locationRestriction: {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: Number(radius)
                }
              }
            })
          });

          if (gRes.ok) {
            const data = await gRes.json();
            const rawPlaces = data.places || [];

            results[cat] = rawPlaces.map(p => ({
              id: p.id || `g_${Math.random().toString(36).substr(2, 8)}`,
              name: p.displayName?.text || (cat === 'police' ? 'Police Station' : (cat === 'hospital' ? 'Hospital' : 'Public Place')),
              address: p.formattedAddress || 'Nearby area',
              lat: p.location?.latitude,
              lng: p.location?.longitude,
              category: cat,
              categoryLabel: cat === 'police' ? 'Police Station' : (cat === 'hospital' ? 'Hospital' : 'Public Place'),
              primaryType: p.primaryType || types[0],
              googleMapsUri: p.googleMapsUri || (p.location ? `https://www.google.com/maps/search/?api=1&query=${p.location.latitude},${p.location.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName?.text || '')}`)
            })).filter(p => p.lat && p.lng);
          } else {
            const errJson = await gRes.json().catch(() => ({}));
            console.warn(`Google Places API returned status ${gRes.status} for category ${cat}:`, errJson);
          }
        } catch (catErr) {
          console.warn(`Error querying Google Places for category ${cat}:`, catErr.message);
        }
      }
    }

    // 2. If Google API Key is not set or returned 0 results, query live geospatial Overpass fallback
    const totalFound = Object.values(results).reduce((acc, arr) => acc + arr.length, 0);
    if (totalFound === 0) {
      usedProvider = apiKey ? 'Google Places / Overpass Live' : 'Overpass Live Geospatial Service';
      try {
        const radiusMeters = Math.round(radius);
        const overpassQuery = `
          [out:json][timeout:8];
          (
            node["amenity"="police"](around:${radiusMeters},${lat},${lng});
            way["amenity"="police"](around:${radiusMeters},${lat},${lng});
            node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
            way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
            node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
            node["amenity"~"school|university|library|community_centre|townhall|courthouse"](around:${radiusMeters},${lat},${lng});
            node["public_transport"="station"](around:${radiusMeters},${lat},${lng});
          );
          out center 25;
        `;

        const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: AbortSignal.timeout(5000)
        });

        if (overpassRes.ok) {
          const data = await overpassRes.json();
          const elements = data.elements || [];

          elements.forEach(el => {
            const pLat = el.lat || el.center?.lat;
            const pLng = el.lon || el.center?.lon;
            if (!pLat || !pLng) return;

            const tags = el.tags || {};
            const amenity = tags.amenity || '';
            const publicTransport = tags.public_transport || '';
            const name = tags.name || tags['name:en'] || '';

            let cat = 'public';
            let catLabel = 'Public Place';

            if (amenity === 'police') {
              cat = 'police';
              catLabel = 'Police Station';
            } else if (amenity === 'hospital' || amenity === 'clinic') {
              cat = 'hospital';
              catLabel = 'Hospital / Medical Center';
            } else {
              cat = 'public';
              if (amenity === 'school') catLabel = 'School';
              else if (amenity === 'university') catLabel = 'University';
              else if (amenity === 'library') catLabel = 'Public Library';
              else if (publicTransport) catLabel = 'Transit Station';
              else catLabel = 'Public / Safety Hub';
            }

            const displayName = name || `${catLabel} (Nearby)`;
            const addressParts = [tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean);
            const address = addressParts.length > 0 ? addressParts.join(', ') : 'Local area';
            const gmapsUri = `https://www.google.com/maps/search/?api=1&query=${pLat},${pLng}`;

            if (categories.includes(cat)) {
              results[cat].push({
                id: `osm_${el.id}`,
                name: displayName,
                address,
                lat: Number(pLat.toFixed(6)),
                lng: Number(pLng.toFixed(6)),
                category: cat,
                categoryLabel: catLabel,
                primaryType: amenity || publicTransport,
                googleMapsUri: gmapsUri
              });
            }
          });
        }
      } catch (osmErr) {
        console.info('Live geospatial fallback note:', osmErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      provider: usedProvider,
      searchCenter: { lat, lng },
      radiusMeters: radius,
      counts: {
        police: results.police.length,
        hospital: results.hospital.length,
        public: results.public.length,
        total: results.police.length + results.hospital.length + results.public.length
      },
      results
    });
  } catch (err) {
    console.error('Error in /api/places/nearby:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to search nearby safety places.',
      results: { police: [], hospital: [], public: [] }
    });
  }
}
