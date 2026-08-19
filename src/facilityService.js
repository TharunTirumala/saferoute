// FacilityService: Verified Emergency and Public Infrastructure Proximity Lookup
import { haversineDistance } from './safeRouteEngine.js';

export const VERIFIED_FACILITIES = [
  // ================= HYDERABAD POLICE STATIONS & SHE TEAM KIOSKS =================
  { name: 'Cyberabad Police Commissionerate', lat: 17.4365, lng: 78.3750, category: 'Police', phone: '040-27853400', city: 'Hyderabad' },
  { name: 'Madhapur Police Outpost & She Team', lat: 17.4482, lng: 78.3875, category: 'Police', phone: '040-27853412', city: 'Hyderabad' },
  { name: 'Hitech City She Team Kiosk', lat: 17.4470, lng: 78.3760, category: 'Police', phone: '040-27853415', city: 'Hyderabad' },
  { name: 'Gachibowli Police Station', lat: 17.4398, lng: 78.3655, category: 'Police', phone: '040-27854100', city: 'Hyderabad' },
  { name: 'Banjara Hills Police Station', lat: 17.4182, lng: 78.4265, category: 'Police', phone: '040-27852482', city: 'Hyderabad' },
  { name: 'Jubilee Hills Police Station', lat: 17.4320, lng: 78.4070, category: 'Police', phone: '040-27852495', city: 'Hyderabad' },
  { name: 'Panjagutta Police Station', lat: 17.4260, lng: 78.4520, category: 'Police', phone: '040-27852422', city: 'Hyderabad' },
  { name: 'Begumpet Police Station', lat: 17.4440, lng: 78.4670, category: 'Police', phone: '040-27852450', city: 'Hyderabad' },
  { name: 'SR Nagar Police Station', lat: 17.4410, lng: 78.4480, category: 'Police', phone: '040-27852460', city: 'Hyderabad' },
  { name: 'Ameerpet Women Safety Cell', lat: 17.4370, lng: 78.4480, category: 'Police', phone: '040-27852465', city: 'Hyderabad' },
  { name: 'Charminar Police Station', lat: 17.3616, lng: 78.4747, category: 'Police', phone: '040-27852310', city: 'Hyderabad' },
  { name: 'Koti Police Station', lat: 17.3850, lng: 78.4860, category: 'Police', phone: '040-27852320', city: 'Hyderabad' },
  { name: 'Abids Police Station', lat: 17.3910, lng: 78.4730, category: 'Police', phone: '040-27852330', city: 'Hyderabad' },
  { name: 'Malakpet Police Station', lat: 17.3780, lng: 78.4980, category: 'Police', phone: '040-27852340', city: 'Hyderabad' },
  { name: 'Secunderabad Police Station', lat: 17.4390, lng: 78.4980, category: 'Police', phone: '040-27852510', city: 'Hyderabad' },
  { name: 'Gopalapuram Police Station', lat: 17.4330, lng: 78.5030, category: 'Police', phone: '040-27852520', city: 'Hyderabad' },
  { name: 'Miyapur Police Station', lat: 17.4960, lng: 78.3580, category: 'Police', phone: '040-27853430', city: 'Hyderabad' },
  { name: 'Kukatpally Police Station', lat: 17.4840, lng: 78.4080, category: 'Police', phone: '040-27853440', city: 'Hyderabad' },
  { name: 'KPHB Colony Police Outpost', lat: 17.4920, lng: 78.3990, category: 'Police', phone: '040-27853445', city: 'Hyderabad' },

  // ================= HYDERABAD HOSPITALS & 24/7 MEDICAL CENTERS =================
  { name: 'Medicover Hospital Hitech City', lat: 17.4451, lng: 78.3712, category: 'Hospital', phone: '040-68334455', city: 'Hyderabad' },
  { name: 'AIG Hospitals Gachibowli', lat: 17.4430, lng: 78.3650, category: 'Hospital', phone: '040-42444244', city: 'Hyderabad' },
  { name: 'Continental Hospital Gachibowli', lat: 17.4325, lng: 78.3412, category: 'Hospital', phone: '040-67000000', city: 'Hyderabad' },
  { name: 'Apollo Hospital Jubilee Hills', lat: 17.4128, lng: 78.4319, category: 'Hospital', phone: '040-23607777', city: 'Hyderabad' },
  { name: 'Care Hospital Banjara Hills', lat: 17.4140, lng: 78.4380, category: 'Hospital', phone: '040-61656565', city: 'Hyderabad' },
  { name: 'Yashoda Hospital Somajiguda', lat: 17.4250, lng: 78.4590, category: 'Hospital', phone: '040-45674567', city: 'Hyderabad' },
  { name: 'Yashoda Hospital Malakpet', lat: 17.3750, lng: 78.5020, category: 'Hospital', phone: '040-45674568', city: 'Hyderabad' },
  { name: 'KIMS Hospital Secunderabad', lat: 17.4360, lng: 78.4920, category: 'Hospital', phone: '040-44885000', city: 'Hyderabad' },
  { name: 'Sunshine Hospital Gachibowli', lat: 17.4415, lng: 78.3680, category: 'Hospital', phone: '040-44550000', city: 'Hyderabad' },
  { name: 'MaxCure Hospital Madhapur', lat: 17.4480, lng: 78.3810, category: 'Hospital', phone: '040-49404940', city: 'Hyderabad' },
  { name: 'NIMS Hospital Punjagutta', lat: 17.4220, lng: 78.4550, category: 'Hospital', phone: '040-23489000', city: 'Hyderabad' },
  { name: 'Osmania General Hospital', lat: 17.3710, lng: 78.4790, category: 'Hospital', phone: '040-24600121', city: 'Hyderabad' },
  { name: 'Gandhi Hospital Secunderabad', lat: 17.4240, lng: 78.5040, category: 'Hospital', phone: '040-27505566', city: 'Hyderabad' },

  // ================= HYDERABAD PUBLIC HUBS & SAFE TRANSIT STATIONS =================
  { name: 'Hitech City Cyber Towers Hub', lat: 17.4485, lng: 78.3770, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Inorbit Mall Corridor', lat: 17.4340, lng: 78.3860, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Mindspace IT Park Entrance', lat: 17.4420, lng: 78.3810, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Road No 36 Jubilee Hills Metro', lat: 17.4268, lng: 78.4085, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Gachibowli Stadium Junction', lat: 17.4401, lng: 78.3488, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Financial District Wipro Circle', lat: 17.4190, lng: 78.3440, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Ameerpet Metro Interchange', lat: 17.4355, lng: 78.4482, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Begumpet Metro Station Hub', lat: 17.4430, lng: 78.4650, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'KPHB Metro Station Hub', lat: 17.4930, lng: 78.3980, category: 'Public Hub', city: 'Hyderabad' }
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
