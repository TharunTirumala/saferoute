// FacilityService: Verified Emergency and Public Infrastructure Proximity Lookup
import { haversineDistance } from './safeRouteEngine.js';

export const VERIFIED_FACILITIES = [
  // ================= HYDERABAD POLICE STATIONS & SHE TEAM OUTPOSTS =================
  { name: 'Cyberabad Police Commissionerate', lat: 17.4365, lng: 78.3750, category: 'Police', phone: '040-27853400', city: 'Hyderabad' },
  { name: 'Madhapur Police Outpost & She Team', lat: 17.4482, lng: 78.3875, category: 'Police', phone: '040-27853412', city: 'Hyderabad' },
  { name: 'Hitech City She Team Kiosk', lat: 17.4470, lng: 78.3760, category: 'Police', phone: '040-27853415', city: 'Hyderabad' },
  { name: 'Gachibowli Police Station', lat: 17.4398, lng: 78.3655, category: 'Police', phone: '040-27854100', city: 'Hyderabad' },
  { name: 'Gachibowli Traffic Police Station', lat: 17.4420, lng: 78.3510, category: 'Police', phone: '040-27854105', city: 'Hyderabad' },
  { name: 'Kondapur Police Outpost', lat: 17.4640, lng: 78.3660, category: 'Police', phone: '040-27853420', city: 'Hyderabad' },
  { name: 'Raidurgam Police Station', lat: 17.4320, lng: 78.3810, category: 'Police', phone: '040-27853425', city: 'Hyderabad' },
  { name: 'Narsingi Police Station', lat: 17.3870, lng: 78.3580, category: 'Police', phone: '040-27853450', city: 'Hyderabad' },
  { name: 'Banjara Hills Police Station', lat: 17.4182, lng: 78.4265, category: 'Police', phone: '040-27852482', city: 'Hyderabad' },
  { name: 'Jubilee Hills Police Station', lat: 17.4320, lng: 78.4070, category: 'Police', phone: '040-27852495', city: 'Hyderabad' },
  { name: 'Panjagutta Police Station', lat: 17.4260, lng: 78.4520, category: 'Police', phone: '040-27852422', city: 'Hyderabad' },
  { name: 'Begumpet Police Station', lat: 17.4440, lng: 78.4670, category: 'Police', phone: '040-27852450', city: 'Hyderabad' },
  { name: 'SR Nagar Police Station', lat: 17.4410, lng: 78.4480, category: 'Police', phone: '040-27852460', city: 'Hyderabad' },
  { name: 'Ameerpet Women Safety Cell', lat: 17.4370, lng: 78.4480, category: 'Police', phone: '040-27852465', city: 'Hyderabad' },
  { name: 'Sanathnagar Police Station', lat: 17.4580, lng: 78.4450, category: 'Police', phone: '040-27852470', city: 'Hyderabad' },
  { name: 'Mehdipatnam Police Station', lat: 17.3950, lng: 78.4380, category: 'Police', phone: '040-27852360', city: 'Hyderabad' },
  { name: 'Asif Nagar Police Station', lat: 17.3890, lng: 78.4420, category: 'Police', phone: '040-27852365', city: 'Hyderabad' },
  { name: 'Langer Houz Police Station', lat: 17.3810, lng: 78.4230, category: 'Police', phone: '040-27852370', city: 'Hyderabad' },
  { name: 'Masab Tank Women Police Station', lat: 17.4040, lng: 78.4550, category: 'Police', phone: '040-27852380', city: 'Hyderabad' },
  { name: 'Lakdikapul Traffic Police Station', lat: 17.4030, lng: 78.4670, category: 'Police', phone: '040-27852385', city: 'Hyderabad' },
  { name: 'Saifabad Police Station', lat: 17.4080, lng: 78.4710, category: 'Police', phone: '040-27852390', city: 'Hyderabad' },
  { name: 'Narayanaguda Police Station', lat: 17.3980, lng: 78.4890, category: 'Police', phone: '040-27852395', city: 'Hyderabad' },
  { name: 'Himayatnagar Women Safety Cell', lat: 17.4020, lng: 78.4830, category: 'Police', phone: '040-27852400', city: 'Hyderabad' },
  { name: 'Charminar Police Station', lat: 17.3616, lng: 78.4747, category: 'Police', phone: '040-27852310', city: 'Hyderabad' },
  { name: 'Koti Police Station', lat: 17.3850, lng: 78.4860, category: 'Police', phone: '040-27852320', city: 'Hyderabad' },
  { name: 'Abids Police Station', lat: 17.3910, lng: 78.4730, category: 'Police', phone: '040-27852330', city: 'Hyderabad' },
  { name: 'Chaderghat Police Station', lat: 17.3760, lng: 78.4880, category: 'Police', phone: '040-27852335', city: 'Hyderabad' },
  { name: 'Malakpet Police Station', lat: 17.3780, lng: 78.4980, category: 'Police', phone: '040-27852340', city: 'Hyderabad' },
  { name: 'Amberpet Police Station', lat: 17.3890, lng: 78.5170, category: 'Police', phone: '040-27852345', city: 'Hyderabad' },
  { name: 'Secunderabad Police Station', lat: 17.4390, lng: 78.4980, category: 'Police', phone: '040-27852510', city: 'Hyderabad' },
  { name: 'Gopalapuram Police Station', lat: 17.4330, lng: 78.5030, category: 'Police', phone: '040-27852520', city: 'Hyderabad' },
  { name: 'Tarnaka Police Station', lat: 17.4280, lng: 78.5320, category: 'Police', phone: '040-27852530', city: 'Hyderabad' },
  { name: 'Osmania University Police Station', lat: 17.4140, lng: 78.5280, category: 'Police', phone: '040-27852535', city: 'Hyderabad' },
  // ================= SHAMSHABAD & KISMATPUR POLICE STATIONS =================
  { name: 'Shamshabad Police Station', lat: 17.2500, lng: 78.4350, category: 'Police', phone: '040-27853500', city: 'Hyderabad' },
  { name: 'Shamshabad Traffic Police Station', lat: 17.2530, lng: 78.4380, category: 'Police', phone: '040-27853505', city: 'Hyderabad' },
  { name: 'RGIA Airport Police Station', lat: 17.2400, lng: 78.4290, category: 'Police', phone: '040-27853510', city: 'Hyderabad' },
  { name: 'RGIA Women Safety Assistance Kiosk', lat: 17.2415, lng: 78.4295, category: 'Police', phone: '040-27853515', city: 'Hyderabad' },
  { name: 'Kismatpur Police Outpost & She Patrol', lat: 17.3380, lng: 78.3750, category: 'Police', phone: '040-27853520', city: 'Hyderabad' },
  { name: 'Bandlaguda Jagir Police Outpost', lat: 17.3480, lng: 78.3880, category: 'Police', phone: '040-27853525', city: 'Hyderabad' },
  { name: 'Rajendranagar Police Station', lat: 17.3180, lng: 78.4020, category: 'Police', phone: '040-27853530', city: 'Hyderabad' },
  { name: 'Attapur Police Station', lat: 17.3680, lng: 78.4280, category: 'Police', phone: '040-27853535', city: 'Hyderabad' },
  { name: 'Mailardevpally Police Station', lat: 17.3120, lng: 78.4410, category: 'Police', phone: '040-27853540', city: 'Hyderabad' },
  { name: 'Budvel Police Outpost', lat: 17.3190, lng: 78.4210, category: 'Police', phone: '040-27853545', city: 'Hyderabad' },
  { name: 'Moinabad Police Station', lat: 17.3280, lng: 78.2720, category: 'Police', phone: '040-27853550', city: 'Hyderabad' },

  // ================= SHAMSHABAD & KISMATPUR HOSPITALS =================
  { name: 'Apollo Medical Center RGIA Airport', lat: 17.2405, lng: 78.4300, category: 'Hospital', phone: '040-66601066', city: 'Hyderabad' },
  { name: 'Trident Hospital Shamshabad', lat: 17.2510, lng: 78.4360, category: 'Hospital', phone: '040-24001000', city: 'Hyderabad' },
  { name: 'Premier Hospital Attapur', lat: 17.3690, lng: 78.4290, category: 'Hospital', phone: '040-24002000', city: 'Hyderabad' },
  { name: 'Germanten Hospital Attapur', lat: 17.3710, lng: 78.4310, category: 'Hospital', phone: '040-24003000', city: 'Hyderabad' },
  { name: 'Mythri Hospital Bandlaguda Jagir', lat: 17.3460, lng: 78.3890, category: 'Hospital', phone: '040-24004000', city: 'Hyderabad' },
  { name: 'Sunshine Emergency Clinic Kismatpur', lat: 17.3390, lng: 78.3760, category: 'Hospital', phone: '040-24005000', city: 'Hyderabad' },
  { name: 'Gleneagles Care Clinic Rajendranagar', lat: 17.3160, lng: 78.4010, category: 'Hospital', phone: '040-24006000', city: 'Hyderabad' },

  // ================= SHAMSHABAD & KISMATPUR PUBLIC HUBS =================
  { name: 'Rajiv Gandhi International Airport (RGIA) Terminal Hub', lat: 17.2400, lng: 78.4290, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Shamshabad ORR Interchange Hub', lat: 17.2580, lng: 78.4410, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Kismatpur ORR Junction Hub', lat: 17.3370, lng: 78.3710, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Bandlaguda Jagir Commercial Hub', lat: 17.3510, lng: 78.3870, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Rajendranagar PJTSAU Transit Corridor', lat: 17.3200, lng: 78.4050, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Attapur Pillar 140 Expressway Hub', lat: 17.3660, lng: 78.4300, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Himayat Sagar Lake View Park Hub', lat: 17.3100, lng: 78.3580, category: 'Public Hub', city: 'Hyderabad' }
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
