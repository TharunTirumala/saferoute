/**
 * SafeRoute Feature 2: Smart News Reader (Contextual NLP Headline Processor)
 * Comprehends safety news headlines by extracting:
 * 1. Location Entities (WHERE)
 * 2. Crime Type & Severity Index (WHAT)
 * 3. Temporal Context (WHEN)
 * 4. Urgency & Sentiment Signals (SERIOUSNESS)
 * 5. Positive Police Deployment Signals (REMEDIATION)
 */

export class SmartNewsReader {
  constructor() {
    this.knownLocations = [
      "Charminar", "Banjara Hills", "Hitech City", "Gachibowli", "Begumpet", "Jubilee Hills",
      "Indiranagar", "MG Road", "Silk Board", "Connaught Place", "Saket", "BKC", "Bandra"
    ];

    this.crimeKeywords = {
      'eve teasing': 0.25,
      'harassment': 0.25,
      'snatching': 0.50,
      'theft': 0.40,
      'stalking': 0.60,
      'molestation': 0.75,
      'assault': 0.80,
      'domestic violence': 0.85,
      'kidnapping': 0.95,
      'unsafe feeling': 0.30
    };

    this.timeIndicators = {
      'night': 1.30,
      'after dark': 1.30,
      'late evening': 1.20,
      'midnight': 1.35,
      'early morning': 1.10,
      'daytime': 0.85,
      'morning': 0.90
    };

    this.urgencyWords = ['avoid', 'dangerous', 'unsafe', 'multiple incidents', 'reports', 'complaints', 'warning'];
    this.positiveActionWords = ['police increase patrols', 'patrols increased', 'she team kiosk', 'cctv installed', 'suspect arrested', 'patrol booth'];

    // Pre-loaded Demo Headlines for Hackathon Testing
    this.sampleHeadlines = [
      "Women avoid Charminar area after dark following multiple snatching incidents near Railway Station",
      "Police increase patrols in Banjara Hills after assault reports near commercial strip",
      "Women feel unsafe walking alone in Gachibowli IT corridor late evenings due to unlit stretch",
      "She Team Kiosk and CCTV cameras installed at Hitech City Metro Station to boost night safety"
    ];
  }

  /**
   * Process a single headline with contextual NLP
   * @param {string} headline 
   * @returns {Object} Structured NLP extraction payload
   */
  analyzeHeadline(headline) {
    if (!headline || typeof headline !== 'string') return null;

    const textLower = headline.toLowerCase();

    // 1. Extract Locations (WHERE)
    const locationsFound = [];
    for (const loc of this.knownLocations) {
      if (textLower.includes(loc.toLowerCase())) {
        locationsFound.append ? locationsFound.append(loc) : locationsFound.push(loc);
      }
    }
    // Fallback location if none matched explicitly
    const targetLocations = locationsFound.length > 0 ? Array.from(new Set(locationsFound)) : ["Charminar"];

    // 2. Identify Crime Type & Max Severity (WHAT)
    const crimesFound = [];
    let maxCrimeSeverity = 0.0;
    for (const [crime, severity] of Object.entries(this.crimeKeywords)) {
      if (textLower.includes(crime)) {
        crimesFound.push(crime);
        if (severity > maxCrimeSeverity) maxCrimeSeverity = severity;
      }
    }
    if (crimesFound.length === 0) {
      crimesFound.push("general safety concern");
      maxCrimeSeverity = 0.30;
    }

    // 3. Detect Temporal Context (WHEN)
    let timeFactor = 1.0;
    let detectedTimeContext = "Standard Hours";
    for (const [timeInd, factor] of Object.entries(this.timeIndicators)) {
      if (textLower.includes(timeInd)) {
        if (factor > timeFactor) {
          timeFactor = factor;
          detectedTimeContext = timeInd;
        }
      }
    }

    // 4. Detect Urgency / Alarm Signals (SERIOUSNESS)
    let urgencyCount = 0;
    for (const uWord of this.urgencyWords) {
      if (textLower.includes(uWord)) urgencyCount++;
    }
    const urgencyFactor = parseFloat((Math.min(1.50, 1.0 + (urgencyCount * 0.15))).toFixed(2));

    // 5. Detect Positive Police / Remediation Actions (REMEDIATION)
    let isPositiveAction = false;
    let positiveActionDesc = "";
    for (const pWord of this.positiveActionWords) {
      if (textLower.includes(pWord)) {
        isPositiveAction = true;
        positiveActionDesc = pWord;
        break;
      }
    }

    // 6. Calculate Final Risk Delta & Score Impact
    let baseImpact = maxCrimeSeverity * timeFactor * urgencyFactor;
    let finalRiskImpact = parseFloat((Math.min(0.95, baseImpact * 0.45)).toFixed(2));

    if (isPositiveAction) {
      finalRiskImpact = parseFloat((-0.12).toFixed(2)); // Police patrol lowers risk!
    }

    const initialNewsRisk = 0.15;
    const newLocationRisk = parseFloat(Math.min(0.95, Math.max(0.05, initialNewsRisk + finalRiskImpact)).toFixed(2));

    return {
      headline,
      locationsFound: targetLocations,
      crimesFound,
      maxCrimeSeverity: parseFloat(maxCrimeSeverity.toFixed(2)),
      detectedTimeContext,
      timeFactor,
      urgencyFactor,
      isPositiveAction,
      positiveActionDesc,
      initialNewsRisk,
      newLocationRisk,
      riskDelta: finalRiskImpact > 0 ? `+${finalRiskImpact}` : `${finalRiskImpact}`,
      impactTag: isPositiveAction ? "POLICE RESPONSE (RISK DECREASED)" : "ACTIVE INCIDENT (RISK INCREASED)"
    };
  }
}

export const smartNewsReader = new SmartNewsReader();
