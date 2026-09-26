// Central SafeRoute Safety Scoring Configuration & Weights
export const SAFETY_CONFIG = {
  // Weights (Must sum to 1.0)
  weights: {
    streetLighting: 0.25,        // 25% Street lighting quality
    unsafeAreaReports: 0.30,     // 30% Verified & community danger reports (Strong penalty for danger hotspots)
    policePresence: 0.15,        // 15% Police station proximity (within 1.2km)
    emergencyFacilities: 0.10,   // 10% Hospital & 24/7 medical centers
    publicActivity: 0.10,        // 10% Commercial hubs, transit, foot traffic
    roadCondition: 0.05,         // 5% Arterial highway vs narrow isolated corridors
    timeDecayFactor: 0.05        // 5% Day/night time-aware factor
  },

  // Recency Decay Half-Life for Community Reports (in days)
  recencyDecayDays: 30,

  // Proximity Thresholds (in kilometers)
  thresholds: {
    policeEffectiveRadiusKm: 1.2,
    hospitalEffectiveRadiusKm: 1.5,
    publicHubEffectiveRadiusKm: 1.0,
    reportProximityBufferKm: 1.0,
    routeDeviationMeters: 65     // Alert if user moves > 65m away from planned polyline
  },

  // Score Categorization Brackets (0 - 100)
  // 🟢 SAFE: 80–100
  // 🔵 MODERATE / SAFE ALTERNATIVE: 60–79
  // 🟡 CAUTION: 40–59
  // 🔴 HIGH RISK: 0–39
  scoreBrackets: [
    { min: 80, max: 100, label: "Safe",             badgeClass: "safe",        riskLevel: "LOW RISK / SAFE",         color: "#16a34a" },
    { min: 60, max: 79,  label: "Safe Alternative", badgeClass: "balanced",    riskLevel: "MODERATE / ALTERNATIVE",  color: "#2563eb" },
    { min: 40, max: 59,  label: "Caution",          badgeClass: "caution",     riskLevel: "CAUTION / BALANCED",      color: "#d97706" },
    { min: 0,  max: 39,  label: "High Risk",        badgeClass: "higher_risk", riskLevel: "HIGH RISK / DO NOT RECOMMEND", color: "#dc2626" }
  ]
};

export function getScoreMetadata(score) {
  const rounded = Math.max(0, Math.min(100, Math.round(score)));
  for (const b of SAFETY_CONFIG.scoreBrackets) {
    if (rounded >= b.min && rounded <= b.max) {
      return { ...b, score: rounded };
    }
  }
  return { ...SAFETY_CONFIG.scoreBrackets[SAFETY_CONFIG.scoreBrackets.length - 1], score: rounded };
}
