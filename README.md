# women_safety

## SafeRoute & Guardian Eye // AI GPS Navigation & Safety Intelligence System

**SafeRoute** is an AI-powered GPS navigation and real-time crime risk-zone scoring platform designed to ensure women's safety during transit. It dynamically calculates route safety using Haversine distance-based crime cluster analysis and NLP-based crime news intelligence.

---

### 🚀 Key Features

1. **AI Route Safety Scoring (Haversine Formula)**
   - Computes weighted proximity to verified crime incident hotspots across the Delhi NCR region.
   - Evaluates alternative paths and recommends the safest route over the fastest/riskiest route.

2. **Interactive Crime Risk Heatmap & Incident Clusters**
   - Visualizes color-coded risk vectors (Red = Risky Hotspots, Green = Safest Path, Yellow = Highway Alternate).
   - Real-time pinpointing of high-risk zones, poorly lit streets, and isolated corridors.

3. **Community Safety Reporting**
   - Allows users to report unsafe locations, broken streetlights, eve-teasing hotspots, and deserted stretches with danger ratings (1 to 5 stars).

4. **Live Crime Intelligence Feed**
   - Simulates continuous NLP extraction and classification from news sources to update the crime hotspot database.

5. **Guardian Eye CCTV Computer Vision Integration**
   - Simulated YOLOv8 + Transformers computer vision module for lone woman detection, surrounded proximity threat alerts, distress facial emotion detection, and automated Telegram dispatch alerts.

---

### 🛠️ Tech Stack & Architecture

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5 Canvas, Modern CSS3
- **Build Tool**: Vite
- **Routing Engine**: Custom Haversine Distance & Waypoint Risk Calculation Engine
- **Icons & UI**: Custom SVG vector graphics, Glassmorphism design tokens

---

### 💻 Getting Started Locally

```bash
# Clone the repository
git clone https://github.com/pranav-3010/women_safety.git

# Navigate to the project directory
cd women_safety

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The application will be available at `http://localhost:5173/`.
