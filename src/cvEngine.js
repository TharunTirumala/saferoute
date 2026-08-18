// Computer Vision Engine replicating YOLOv8 + Centroid Tracker + Gender/Emotion + SOS_Condition.py

export function calculateDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// Exact logic from SOS_Condition.py
export function isFemaleSurrounded(femaleBBox, maleBBoxes, thresholdDistance = 80) {
  let surroundingMenCount = 0;
  const femaleCenterX = (femaleBBox.x1 + femaleBBox.x2) / 2;
  const femaleCenterY = (femaleBBox.y1 + femaleBBox.y2) / 2;

  const nearbyDistances = [];

  for (const maleBBox of maleBBoxes) {
    const maleCenterX = (maleBBox.x1 + maleBBox.x2) / 2;
    const maleCenterY = (maleBBox.y1 + maleBBox.y2) / 2;

    const distance = Math.sqrt(
      (maleCenterX - femaleCenterX) ** 2 + (maleCenterY - femaleCenterY) ** 2
    );

    nearbyDistances.push({
      maleId: maleBBox.id,
      distance: Math.round(distance),
      maleCenter: { x: maleCenterX, y: maleCenterY },
      femaleCenter: { x: femaleCenterX, y: femaleCenterY },
      isDanger: distance < thresholdDistance,
    });

    if (distance < thresholdDistance) {
      surroundingMenCount++;
    }
  }

  return {
    isSurrounded: surroundingMenCount >= 3,
    surroundingCount: surroundingMenCount,
    distances: nearbyDistances,
  };
}

export class ScenarioRunner {
  constructor() {
    this.persons = [];
    this.scenarioType = 'threat_surrounded'; // 'threat_surrounded', 'lone_night', 'safe_plaza', 'custom'
    this.isNight = false;
    this.thresholdDistance = 90; // Scaled for canvas resolution
    this.timeOfDay = '23:42:15';
    this.lastAlertTime = 0;
    this.cooldownSeconds = 15; // 15s in demo for faster feedback (60s in original)
    this.nightVision = false;
  }

  setScenario(type) {
    this.scenarioType = type;
    const now = new Date();
    
    if (type === 'threat_surrounded') {
      this.isNight = true;
      this.timeOfDay = '23:48:12';
      this.persons = [
        {
          id: 1,
          gender: 'Female',
          genderConf: 0.96,
          emotion: 'Fear',
          pose: 'Walking',
          x: 420,
          y: 240,
          w: 64,
          h: 140,
          vx: 0.2,
          vy: 0.1,
          trackHistory: [],
          targetX: 430,
          targetY: 250,
          baseX: 420,
          baseY: 240,
        },
        {
          id: 2,
          gender: 'Male',
          genderConf: 0.94,
          emotion: 'Neutral',
          pose: 'Walking',
          x: 350,
          y: 220,
          w: 70,
          h: 150,
          vx: 0.4,
          vy: 0.2,
          trackHistory: [],
          targetX: 375,
          targetY: 235,
          baseX: 350,
          baseY: 220,
        },
        {
          id: 3,
          gender: 'Male',
          genderConf: 0.91,
          emotion: 'Neutral',
          pose: 'Standing',
          x: 485,
          y: 215,
          w: 70,
          h: 148,
          vx: -0.3,
          vy: 0.15,
          trackHistory: [],
          targetX: 465,
          targetY: 235,
          baseX: 485,
          baseY: 215,
        },
        {
          id: 4,
          gender: 'Male',
          genderConf: 0.89,
          emotion: 'Neutral',
          pose: 'Walking',
          x: 425,
          y: 310,
          w: 68,
          h: 146,
          vx: -0.1,
          vy: -0.3,
          trackHistory: [],
          targetX: 422,
          targetY: 285,
          baseX: 425,
          baseY: 310,
        },
      ];
    } else if (type === 'lone_night') {
      this.isNight = true;
      this.timeOfDay = '01:15:30';
      this.persons = [
        {
          id: 1,
          gender: 'Female',
          genderConf: 0.95,
          emotion: 'Neutral',
          pose: 'Walking',
          x: 400,
          y: 230,
          w: 64,
          h: 140,
          vx: 1.2,
          vy: 0.2,
          trackHistory: [],
          targetX: 700,
          targetY: 260,
          baseX: 400,
          baseY: 230,
        },
      ];
    } else if (type === 'safe_plaza') {
      this.isNight = false;
      this.timeOfDay = '14:22:08';
      this.persons = [
        {
          id: 1,
          gender: 'Female',
          genderConf: 0.94,
          emotion: 'Happy',
          pose: 'Walking',
          x: 220,
          y: 200,
          w: 64,
          h: 140,
          vx: 0.8,
          vy: 0.3,
          trackHistory: [],
          targetX: 380,
          targetY: 240,
          baseX: 220,
          baseY: 200,
        },
        {
          id: 2,
          gender: 'Female',
          genderConf: 0.92,
          emotion: 'Happy',
          pose: 'Walking',
          x: 270,
          y: 210,
          w: 64,
          h: 140,
          vx: 0.8,
          vy: 0.25,
          trackHistory: [],
          targetX: 430,
          targetY: 250,
          baseX: 270,
          baseY: 210,
        },
        {
          id: 3,
          gender: 'Male',
          genderConf: 0.95,
          emotion: 'Neutral',
          pose: 'Standing',
          x: 620,
          y: 230,
          w: 70,
          h: 148,
          vx: -0.2,
          vy: 0.1,
          trackHistory: [],
          targetX: 580,
          targetY: 240,
          baseX: 620,
          baseY: 230,
        },
        {
          id: 4,
          gender: 'Male',
          genderConf: 0.91,
          emotion: 'Neutral',
          pose: 'Walking',
          x: 740,
          y: 190,
          w: 68,
          h: 145,
          vx: -0.6,
          vy: 0.4,
          trackHistory: [],
          targetX: 550,
          targetY: 290,
          baseX: 740,
          baseY: 190,
        },
      ];
    } else if (type === 'custom') {
      // Interactive Sandbox with 1 female and 3 moveable men
      this.isNight = false;
      this.timeOfDay = '19:30:00';
      this.persons = [
        {
          id: 1,
          gender: 'Female',
          genderConf: 0.97,
          emotion: 'Fear',
          pose: 'Walking',
          x: 400,
          y: 220,
          w: 64,
          h: 140,
          vx: 0,
          vy: 0,
          trackHistory: [],
          targetX: 400,
          targetY: 220,
          baseX: 400,
          baseY: 220,
        },
        {
          id: 2,
          gender: 'Male',
          genderConf: 0.93,
          emotion: 'Neutral',
          pose: 'Standing',
          x: 280,
          y: 200,
          w: 70,
          h: 148,
          vx: 0,
          vy: 0,
          trackHistory: [],
          targetX: 280,
          targetY: 200,
          baseX: 280,
          baseY: 200,
        },
        {
          id: 3,
          gender: 'Male',
          genderConf: 0.90,
          emotion: 'Neutral',
          pose: 'Standing',
          x: 540,
          y: 180,
          w: 70,
          h: 148,
          vx: 0,
          vy: 0,
          trackHistory: [],
          targetX: 540,
          targetY: 180,
          baseX: 540,
          baseY: 180,
        },
        {
          id: 4,
          gender: 'Male',
          genderConf: 0.88,
          emotion: 'Neutral',
          pose: 'Standing',
          x: 410,
          y: 350,
          w: 68,
          h: 146,
          vx: 0,
          vy: 0,
          trackHistory: [],
          targetX: 410,
          targetY: 350,
          baseX: 410,
          baseY: 350,
        },
      ];
    }
  }

  update(delta = 1) {
    // Animate persons with smooth subtle wandering or path following
    for (const p of this.persons) {
      if (this.scenarioType !== 'custom') {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2) {
          p.x += (dx / dist) * Math.abs(p.vx) * 0.8 * delta;
          p.y += (dy / dist) * Math.abs(p.vy) * 0.8 * delta;
        } else {
          // Change wander target slightly around base
          if (this.scenarioType === 'threat_surrounded') {
            if (p.gender === 'Female') {
              p.targetX = p.baseX + (Math.sin(Date.now() / 1200) * 20);
              p.targetY = p.baseY + (Math.cos(Date.now() / 1400) * 15);
            } else {
              // Men close in or hover closely around the female
              const female = this.persons.find((x) => x.gender === 'Female');
              if (female) {
                const angleOffset = p.id * 2.1;
                const radius = 55 + Math.sin(Date.now() / 1000 + p.id) * 15;
                p.targetX = female.x + Math.cos(Date.now() / 1800 + angleOffset) * radius;
                p.targetY = female.y + Math.sin(Date.now() / 1800 + angleOffset) * (radius * 0.7);
              }
            }
          } else if (this.scenarioType === 'lone_night') {
            p.targetX = p.x > 800 ? 100 : 820;
            p.targetY = 220 + Math.sin(Date.now() / 2000) * 40;
          } else if (this.scenarioType === 'safe_plaza') {
            p.targetX = p.baseX + (Math.sin(Date.now() / 2500 + p.id) * 60);
            p.targetY = p.baseY + (Math.cos(Date.now() / 2200 + p.id) * 35);
          }
        }
      }

      // Record track history for centroid tracking trail
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      p.trackHistory.push({ x: cx, y: cy });
      if (p.trackHistory.length > 20) {
        p.trackHistory.shift();
      }
    }
  }

  evaluateState() {
    const totalCount = this.persons.length;
    const femalePersons = this.persons.filter((p) => p.gender === 'Female');
    const malePersons = this.persons.filter((p) => p.gender === 'Male');

    const femaleCount = femalePersons.length;
    const maleCount = malePersons.length;

    let trigger = null;
    let threatLevel = 'SAFE'; // 'SAFE', 'ELEVATED', 'CRITICAL'
    let threatPercentage = 15;
    let reason = 'Normal activity detected. All parameters within safe margins.';
    let surroundingResult = { isSurrounded: false, surroundingCount: 0, distances: [] };

    // Format BBoxes
    const femaleBBoxes = femalePersons.map((p) => ({
      id: p.id,
      x1: p.x,
      y1: p.y,
      x2: p.x + p.w,
      y2: p.y + p.h,
    }));

    const maleBBoxes = malePersons.map((p) => ({
      id: p.id,
      x1: p.x,
      y1: p.y,
      x2: p.x + p.w,
      y2: p.y + p.h,
    }));

    if (femaleCount === 1) {
      const female = femalePersons[0];
      const femaleBBox = femaleBBoxes[0];

      surroundingResult = isFemaleSurrounded(femaleBBox, maleBBoxes, this.thresholdDistance);

      // Check Threat 1: Surrounded + Fear Emotion
      const isDistressed = female.emotion === 'Fear' || female.emotion === 'Sad';
      
      if (totalCount > 2 && isDistressed && surroundingResult.isSurrounded) {
        threatLevel = 'CRITICAL';
        threatPercentage = 96;
        trigger = 'SURROUNDED_THREAT';
        reason = `CRITICAL ALERT: Lone female surrounded by ${surroundingResult.surroundingCount} men within ${this.thresholdDistance}px radius with [${female.emotion}] distress emotion!`;
      } else if (surroundingResult.surroundingCount >= 2) {
        threatLevel = 'ELEVATED';
        threatPercentage = 68;
        reason = `CAUTION: ${surroundingResult.surroundingCount} individuals in close proximity to female (${Math.round(surroundingResult.distances[0]?.distance || 0)}px). Monitoring emotions...`;
      } else if (this.isNight && totalCount === 1) {
        // Check Threat 2: Lone female at night
        threatLevel = 'ELEVATED';
        threatPercentage = 75;
        trigger = 'LONE_NIGHT_THREAT';
        reason = 'ALERT: Lone female detected in sector during late night hours (22:00 - 06:00).';
      }
    }

    return {
      totalCount,
      femaleCount,
      maleCount,
      threatLevel,
      threatPercentage,
      trigger,
      reason,
      surroundingResult,
      isNight: this.isNight,
    };
  }
}
