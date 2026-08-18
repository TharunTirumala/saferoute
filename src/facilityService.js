// FacilityService: Verified Emergency and Public Infrastructure Proximity Lookup
import { haversineDistance } from './safeRouteEngine.js';

export const VERIFIED_FACILITIES = [
  // Police Stations
  { name: 'Banjara Hills Police Station', lat: 17.4182, lng: 78.4265, category: 'Police', phone: '040-27852482', city: 'Hyderabad' },
  { name: 'Madhapur Police Outpost', lat: 17.4482, lng: 78.3875, category: 'Police', phone: '040-27853412', city: 'Hyderabad' },
  { name: 'Gachibowli Police Station', lat: 17.4398, lng: 78.3655, category: 'Police', phone: '040-27854100', city: 'Hyderabad' },
  { name: 'Panjagutta Police Station', lat: 17.4260, lng: 78.4520, category: 'Police', phone: '040-27852422', city: 'Hyderabad' },
  { name: 'Jubilee Hills Police Station', lat: 17.4320, lng: 78.4070, category: 'Police', phone: '040-27852495', city: 'Hyderabad' },
  { name: 'Cyberabad Police Commissionerate', lat: 17.4365, lng: 78.3750, category: 'Police', phone: '040-27853400', city: 'Hyderabad' },
  { name: 'Connaught Place Police Station', lat: 28.6328, lng: 77.2197, category: 'Police', phone: '011-23747100', city: 'Delhi' },
  { name: 'Hauz Khas Police Station', lat: 28.5494, lng: 77.2001, category: 'Police', phone: '011-26510070', city: 'Delhi' },
  { name: 'Cubbon Park Police Station', lat: 12.9778, lng: 77.5925, category: 'Police', phone: '080-22942581', city: 'Bengaluru' },
  { name: 'Indiranagar Police Station', lat: 12.9784, lng: 77.6408, category: 'Police', phone: '080-22942542', city: 'Bengaluru' },
  { name: 'Colaba Police Station', lat: 18.9220, lng: 72.8346, category: 'Police', phone: '022-22852885', city: 'Mumbai' },
  { name: 'Bandra Police Station', lat: 19.0596, lng: 72.8295, category: 'Police', phone: '022-26422042', city: 'Mumbai' },

  // Hospitals & 24/7 Medical Centers
  { name: 'Care Hospital Banjara Hills', lat: 17.4140, lng: 78.4380, category: 'Hospital', phone: '040-61656565', city: 'Hyderabad' },
  { name: 'Apollo Hospital Jubilee Hills', lat: 17.4128, lng: 78.4319, category: 'Hospital', phone: '040-23607777', city: 'Hyderabad' },
  { name: 'Medicover Hospital Hitech City', lat: 17.4451, lng: 78.3712, category: 'Hospital', phone: '040-68334455', city: 'Hyderabad' },
  { name: 'Continental Hospital Gachibowli', lat: 17.4325, lng: 78.3412, category: 'Hospital', phone: '040-67000000', city: 'Hyderabad' },
  { name: 'AIIMS New Delhi', lat: 28.5672, lng: 77.2100, category: 'Hospital', phone: '011-26588500', city: 'Delhi' },
  { name: 'Safdarjung Hospital', lat: 28.5700, lng: 77.2070, category: 'Hospital', phone: '011-26165060', city: 'Delhi' },
  { name: 'Manipal Hospital Old Airport Rd', lat: 12.9592, lng: 77.6480, category: 'Hospital', phone: '080-25024444', city: 'Bengaluru' },
  { name: 'Lilavati Hospital Bandra', lat: 19.0515, lng: 72.8288, category: 'Hospital', phone: '022-26751000', city: 'Mumbai' },

  // Public Hubs, Commercial Areas & Metros
  { name: 'Hitech City Cyber Towers Hub', lat: 17.4485, lng: 78.3770, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Inorbit Mall Corridor', lat: 17.4340, lng: 78.3860, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Road No 36 Jubilee Hills Metro', lat: 17.4268, lng: 78.4085, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Gachibowli Stadium Junction', lat: 17.4401, lng: 78.3488, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Connaught Place Central Circle', lat: 28.6315, lng: 77.2167, category: 'Public Hub', city: 'Delhi' },
  { name: 'Saket Select Citywalk Corridor', lat: 28.5284, lng: 77.2190, category: 'Public Hub', city: 'Delhi' },
  { name: 'MG Road Metro Station Hub', lat: 12.9756, lng: 77.6066, category: 'Public Hub', city: 'Bengaluru' },
  { name: 'Bandra Kurla Complex (BKC)', lat: 19.0664, lng: 72.8681, category: 'Public Hub', city: 'Mumbai' }
];

export class FacilityService {
  /**
   * Analyzes facilities within proximity of a polyline path
   */
  static analyzePathFacilities(path) {
    if (!path || path.length === 0) {
      return {
        policeStations: [],
        policeCount1km: 0,
        nearestPolice: null,
        hospitals: [],
        hospitalCount1km: 0,
        nearestHospital: null,
        publicHubs: [],
        publicHubCount1km: 0,
        nearestPublicHub: null
      };
    }

    const step = Math.max(1, Math.floor(path.length / 15));
    const sampled = [];
    for (let i = 0; i < path.length; i += step) {
      sampled.push(path[i]);
    }
    if (sampled[sampled.length - 1] !== path[path.length - 1]) {
      sampled.push(path[path.length - 1]);
    }

    const nearbyPolice = [];
    const nearbyHospitals = [];
    const nearbyPublic = [];

    for (const fac of VERIFIED_FACILITIES) {
      let minDistKm = 999999;
      for (const pt of sampled) {
        const d = haversineDistance(pt.lat, pt.lng, fac.lat, fac.lng);
        if (d < minDistKm) minDistKm = d;
      }

      if (minDistKm <= 1.5) {
        const item = { ...fac, distanceMeters: Math.round(minDistKm * 1000) };
        if (fac.category === 'Police') nearbyPolice.push(item);
        else if (fac.category === 'Hospital') nearbyHospitals.push(item);
        else nearbyPublic.push(item);
      }
    }

    nearbyPolice.sort((a, b) => a.distanceMeters - b.distanceMeters);
    nearbyHospitals.sort((a, b) => a.distanceMeters - b.distanceMeters);
    nearbyPublic.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      policeStations: nearbyPolice,
      policeCount1km: nearbyPolice.filter(p => p.distanceMeters <= 1000).length,
      nearestPolice: nearbyPolice[0] || null,
      hospitals: nearbyHospitals,
      hospitalCount1km: nearbyHospitals.filter(h => h.distanceMeters <= 1000).length,
      nearestHospital: nearbyHospitals[0] || null,
      publicHubs: nearbyPublic,
      publicHubCount1km: nearbyPublic.filter(p => p.distanceMeters <= 1000).length,
      nearestPublicHub: nearbyPublic[0] || null
    };
  }
}
