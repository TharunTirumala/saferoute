# 🛡️ SafeRoute — Complete Technical Architecture & System Guide

**SafeRoute** is an AI-powered Women’s Safety Navigation Platform combining real-time OSRM road network geometry, a 5-factor mathematical safety scoring algorithm, spatial Haversine proximity scanning, and an instant zero-delay n8n + Twilio cloud emergency SOS dispatcher.

---

## 📌 Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Geocoding & OSRM Road Network Engine](#3-geocoding--osrm-road-network-engine)
4. [The Haversine Distance Formula & Proximity Scanning](#4-the-haversine-distance-formula--proximity-scanning)
5. [The 5-Factor Mathematical Safety Scoring Algorithm (0–100)](#5-the-5-factor-mathematical-safety-scoring-algorithm-0100)
6. [3-Layer Street Lighting & Commercial Footfall Intelligence](#6-3-layer-street-lighting--commercial-footfall-intelligence)
7. [Off-Route 200m Virtual Safety Fence](#7-off-route-200m-virtual-safety-fence)
8. [Emergency SOS Pipeline (n8n + Twilio + Voice SOS)](#8-emergency-sos-pipeline-n8n--twilio--voice-sos)
9. [Automated RSS News Reader NLP Scraper Pipeline](#9-automated-rss-news-reader-nlp-scraper-pipeline)
10. [Master Hackathon Presentation & Judges Pitch Script](#10-master-hackathon-presentation--judges-pitch-script)

---

## 1. Executive Summary & Problem Statement

### ❌ The Problem:
Standard navigation platforms (such as Google Maps, Waze, or Apple Maps) optimize exclusively for **shortest distance** or **fastest travel time**. They frequently guide pedestrians and drivers through dark, unlit back-alleys, isolated industrial zones, or high-crime corridors because they save 60 seconds of travel time.

### ✅ The SafeRoute Solution:
SafeRoute evaluates **street lighting sensors**, **police station proximity**, **nightfall risk multipliers**, **commercial footfall ("eyes on the street")**, and **crowd-sourced hazard reports** to strictly prioritize **Women's Safety First**.

---

## 2. High-Level System Architecture

```
                               ┌──────────────────────────────────────────┐
                               │     SafeRoute Web App (Vite + JS)        │
                               └────────────────────┬─────────────────────┘
                                                    │
         ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
         │                                          │                                          │
         ▼                                          ▼                                          ▼
┌───────────────────┐                      ┌───────────────────┐                      ┌───────────────────┐
│ 1. Routing Engine │                      │ 2. Spatial Engine │                      │ 3. Emergency SOS  │
│ (Geocoder + OSRM) │                      │(Haversine + Score)│                      │  (n8n + Twilio)   │
└───────────────────┘                      └───────────────────┘                      └───────────────────┘
```

* **Frontend**: Vanilla ES6+ JavaScript, HTML5, CSS3 Custom Tokens, Leaflet JS Map Engine.
* **Routing API**: OSRM (Open Source Routing Machine) + Nominatim OSM Geocoder.
* **Spatial Engine**: Native Haversine spherical distance calculator.
* **Automation Backend**: n8n Workflow Automation Cloud Engine + Twilio Voice REST API.

---

## 3. Geocoding & OSRM Road Network Engine

### 3.1 Geocoding (Location ➔ GPS Coordinates)
When a user types `"Hitech City, Hyderabad"` and `"Banjara Hills, Hyderabad"`:
1. SafeRoute queries Nominatim OpenStreetMap Geocoder:
   ```
   GET https://nominatim.openstreetmap.org/search?format=json&q=Hitech+City+Hyderabad
   ```
2. Resolves text strings into exact spatial coordinates:
   * **Origin (Hitech City)**: `17.4435° N, 78.3772° E`
   * **Destination (Banjara Hills)**: `17.4150° N, 78.4350° E`

### 3.2 OSRM Road Geometry Query
SafeRoute queries the OSRM Routing Engine with full GeoJSON geometries enabled:
```
GET https://router.project-osrm.org/route/v1/driving/78.3772,17.4435;78.4350,17.4150?overview=full&geometries=geojson
```
Returns coordinate waypoints along physical streets: `[[78.3772, 17.4435], [78.3810, 17.4410], [78.3890, 17.4350], ...]`

---

## 4. The Haversine Distance Formula & Proximity Scanning

To measure exact spatial distances on Earth's curved spherical surface between moving users, road waypoints, police stations, hospitals, and hazard pins, SafeRoute uses the **Haversine Formula**:

$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

Where:
* $R = 6,371 \text{ km}$ (Earth's radius)
* $\phi_1, \phi_2$ = Latitude of Waypoint & Police Station / Hospital
* $\lambda_1, \lambda_2$ = Longitude of Waypoint & Police Station / Hospital

### Applications in SafeRoute:
1. 🚓 **Police Proximity**: Scans for police stations & She Team kiosks within **1.0 km**.
2. 🏥 **Hospital Proximity**: Identifies 24/7 medical centers within **1.5 km**.
3. ⚠️ **Hazard Exposure**: Checks for reported snatching/harassment pins within **500 meters**.
4. 🚨 **Off-Route Fence**: Detects if user strays $>200\text{m}$ off the safe corridor.

---

## 5. The 5-Factor Mathematical Safety Scoring Algorithm (0–100)

SafeRoute starts each candidate route with **100 Base Points** and calculates the final safety score:

$$\text{Final Safety Score} = 100 - \text{Unlit Penalty} + \text{Police Bonus} - \text{Hazard Penalty} \times \text{Night Multiplier} + \text{Footfall Bonus}$$

### 🔬 5-Factor Scoring Breakdown:

| Safety Factor | Weight | Mathematical Operational Logic |
| :--- | :---: | :--- |
| 💡 **Street Lighting** | **30%** | Inspects OSM `lit=yes` tags and municipal lighting hierarchy. |
| 🚓 **Police & Emergency** | **25%** | Haversine distance $d \le 1.0\text{km}$ adds +15 bonus points. |
| ⚠️ **Hazard Reports** | **20%** | Snatching/harassment pins within 500m deduct -20 to -35 points. |
| 🌙 **Nightfall Risk Shift** | **15%** | 8 PM to 5 AM applies **1.4x hazard multiplier** and boosts lighting weight. |
| 🏪 **Commercial Footfall** | **10%** | Active shop/metro density per 100m adds +10 "Eyes on the Street" bonus. |

---

## 6. 3-Layer Street Lighting & Commercial Footfall Intelligence

### 6.1 Street Lighting (3 Layers):
1. **OpenStreetMap Tags**: `lit=yes` / `lit=24/7` vs `lit=no`.
2. **Municipal Road Hierarchy**: Major commercial highways = 85%–95% lighting; residential service alleys = 20%–40% lighting.
3. **Crowd-Sourced Hazard Pins**: User-reported "Unlit Streetlight" pins deduct points for that 500m segment.

### 6.2 Commercial Footfall ("Eyes on the Street"):
Based on urbanist Jane Jacobs' principle, streets with active retail stores, cafes, ATMs, and metro stations provide **natural surveillance** and **emergency shelter access**. SafeRoute rewards active commercial corridors with **+10 bonus points**.

---

## 7. Off-Route 200m Virtual Safety Fence

As the user travels along the route:
1. SafeRoute draws an invisible **200-meter safety buffer zone** around the planned route.
2. If the live GPS location moves **>200 meters off-route**:
   * ⚠️ **Alert Banner**: *"Route Deviation Detected — You have moved away from your planned safe corridor."*
   * 🔄 **Recalculate Button**: Re-evaluates safest route from current position.
   * 🚨 **Emergency Trigger**: Prompts 1-tap SOS dispatch.

---

## 8. Emergency SOS Pipeline (n8n + Twilio + Voice SOS)

```
[User Taps "ONE-TAP SOS" / Speaks "HELP ME"]
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 1. Native HTML Anchor Trigger (<a target="frame">)   │
└──────────────────┬──────────────────────────────────┘
                   │ (Bypasses Browser CORS Preflights)
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. n8n Production Webhook Trigger                   │
│    https://pranav3010.app.n8n.cloud/webhook/...     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. Twilio Direct REST API Call Node                 │
│    To: +916300863028 | From: +17372508034           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. Emergency Phone Rings Live + Live Tracking Sent  │
└─────────────────────────────────────────────────────┘
```

* **CORS-Free Architecture**: Native HTML hyperlink targets hidden background iframe, guaranteeing 0ms execution without browser CORS preflight blocking.
* **Voice Panic Engine**: Web Speech API listens continuously for panic phrases (`"HELP ME"`, `"SAVE ME"`, `"BACHAO"`).

---

## 9. Automated RSS News Reader NLP Scraper Pipeline

```
[Cron Trigger (Every 1h)] ➔ [Google News RSS Scraper] ➔ [Gemini 1.5 Flash NLP] ➔ [SafeRoute Map Risk Update]
```

1. **Scrapes Local News**: Pulls live Google News RSS for `"Hyderabad women safety crime"`.
2. **Gemini AI Comprehension**: Extracts `{ location: "Charminar", crimeType: "Snatching", severity: 0.50 }`.
3. **Map Auto-Update**: Dynamically adjusts safety heatmap and risk scores without human effort.

---

## 10. Master Hackathon Presentation & Judges Pitch Script

> *"SafeRoute is a comprehensive women's safety navigation platform. Unlike standard navigation apps that only optimize for travel speed, SafeRoute combines real-time OSRM road geometry with the spatial Haversine distance formula to evaluate street lighting, police station proximity, nightfall risk multipliers, commercial footfall, and crowd-sourced hazard reports—strictly prioritizing safety over shortest distance.*
>
> *In an emergency, SafeRoute features zero-delay one-tap and hands-free voice SOS that triggers an n8n cloud automation pipeline—placing live phone calls via Twilio REST API to emergency contacts while broadcasting real-time GPS location tracking."* 🚀
