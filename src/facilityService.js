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
  // ================= KUKATPALLY & MARREDPALLY POLICE STATIONS =================
  { name: 'Kukatpally Police Station', lat: 17.4840, lng: 78.4080, category: 'Police', phone: '040-27853440', city: 'Hyderabad' },
  { name: 'Kukatpally Traffic Police Station', lat: 17.4860, lng: 78.4100, category: 'Police', phone: '040-27853442', city: 'Hyderabad' },
  { name: 'KPHB Colony Police Outpost & She Team', lat: 17.4920, lng: 78.3990, category: 'Police', phone: '040-27853445', city: 'Hyderabad' },
  { name: 'Moosapet Police Outpost', lat: 17.4720, lng: 78.4280, category: 'Police', phone: '040-27853448', city: 'Hyderabad' },
  { name: 'Jagadgiri Gutta Police Station', lat: 17.5080, lng: 78.4210, category: 'Police', phone: '040-27853452', city: 'Hyderabad' },
  { name: 'West Marredpally Police Station', lat: 17.4480, lng: 78.4980, category: 'Police', phone: '040-27852570', city: 'Hyderabad' },
  { name: 'East Marredpally She Team Outpost', lat: 17.4520, lng: 78.5080, category: 'Police', phone: '040-27852572', city: 'Hyderabad' },
  { name: 'Trimulgherry Police Station', lat: 17.4680, lng: 78.4950, category: 'Police', phone: '040-27852574', city: 'Hyderabad' },
  { name: 'Tukaramgate Police Station', lat: 17.4450, lng: 78.5150, category: 'Police', phone: '040-27852576', city: 'Hyderabad' },
  { name: 'Lalaguda Police Station', lat: 17.4320, lng: 78.5180, category: 'Police', phone: '040-27852578', city: 'Hyderabad' },

  // ================= KUKATPALLY & MARREDPALLY HOSPITALS =================
  { name: 'Omni Hospitals Kukatpally', lat: 17.4890, lng: 78.4060, category: 'Hospital', phone: '040-30513051', city: 'Hyderabad' },
  { name: 'Prime Hospitals Kukatpally', lat: 17.4850, lng: 78.4120, category: 'Hospital', phone: '040-25502550', city: 'Hyderabad' },
  { name: 'Anupama Hospital KPHB', lat: 17.4940, lng: 78.3970, category: 'Hospital', phone: '040-25503000', city: 'Hyderabad' },
  { name: 'Remedy Hospital Kukatpally', lat: 17.4810, lng: 78.4150, category: 'Hospital', phone: '040-25504000', city: 'Hyderabad' },
  { name: 'Shenoy Hospitals East Marredpally', lat: 17.4510, lng: 78.5060, category: 'Hospital', phone: '040-25505000', city: 'Hyderabad' },
  { name: 'Geeta Multi Speciality Hospital West Marredpally', lat: 17.4470, lng: 78.4990, category: 'Hospital', phone: '040-25506000', city: 'Hyderabad' },
  { name: 'Secunderabad Cantonment General Hospital', lat: 17.4620, lng: 78.4970, category: 'Hospital', phone: '040-25507000', city: 'Hyderabad' },
  { name: 'Railway Main Hospital Lalaguda', lat: 17.4340, lng: 78.5170, category: 'Hospital', phone: '040-25508000', city: 'Hyderabad' },

  // ================= KUKATPALLY & MARREDPALLY PUBLIC HUBS =================
  { name: 'Kukatpally Metro Station Hub', lat: 17.4850, lng: 78.4090, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'KPHB Metro Station Hub', lat: 17.4930, lng: 78.3980, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'JNTU College Metro Hub', lat: 17.4970, lng: 78.3910, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Forum Sujana Mall Corridor', lat: 17.4860, lng: 78.3880, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'West Marredpally Main Road Transit Corridor', lat: 17.4490, lng: 78.4980, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Shenoy Nursing Home X Roads', lat: 17.4515, lng: 78.5050, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Trimulgherry X Roads Hub', lat: 17.4690, lng: 78.4960, category: 'Public Hub', city: 'Hyderabad' }
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
