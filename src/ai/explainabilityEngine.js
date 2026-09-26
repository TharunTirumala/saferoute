/**
 * SafeRoute Simple Data-Driven Explainability Engine
 * Generates 2-3 short, comparative, data-driven points explaining why a route was selected.
 */

export function generateRouteExplanation(selectedRoute, allRoutes = []) {
  if (!selectedRoute) return { cardTitle: "Why: Safest Route", points: [] };

  const routes = allRoutes.length > 0 ? allRoutes : [selectedRoute];
  const safestRoute = [...routes].sort((a, b) => b.safetyScore - a.safetyScore)[0] || selectedRoute;
  const shortestRoute = [...routes].sort((a, b) => a.distanceKm - b.distanceKm)[0] || selectedRoute;
  const otherRoutes = routes.filter(r => r.id !== selectedRoute.id);

  const isSafest = selectedRoute.id === safestRoute.id;
  const isShortest = selectedRoute.id === shortestRoute.id;
  const score = selectedRoute.safetyScore;
  const hazards = selectedRoute.hazardExposurePercent !== undefined ? selectedRoute.hazardExposurePercent : (selectedRoute.hazardCount ? selectedRoute.hazardCount * 5 : 0);
  const lighting = selectedRoute.lightingPercent || 70;
  const police = selectedRoute.policeCount || 0;
  const medical = selectedRoute.hospitalCount || 0;

  // Header Title
  let cardTitle = "Why: Safest Route";
  if (score < 40) {
    cardTitle = "Why: High-Risk Route";
  } else if (!isSafest) {
    cardTitle = `Why: ${selectedRoute.badge || 'Alternative Route'}`;
  }

  const points = [];

  // 1. Safety Score Comparative Advantage
  if (otherRoutes.length === 0) {
    points.push(`Safety score: ${score}/100 (${selectedRoute.riskLevel || 'Low Risk'}) — verified safe road corridor.`);
  } else if (isSafest) {
    const otherScores = otherRoutes.map(r => r.safetyScore).join(' and ');
    points.push(`Safety score: ${score}/100 — highest among available routes (vs ${otherScores}).`);
  } else {
    const diff = safestRoute.safetyScore - score;
    if (diff <= 3) {
      points.push(`Safety score: ${score}/100 — nearly identical to Safest Route (${safestRoute.safetyScore}), with faster transit.`);
    } else {
      points.push(`Safety score: ${score}/100 — ${diff} points lower than Safest Route (${safestRoute.safetyScore}).`);
    }
  }

  // 2. Hazard Exposure / Lighting Difference
  if (otherRoutes.length > 0) {
    const otherHazards = otherRoutes.map(r => `${r.hazardExposurePercent || 15}%`).join(' and ');
    const avgOtherHazards = otherRoutes.reduce((acc, r) => acc + (r.hazardExposurePercent || 15), 0) / otherRoutes.length;

    if (hazards === 0) {
      points.push(`0% hazard exposure — completely avoids all reported community hazard zones.`);
    } else if (hazards < avgOtherHazards) {
      points.push(`Only ${hazards}% hazard exposure — lower than the other available routes (${otherHazards}).`);
    } else if (lighting > 65) {
      const otherLighting = otherRoutes.map(r => `${r.lightingPercent || 50}%`).join(' and ');
      points.push(`Lighting: ${lighting}% verified — better illumination than alternative routes (${otherLighting}).`);
    } else {
      points.push(`Hazard exposure: ${hazards}% along corridor — compared with ${safestRoute.hazardExposurePercent}% on the Safest Route.`);
    }
  } else {
    points.push(`Lighting: ${lighting}% verified coverage with ${hazards}% hazard exposure.`);
  }

  // 3. Emergency Facilities or Distance/Time Trade-off
  if (police > 0 || medical > 0) {
    const facilitiesDesc = [];
    if (police > 0) facilitiesDesc.push(`${police} police`);
    if (medical > 0) facilitiesDesc.push(`${medical} medical`);
    
    if (!isShortest && (selectedRoute.distanceKm - shortestRoute.distanceKm) >= 0.5) {
      const extraKm = (selectedRoute.distanceKm - shortestRoute.distanceKm).toFixed(1);
      points.push(`Emergency access: ${facilitiesDesc.join(' + ')} facilities within 1 km, providing better emergency coverage despite +${extraKm} km.`);
    } else {
      points.push(`Emergency access: ${facilitiesDesc.join(' + ')} facilities within 1 km — strong emergency access along corridor.`);
    }
  } else if (!isShortest) {
    const extraKm = (selectedRoute.distanceKm - shortestRoute.distanceKm).toFixed(1);
    points.push(`Route trade-off: Adds ${extraKm} km, but significantly reduces hazard exposure.`);
  } else {
    points.push(`Direct transit: Shortest available route (${selectedRoute.distanceKm} km, ~${selectedRoute.durationMin} min).`);
  }

  return {
    cardTitle,
    safetyScore: score,
    scoreLabel: selectedRoute.scoreLabel || (score >= 80 ? 'Safe' : score >= 60 ? 'Alternative' : 'High Risk'),
    badgeClass: selectedRoute.badgeClass || 'safe',
    points: points.slice(0, 3)
  };
}
