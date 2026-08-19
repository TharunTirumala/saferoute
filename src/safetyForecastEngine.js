/**
 * SafeRoute Feature 1: Safety Forecast Engine (Predictive Risk Modeling)
 * Predicts location safety indices for +3 hours and +6 hours ahead based on:
 * - Time-of-Day Shift (Nightfall penalty: 8 PM - 5 AM)
 * - Day-of-Week Variation (Weekend social crowd / transit reduction penalty)
 * - Weather Forecast Impact (Precipitation & low visibility penalty)
 * - Market & Commercial Footfall Closing Hours
 */

export class SafetyForecastEngine {
  constructor() {
    this.weatherState = {
      isRaining: true,
      precipitationMm: 1.2,
      condition: "Light Rain Expected"
    };
  }

  /**
   * Predict risk score for a specific zone at +hoursAhead
   * @param {Object} currentData - { currentRiskScore: 0.38, zoneName: "Charminar" }
   * @param {number} hoursAhead - Hours in future (e.g. 3 or 6)
   * @returns {Object} Forecast prediction payload
   */
  predictRiskForecast(currentData = {}, hoursAhead = 3) {
    const baseScore = currentData.currentRiskScore !== undefined ? currentData.currentRiskScore : 0.38;
    const now = new Date();
    const futureHour = (now.getHours() + hoursAhead) % 24;
    const futureDay = (now.getDay() + Math.floor((now.getHours() + hoursAhead) / 24)) % 7;

    // 1. Time-of-Day Factor (8 PM - 5 AM is riskier due to darkness & reduced natural footfall)
    let timeFactor = 1.0;
    let timeLabel = "Daylight Hours";
    if (futureHour >= 20 || futureHour < 5) {
      timeFactor = 1.35; // 35% risk increase
      timeLabel = "Nightfall (8 PM - 5 AM)";
    } else if (futureHour >= 18 && futureHour < 20) {
      timeFactor = 1.15; // Dusk transition
      timeLabel = "Dusk / Sunset Transition";
    }

    // 2. Day-of-Week Factor (Friday/Saturday/Sunday nights have higher social footfall / reduced transit)
    let dayFactor = 1.0;
    let dayLabel = "Weekday";
    if (futureDay === 5 || futureDay === 6 || futureDay === 0) {
      dayFactor = 1.2; // 20% weekend penalty
      dayLabel = "Weekend Evening Traffic";
    }

    // 3. Weather Impact Factor (Rain increases shelter urgency & reduces natural footfall surveillance)
    let weatherFactor = 1.0;
    let weatherLabel = "Clear Skies";
    if (this.weatherState.isRaining || this.weatherState.precipitationMm > 0.5) {
      weatherFactor = 1.25; // 25% rain penalty
      weatherLabel = `Rain Forecast (${this.weatherState.precipitationMm}mm/hr)`;
    }

    // 4. Commercial Footfall Closing Factor (Markets closing past 9:30 PM reduces natural footfall)
    let marketClosingFactor = 1.0;
    if (futureHour >= 21 || futureHour < 4) {
      marketClosingFactor = 1.15;
    }

    // Calculate final predicted risk score (capped between 0.05 and 0.98)
    const rawPredicted = baseScore * timeFactor * dayFactor * weatherFactor * marketClosingFactor;
    const predictedRiskScore = Math.min(0.98, Math.max(0.05, parseFloat(rawPredicted.toFixed(2))));

    // Calculate Trend & Percentage Change
    const delta = parseFloat((predictedRiskScore - baseScore).toFixed(2));
    const percentChange = Math.round(((predictedRiskScore - baseScore) / Math.max(0.01, baseScore)) * 100);

    let trendStatus = "STABLE";
    let trendColor = "#f59e0b"; // Amber
    let trendIcon = "➡️";

    if (delta > 0.05) {
      trendStatus = "INCREASING RISK";
      trendColor = "#ef4444"; // Red
      trendIcon = "⬆️";
    } else if (delta < -0.05) {
      trendStatus = "IMPROVING SAFETY";
      trendColor = "#10b981"; // Green
      trendIcon = "⬇️";
    }

    // Generate Natural Language AI Forecast Summary
    const drivers = [];
    if (timeFactor > 1.0) drivers.push(`Time Shift: ${timeLabel} (+${Math.round((timeFactor - 1) * 100)}% risk)`);
    if (weatherFactor > 1.0) drivers.push(`Weather: ${weatherLabel} (+${Math.round((weatherFactor - 1) * 100)}% risk)`);
    if (dayFactor > 1.0) drivers.push(`Calendar: ${dayLabel} (+${Math.round((dayFactor - 1) * 100)}% risk)`);
    if (marketClosingFactor > 1.0) drivers.push(`Commercial Footfall: Night market closing reduces natural surveillance`);

    // Generate Hourly Trend Series (+0h to +6h)
    const hourlySeries = [];
    for (let h = 0; h <= 6; h++) {
      const hHour = (now.getHours() + h) % 24;
      let hTF = (hHour >= 20 || hHour < 5) ? 1.35 : (hHour >= 18 ? 1.15 : 1.0);
      let hVal = Math.min(0.98, Math.max(0.05, parseFloat((baseScore * hTF * weatherFactor).toFixed(2))));
      hourlySeries.push({
        hourLabel: `+${h}h (${hHour.toString().padStart(2, '0')}:00)`,
        score: hVal
      });
    }

    return {
      hoursAhead,
      currentRiskScore: baseScore,
      predictedRiskScore,
      delta,
      percentChange: percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`,
      trendStatus,
      trendColor,
      trendIcon,
      forecastDrivers: drivers.length > 0 ? drivers : ["Stable baseline environmental factors"],
      hourlySeries
    };
  }
}

export const safetyForecastEngine = new SafetyForecastEngine();
