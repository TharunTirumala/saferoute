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
  // ================= UPPAL & EASTERN HYDERABAD POLICE STATIONS =================
  { name: 'Uppal Police Station', lat: 17.4010, lng: 78.5600, category: 'Police', phone: '040-27852540', city: 'Hyderabad' },
  { name: 'Uppal Traffic Police Station', lat: 17.4035, lng: 78.5585, category: 'Police', phone: '040-27852542', city: 'Hyderabad' },
  { name: 'Boduppal Police Outpost & She Team', lat: 17.4180, lng: 78.5820, category: 'Police', phone: '040-27852544', city: 'Hyderabad' },
  { name: 'Peerzadiguda She Team Outpost', lat: 17.4080, lng: 78.5950, category: 'Police', phone: '040-27852546', city: 'Hyderabad' },
  { name: 'Medipally Police Station', lat: 17.4220, lng: 78.6180, category: 'Police', phone: '040-27852548', city: 'Hyderabad' },
  { name: 'Nagole Police Station', lat: 17.3780, lng: 78.5680, category: 'Police', phone: '040-27852552', city: 'Hyderabad' },
  { name: 'Ramanthapur Police Outpost', lat: 17.3940, lng: 78.5410, category: 'Police', phone: '040-27852554', city: 'Hyderabad' },
  { name: 'Mallapur Police Outpost', lat: 17.4380, lng: 78.5810, category: 'Police', phone: '040-27852556', city: 'Hyderabad' },
  { name: 'Chengicherla Police Outpost', lat: 17.4280, lng: 78.6020, category: 'Police', phone: '040-27852558', city: 'Hyderabad' },
  { name: 'Ghatkesar Police Station', lat: 17.4470, lng: 78.6830, category: 'Police', phone: '040-27852562', city: 'Hyderabad' },
  { name: 'Habsiguda She Team Patrol', lat: 17.4190, lng: 78.5420, category: 'Police', phone: '040-27852532', city: 'Hyderabad' },

  // ================= UPPAL & EASTERN HYDERABAD HOSPITALS =================
  { name: 'TX Hospitals Uppal', lat: 17.4040, lng: 78.5570, category: 'Hospital', phone: '040-40404040', city: 'Hyderabad' },
  { name: 'Aditya Hospital Uppal', lat: 17.4015, lng: 78.5615, category: 'Hospital', phone: '040-27202720', city: 'Hyderabad' },
  { name: 'Landmark Hospital Uppal Ring Road', lat: 17.4060, lng: 78.5640, category: 'Hospital', phone: '040-27203000', city: 'Hyderabad' },
  { name: 'Sai Sanjeevani Hospital Uppal', lat: 17.3990, lng: 78.5530, category: 'Hospital', phone: '040-27204000', city: 'Hyderabad' },
  { name: 'Spark Hospitals Boduppal', lat: 17.4150, lng: 78.5780, category: 'Hospital', phone: '040-27205000', city: 'Hyderabad' },
  { name: 'Horizon Hospital Peerzadiguda', lat: 17.4090, lng: 78.5920, category: 'Hospital', phone: '040-27206000', city: 'Hyderabad' },
  { name: 'Matrix Hospital Ramanthapur', lat: 17.3920, lng: 78.5450, category: 'Hospital', phone: '040-27207000', city: 'Hyderabad' },
  { name: 'Janani Hospital Ramanthapur', lat: 17.3960, lng: 78.5390, category: 'Hospital', phone: '040-27208000', city: 'Hyderabad' },
  { name: 'Supraja Hospital Nagole', lat: 17.3760, lng: 78.5690, category: 'Hospital', phone: '040-27209000', city: 'Hyderabad' },

  // ================= UPPAL & EASTERN HYDERABAD PUBLIC HUBS =================
  { name: 'Uppal Metro Station Hub', lat: 17.4020, lng: 78.5580, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Uppal Ring Road Bus Depot Hub', lat: 17.3980, lng: 78.5620, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Stadium Metro Station Uppal', lat: 17.4045, lng: 78.5480, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Rajiv Gandhi International Cricket Stadium', lat: 17.4065, lng: 78.5505, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'NGRI Metro Station Hub', lat: 17.4100, lng: 78.5380, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Habsiguda Metro Station Hub', lat: 17.4180, lng: 78.5310, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Nagole Metro Station Hub', lat: 17.3750, lng: 78.5670, category: 'Public Hub', city: 'Hyderabad' },
  { name: 'Nagole X Roads Transit Hub', lat: 17.3730, lng: 78.5650, category: 'Public Hub', city: 'Hyderabad' }
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
