# SafeRoute — Professional Safety Navigation & One-Tap Emergency SOS

**SafeRoute** is an AI-powered safety navigation platform with verified road network routing, pre-authorized one-tap emergency SOS, and continuous live GPS location tracking.

---

### 🚀 Key Features

1. **AI Route Safety Scoring**
   - Multi-factor safety scoring evaluating lighting coverage, verified police presence, time-of-day risk multipliers, and pedestrian infrastructure.
   - Evaluates alternative paths and recommends the safest route over purely fastest routes.

2. **Interactive Safety Map & Overlays**
   - Color-coded safety routes (Safest path in green, alternative routes in blue, high-risk routes in red).
   - Real-time safety heatmap and verified facilities overlay (Police stations, Hospitals, Public places).

3. **One-Tap Emergency SOS & Live GPS Dispatch**
   - Instant 3-second countdown emergency trigger connected to cloud webhooks and automated telephony.
   - Generates secure live GPS tracking sessions for emergency contacts with continuous location breadcrumbs.

4. **Hands-Free Multilingual Voice SOS**
   - On-device speech recognition listening for emergency trigger phrases across multiple languages (English, Hindi, Telugu, Tamil, Kannada, Marathi, Spanish).

5. **Community Safety Reporting**
   - Allows users to report unsafe locations, unlit areas, and hazards to dynamically inform routing safety scores.

---

### 🛠️ Tech Stack & Architecture

- **Frontend**: Vanilla JavaScript (ES Modules), Leaflet Map Engine, Modern CSS3
- **Build Tool**: Vite
- **Routing Engine**: OSRM Road Geometry & Haversine Distance Scoring
- **Emergency Pipeline**: Automated Webhook Dispatch (n8n / Twilio Telephony)

---

### 💻 Getting Started Locally

```bash
# Clone the repository
git clone https://github.com/pranav-3010/saferoute.git

# Navigate to the project directory
cd saferoute

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The application will be available at `http://localhost:5173/`.
