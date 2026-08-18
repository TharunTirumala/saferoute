// AI Report Classifier: Heuristic NLP for automatic hazard category & severity detection
export class AIReportClassifier {
  static classifyText(text) {
    if (!text || text.trim().length === 0) {
      return { category: 'Other', severity: 'Medium', confidence: 0.5 };
    }

    const lower = text.toLowerCase();

    // Keywords mapping
    const patterns = [
      {
        category: 'Poor street lighting',
        keywords: ['dark', 'lighting', 'streetlight', 'lamp', 'pitch dark', 'no light', 'blackout', 'dim', 'shadow'],
        defaultSeverity: 'High'
      },
      {
        category: 'Harassment',
        keywords: ['harass', 'stalk', 'catcall', 'eve teasing', 'followed', 'grop', 'threat', 'unsafe men', 'comment'],
        defaultSeverity: 'Critical'
      },
      {
        category: 'Suspicious activity',
        keywords: ['suspicious', 'loiter', 'drunk', 'gambling', 'drugs', 'weapon', 'snatch', 'thief', 'robbery'],
        defaultSeverity: 'High'
      },
      {
        category: 'Isolated area',
        keywords: ['isolated', 'deserted', 'empty', 'no people', 'abandoned', 'forest', 'alley', 'remote', 'quiet'],
        defaultSeverity: 'Medium'
      },
      {
        category: 'Accident-prone area',
        keywords: ['accident', 'speeding', 'crash', 'blind turn', 'divider', 'collision', 'dangerous crossing'],
        defaultSeverity: 'High'
      },
      {
        category: 'Road damage',
        keywords: ['pothole', 'broken road', 'waterlogging', 'construction', 'debris', 'drain', 'damage'],
        defaultSeverity: 'Low'
      },
      {
        category: 'No public activity',
        keywords: ['closed shops', 'commercial shut', 'no transit', 'no bus', 'dead zone'],
        defaultSeverity: 'Medium'
      }
    ];

    let bestMatch = null;
    let maxHits = 0;

    for (const p of patterns) {
      let hits = 0;
      for (const kw of p.keywords) {
        if (lower.includes(kw)) hits++;
      }
      if (hits > maxHits) {
        maxHits = hits;
        bestMatch = p;
      }
    }

    if (bestMatch && maxHits > 0) {
      let detectedSeverity = bestMatch.defaultSeverity;
      if (lower.includes('severe') || lower.includes('dangerous') || lower.includes('critical') || lower.includes('emergency') || lower.includes('violence')) {
        detectedSeverity = 'Critical';
      } else if (lower.includes('minor') || lower.includes('slight') || lower.includes('small')) {
        detectedSeverity = 'Low';
      }

      return {
        category: bestMatch.category,
        severity: detectedSeverity,
        confidence: Math.min(0.95, 0.6 + maxHits * 0.15)
      };
    }

    return {
      category: 'Other',
      severity: 'Medium',
      confidence: 0.5
    };
  }
}
