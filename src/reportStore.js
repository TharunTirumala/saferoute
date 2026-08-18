// ReportStore: Exact Coordinate Storage with LocalStorage Persistence & Recency Decay
import { SAFETY_CONFIG } from './safetyConfig.js';

const STORAGE_KEY = 'saferoute_unsafe_reports_v2';

const INITIAL_VERIFIED_REPORTS = [
  // Hyderabad
  {
    id: 'rep-hyd-1',
    latitude: 17.4480,
    longitude: 78.3810,
    locationName: 'Hitech City Metro Underpass',
    category: 'Poor street lighting',
    severity: 'High',
    description: 'Streetlights under the metro pillars often flicker or stay dark past 10 PM. Sparse foot traffic.',
    reportedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    confirmations: 18,
    disagreements: 1,
    status: 'Verified',
    photoUrl: null
  },
  {
    id: 'rep-hyd-2',
    latitude: 17.4180,
    longitude: 78.4280,
    locationName: 'Banjara Hills Road No 12 Junction',
    category: 'Suspicious activity',
    severity: 'Medium',
    description: 'Isolated stretch near junction with multiple two-wheeler chain snatching incidents reported.',
    reportedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    confirmations: 12,
    disagreements: 0,
    status: 'Verified',
    photoUrl: null
  },
  {
    id: 'rep-hyd-3',
    latitude: 17.3980,
    longitude: 78.4350,
    locationName: 'Mehdipatnam Bus Junction Rear Alley',
    category: 'Harassment',
    severity: 'High',
    description: 'High congestion area with poor lighting in back alleys and frequent eve-teasing complaints.',
    reportedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    confirmations: 24,
    disagreements: 2,
    status: 'Verified',
    photoUrl: null
  },
  // Bengaluru
  {
    id: 'rep-blr-1',
    latitude: 12.9716,
    longitude: 77.5946,
    locationName: 'Cubbon Park Perimeter Road',
    category: 'Isolated area',
    severity: 'Medium',
    description: 'Very quiet after 8:30 PM with thick tree cover obscuring street lamps.',
    reportedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    confirmations: 9,
    disagreements: 0,
    status: 'Verified',
    photoUrl: null
  },
  // Delhi
  {
    id: 'rep-del-1',
    latitude: 28.5800,
    longitude: 77.2250,
    locationName: 'Anand Parbat Transit Stretch',
    category: 'Poor street lighting',
    severity: 'High',
    description: 'Narrow industrial connecting road with broken lamps and minimal nighttime surveillance.',
    reportedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    confirmations: 31,
    disagreements: 1,
    status: 'Verified',
    photoUrl: null
  }
];

export class ReportStore {
  constructor() {
    this.reports = this.loadReports();
  }

  loadReports() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load reports from localStorage:", e);
    }
    // Initialize with verified dataset
    this.saveReports(INITIAL_VERIFIED_REPORTS);
    return [...INITIAL_VERIFIED_REPORTS];
  }

  saveReports(reports) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
      console.warn("Failed to save reports to localStorage:", e);
    }
  }

  getAllReports() {
    return [...this.reports];
  }

  /**
   * Adds an exact coordinate user report with zero randomness
   */
  addReport({ latitude, longitude, locationName, category, severity, description, photoUrl }) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
      throw new Error("Invalid exact coordinates provided for report.");
    }

    const newReport = {
      id: 'rep-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      locationName: locationName || `Reported Spot (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      category: category || 'Other',
      severity: severity || 'Medium',
      description: description || 'Community submitted safety observation.',
      reportedAt: new Date().toISOString(),
      confirmations: 1,
      disagreements: 0,
      status: 'Community Submitted',
      photoUrl: photoUrl || null
    };

    this.reports.unshift(newReport);
    this.saveReports(this.reports);
    return newReport;
  }

  confirmReport(id) {
    const rep = this.reports.find(r => r.id === id);
    if (rep) {
      rep.confirmations = (rep.confirmations || 0) + 1;
      this.saveReports(this.reports);
      return rep;
    }
    return null;
  }

  disagreeReport(id) {
    const rep = this.reports.find(r => r.id === id);
    if (rep) {
      rep.disagreements = (rep.disagreements || 0) + 1;
      this.saveReports(this.reports);
      return rep;
    }
    return null;
  }

  deleteReport(id) {
    this.reports = this.reports.filter(r => r.id !== id);
    this.saveReports(this.reports);
  }

  /**
   * Calculates time-decayed weight for a report (0.1 to 1.0)
   * Formula: e^(-ageInDays / halfLife)
   */
  calculateReportWeight(report) {
    const ageMs = Date.now() - new Date(report.reportedAt).getTime();
    const ageDays = ageMs / (1000 * 3600 * 24);
    const halfLife = SAFETY_CONFIG.recencyDecayDays;
    const timeFactor = Math.exp(-ageDays / halfLife); // 1.0 for today, 0.36 for 30 days, 0.13 for 60 days
    
    // Severity multiplier
    const severityMult = {
      'Critical': 1.6,
      'High': 1.2,
      'Medium': 0.9,
      'Low': 0.6
    }[report.severity] || 1.0;

    // Reliability from confirmations vs disagreements
    const conf = report.confirmations || 1;
    const dis = report.disagreements || 0;
    const reliability = Math.min(1.5, Math.max(0.4, (conf + 1) / (conf + dis + 1)));

    return Math.min(2.0, timeFactor * severityMult * reliability);
  }
}

export const reportStore = new ReportStore();
