// Tactical Computer Vision CCTV Canvas Renderer

export function renderCCTV(ctx, runner, state, canvasWidth, canvasHeight, isDragging = false, draggedPerson = null) {
  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Draw Environmental Background
  drawEnvironment(ctx, runner, canvasWidth, canvasHeight);

  // 2. Draw Distance Vectors & Proximity Danger Zone
  drawProximityVectors(ctx, runner, state);

  // 3. Draw Detected Persons (Bounding boxes, Centroids, Skeletons, Labels)
  for (const person of runner.persons) {
    drawPerson(ctx, person, runner, state, isDragging && draggedPerson === person);
  }

  // 4. Draw Camera HUD & Telemetry Overlays
  drawCCTVHud(ctx, runner, state, canvasWidth, canvasHeight);

  ctx.restore();
}

function drawEnvironment(ctx, runner, w, h) {
  // Ambient floor & perspective lines
  if (runner.isNight) {
    // Night asphalt / urban alley
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.45, '#0f172a');
    bgGrad.addColorStop(1, '#080c14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Streetlamp cones
    drawStreetlampLight(ctx, 420, 0, 420, 260, 240);
    drawStreetlampLight(ctx, 160, 0, 160, 240, 180);
    drawStreetlampLight(ctx, 720, 0, 720, 250, 190);
  } else {
    // Daytime public plaza
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(0.45, '#334155');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Daylight ambient grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  // Ground perspective tiles / walkway lines
  ctx.strokeStyle = runner.isNight ? 'rgba(56, 189, 248, 0.06)' : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const horizon = h * 0.45;

  // Horizon line
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(w, horizon);
  ctx.stroke();

  // Perspective lines to vanishing point
  const vpX = w / 2;
  const vpY = horizon;
  for (let x = -200; x <= w + 200; x += 120) {
    ctx.beginPath();
    ctx.moveTo(vpX, vpY);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Horizontal paving intervals
  for (let y = horizon + 30; y < h; y += (y - horizon) * 0.4 + 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Night Vision phosphor filter if enabled
  if (runner.nightVision) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
    ctx.fillRect(0, 0, w, h);
  }
}

function drawStreetlampLight(ctx, x1, y1, x2, y2, radius) {
  ctx.save();
  const grad = ctx.createRadialGradient(x2, y2, 20, x2, y2, radius);
  grad.addColorStop(0, 'rgba(254, 240, 138, 0.15)');
  grad.addColorStop(0.6, 'rgba(254, 240, 138, 0.04)');
  grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x2, y2, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawProximityVectors(ctx, runner, state) {
  const female = runner.persons.find((p) => p.gender === 'Female');
  if (!female) return;

  const fcx = female.x + female.w / 2;
  const fcy = female.y + female.h / 2;

  // Draw Safety Distance Radius Circle around female
  ctx.save();
  const isSurrounded = state.surroundingResult.isSurrounded;
  const radius = runner.thresholdDistance;

  ctx.beginPath();
  ctx.arc(fcx, fcy, radius, 0, Math.PI * 2);
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = isSurrounded ? 'rgba(239, 68, 68, 0.8)' : 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = isSurrounded ? 2.5 : 1.5;
  ctx.stroke();

  // Subtle radius fill
  ctx.fillStyle = isSurrounded ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.04)';
  ctx.fill();
  ctx.setLineDash([]);
  ctx.restore();

  // Draw Euclidean distance connecting lines for each male
  for (const d of state.surroundingResult.distances) {
    const isDanger = d.isDanger;
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(d.femaleCenter.x, d.femaleCenter.y);
    ctx.lineTo(d.maleCenter.x, d.maleCenter.y);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isDanger ? '#ef4444' : 'rgba(148, 163, 184, 0.6)';
    ctx.lineWidth = isDanger ? 2 : 1;
    ctx.stroke();

    // Distance Label Pill at midpoint
    const midX = (d.femaleCenter.x + d.maleCenter.x) / 2;
    const midY = (d.femaleCenter.y + d.maleCenter.y) / 2;

    const labelText = `d = ${d.distance}px ${isDanger ? '⚠️ (< threshold)' : '✓'}`;
    ctx.font = '10px "JetBrains Mono", monospace';
    const textWidth = ctx.measureText(labelText).width;

    ctx.fillStyle = isDanger ? 'rgba(185, 28, 28, 0.9)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isDanger ? '#f87171' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    const padX = 6;
    const padY = 3;
    ctx.fillRect(midX - textWidth / 2 - padX, midY - 9 - padY, textWidth + padX * 2, 18);
    ctx.strokeRect(midX - textWidth / 2 - padX, midY - 9 - padY, textWidth + padX * 2, 18);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, midX, midY);

    ctx.restore();
  }
}

function drawPerson(ctx, p, runner, state, isDragged) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;

  // Determine Bounding Box Color
  let boxColor = '#22c55e'; // Green for normal
  if (p.gender === 'Female') {
    if (state.threatLevel === 'CRITICAL') {
      boxColor = '#ef4444'; // Red
    } else if (state.threatLevel === 'ELEVATED') {
      boxColor = '#f59e0b'; // Amber
    } else {
      boxColor = '#38bdf8'; // Cyan
    }
  } else {
    // Check if this male is within danger distance
    const distObj = state.surroundingResult.distances.find((d) => d.maleId === p.id);
    if (distObj && distObj.isDanger && state.threatLevel === 'CRITICAL') {
      boxColor = '#ef4444';
    } else if (distObj && distObj.isDanger) {
      boxColor = '#f59e0b';
    }
  }

  // 1. Motion Track History Trail
  if (p.trackHistory.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.trackHistory[0].x, p.trackHistory[0].y);
    for (let i = 1; i < p.trackHistory.length; i++) {
      ctx.lineTo(p.trackHistory[i].x, p.trackHistory[i].y);
    }
    ctx.strokeStyle = boxColor;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Human Character Silhouette
  drawHumanSilhouette(ctx, p, boxColor);

  // 3. YOLOv8 Bounding Box with Corner Brackets
  ctx.save();
  ctx.strokeStyle = boxColor;
  ctx.lineWidth = isDragged ? 3 : 2;

  // Draw main rectangle
  ctx.strokeRect(p.x, p.y, p.w, p.h);

  // High-tech Corner Brackets
  const cLen = 10;
  ctx.lineWidth = 3;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + cLen);
  ctx.lineTo(p.x, p.y);
  ctx.lineTo(p.x + cLen, p.y);
  // Top-right
  ctx.moveTo(p.x + p.w - cLen, p.y);
  ctx.lineTo(p.x + p.w, p.y);
  ctx.lineTo(p.x + p.w, p.y + cLen);
  // Bottom-left
  ctx.moveTo(p.x, p.y + p.h - cLen);
  ctx.lineTo(p.x, p.y + p.h);
  ctx.lineTo(p.x + cLen, p.y + p.h);
  // Bottom-right
  ctx.moveTo(p.x + p.w - cLen, p.y + p.h);
  ctx.lineTo(p.x + p.w, p.y + p.h);
  ctx.lineTo(p.x + p.w, p.y + p.h - cLen);
  ctx.stroke();

  // 4. Centroid Point Crosshair
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 5. Header Tag Pill (ID + Class + Confidence)
  const headerText = `ID ${p.id}: ${p.gender} (${(p.genderConf * 100).toFixed(0)}%)`;
  ctx.font = '11px "JetBrains Mono", monospace';
  const tagWidth = ctx.measureText(headerText).width;
  const tagHeight = 18;

  ctx.fillStyle = boxColor;
  ctx.fillRect(p.x - 1, p.y - tagHeight - 2, tagWidth + 12, tagHeight);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(headerText, p.x + 5, p.y - tagHeight / 2 - 2);

  // 6. Emotion & Pose Badges (if Female or specifically analyzed)
  let badgeY = p.y + p.h + 5;
  const badges = [];

  if (p.emotion) {
    let emoColor = '#94a3b8';
    if (p.emotion === 'Fear') emoColor = '#ef4444';
    if (p.emotion === 'Sad') emoColor = '#f59e0b';
    if (p.emotion === 'Happy') emoColor = '#22c55e';
    badges.push({ text: `[EMOTION: ${p.emotion.toUpperCase()}]`, color: emoColor });
  }

  if (p.pose) {
    badges.push({ text: `[POSE: ${p.pose.toUpperCase()}]`, color: '#38bdf8' });
  }

  for (const b of badges) {
    ctx.font = '9px "JetBrains Mono", monospace';
    const bWidth = ctx.measureText(b.text).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1;
    ctx.fillRect(p.x, badgeY, bWidth + 8, 15);
    ctx.strokeRect(p.x, badgeY, bWidth + 8, 15);

    ctx.fillStyle = b.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, p.x + 4, badgeY + 7.5);
    badgeY += 18;
  }

  ctx.restore();
}

function drawHumanSilhouette(ctx, p, color) {
  ctx.save();
  const cx = p.x + p.w / 2;
  const headRadius = p.w * 0.22;
  const headY = p.y + headRadius + 4;

  // Head
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  const torsoTop = headY + headRadius + 4;
  const torsoHeight = p.h * 0.42;
  ctx.beginPath();
  ctx.roundRect(cx - p.w * 0.32, torsoTop, p.w * 0.64, torsoHeight, 6);
  ctx.fill();

  // Legs / Pose
  const legTop = torsoTop + torsoHeight;
  const legWidth = p.w * 0.24;
  const legHeight = p.h * 0.36;

  // Left Leg
  ctx.beginPath();
  ctx.roundRect(cx - p.w * 0.3, legTop, legWidth, legHeight, 4);
  ctx.fill();

  // Right Leg
  ctx.beginPath();
  ctx.roundRect(cx + p.w * 0.06, legTop, legWidth, legHeight, 4);
  ctx.fill();

  // Simulated MediaPipe Skeleton Joints & Bones
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = '#38bdf8';
  ctx.fillStyle = '#f8fafc';
  ctx.lineWidth = 1.5;

  const neck = { x: cx, y: torsoTop + 2 };
  const leftShoulder = { x: cx - p.w * 0.28, y: torsoTop + 6 };
  const rightShoulder = { x: cx + p.w * 0.28, y: torsoTop + 6 };
  const leftHip = { x: cx - p.w * 0.2, y: legTop };
  const rightHip = { x: cx + p.w * 0.2, y: legTop };
  const leftKnee = { x: cx - p.w * 0.2, y: legTop + legHeight * 0.5 };
  const rightKnee = { x: cx + p.w * 0.2, y: legTop + legHeight * 0.5 };
  const leftAnkle = { x: cx - p.w * 0.2, y: legTop + legHeight };
  const rightAnkle = { x: cx + p.w * 0.2, y: legTop + legHeight };

  // Draw Bone Segments
  const bones = [
    [leftShoulder, rightShoulder],
    [leftShoulder, leftHip],
    [rightShoulder, rightHip],
    [leftHip, rightHip],
    [leftHip, leftKnee],
    [leftKnee, leftAnkle],
    [rightHip, rightKnee],
    [rightKnee, rightAnkle],
  ];

  for (const [pt1, pt2] of bones) {
    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.stroke();
  }

  // Draw Joint Dots
  const joints = [neck, leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
  for (const j of joints) {
    ctx.beginPath();
    ctx.arc(j.x, j.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCCTVHud(ctx, runner, state, w, h) {
  ctx.save();

  // 1. Top CCTV Header Bar
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(0, 0, w, 36);

  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Blinking REC Dot
  const blink = Math.floor(Date.now() / 600) % 2 === 0;
  if (blink) {
    ctx.beginPath();
    ctx.arc(16, 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillText('REC ● LIVE', 26, 18);

  // Camera Name
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('CAM-04: CENTRAL URBAN PLAZA / NORTH TRANSIT', 130, 18);

  // Time & FPS
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "JetBrains Mono", monospace';
  const now = new Date();
  const timeStr = `${now.toISOString().slice(0, 10)} ${runner.timeOfDay} UTC`;
  ctx.fillText(`${timeStr}  |  30.0 FPS  |  1080p`, w - 16, 18);

  // 2. Bottom HUD Telemetry Overlay
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, h - 34, w, 34);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';

  // Counts (Exact match to main.py display string)
  ctx.fillStyle = '#38bdf8';
  const countString = `PERSONS: ${state.totalCount}  |  MALES: ${state.maleCount}  |  FEMALES: ${state.femaleCount}`;
  ctx.fillText(countString, 16, h - 17);

  // Model latencies
  ctx.textAlign = 'right';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('YOLOv8n: 8.2ms  |  ViT-Gender: 14.1ms  |  CNN-Emotion: 4.8ms', w - 16, h - 17);

  // 3. SOS Trigger Banner (If Critical Alert)
  if (state.threatLevel === 'CRITICAL') {
    const flash = Math.floor(Date.now() / 400) % 2 === 0;
    ctx.fillStyle = flash ? 'rgba(220, 38, 38, 0.92)' : 'rgba(185, 28, 28, 0.92)';
    ctx.fillRect(0, 36, w, 32);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚨 SOS CONDITION TRIGGERED: FEMALE SURROUNDED WITH DISTRESS EMOTION -> TELEGRAM DISPATCHED', w / 2, 52);
  } else if (state.threatLevel === 'ELEVATED' && state.trigger === 'LONE_NIGHT_THREAT') {
    ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
    ctx.fillRect(0, 36, w, 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️ NIGHT PATROL ALERT: LONE FEMALE DETECTED AT NIGHT HOURS (22:00 - 06:00)', w / 2, 51);
  }

  // Crosshair in center
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 12, h / 2);
  ctx.lineTo(w / 2 + 12, h / 2);
  ctx.moveTo(w / 2, h / 2 - 12);
  ctx.lineTo(w / 2, h / 2 + 12);
  ctx.stroke();

  ctx.restore();
}
