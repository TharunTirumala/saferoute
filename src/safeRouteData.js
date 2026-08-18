// Authentic crime coordinates and incident data extracted from vidhiJain/SafeRoute repository

export const CRIME_HOTSPOTS = [
  { name: "Sarai Rohilla", lat: 28.66538, lng: 77.18881, count: 4, danger: "High", desc: "Reported theft & unlit alleyways near station" },
  { name: "Dwarka Sector 12", lat: 28.59214, lng: 77.04604, count: 3, danger: "Medium", desc: "Isolated stretch after 10 PM" },
  { name: "Ghaziabad Border", lat: 28.64393, lng: 77.30902, count: 6, danger: "Critical", desc: "Highway border zone with low patrol frequency" },
  { name: "Greater Noida Expressway", lat: 28.47438, lng: 77.50399, count: 5, danger: "High", desc: "Long desolate expressway section" },
  { name: "Noida Sector 18 / Atta", lat: 28.53590, lng: 77.39201, count: 4, danger: "Medium", desc: "Crowded night market perimeter" },
  { name: "Vikas Marg", lat: 28.63114, lng: 77.27820, count: 3, danger: "Medium", desc: "Past evening traffic congestion & poorly lit service lanes" },
  { name: "Badarpur Border", lat: 28.49289, lng: 77.32382, count: 5, danger: "High", desc: "Industrial transit bottleneck" },
  { name: "Govindpuri Extension", lat: 28.53543, lng: 77.26393, count: 4, danger: "High", desc: "Narrow streets with recurring harassment complaints" },
  { name: "Tughlaqabad Fort Area", lat: 28.51639, lng: 77.26134, count: 6, danger: "Critical", desc: "Forest edge perimeter with minimal lighting" },
  { name: "Anand Vihar ISBT", lat: 28.65021, lng: 77.30270, count: 7, danger: "Critical", desc: "Inter-state bus terminal heavy transit zone" },
  { name: "Kirti Nagar", lat: 28.65040, lng: 77.14442, count: 2, danger: "Low", desc: "Commercial furniture district" },
  { name: "Patel Nagar", lat: 28.65443, lng: 77.16888, count: 3, danger: "Medium", desc: "Metro station underpass" },
  { name: "Delhi University North Campus", lat: 28.70803, lng: 77.21105, count: 2, danger: "Low", desc: "Student zone - active police PCR van presence" },
  { name: "Anand Parbat", lat: 28.66494, lng: 77.17477, count: 5, danger: "High", desc: "Industrial hilly terrain with secluded paths" },
  { name: "Uttam Nagar East", lat: 28.62127, lng: 77.06132, count: 4, danger: "High", desc: "High density commercial transit intersection" },
  { name: "Karol Bagh Market", lat: 28.65278, lng: 77.19214, count: 3, danger: "Medium", desc: "Crowded market, deserted rear alleys" },
  { name: "Connaught Place Outer Circle", lat: 28.6315, lng: 77.2167, count: 1, danger: "Low", desc: "Well lit commercial hub" },
  { name: "Saket District Centre", lat: 28.5245, lng: 77.2066, count: 2, danger: "Low", desc: "Commercial mall area, guarded" },
  { name: "Hauz Khas Village Road", lat: 28.5494, lng: 77.2001, count: 3, danger: "Medium", desc: "Nightlife corridor" }
];

export const NEWS_SCRAPER_LOGS = [
  { time: "10 mins ago", source: "NDTV Crime Beat", headline: "Police step up midnight patrols near Anand Vihar transit corridor", tag: "Anand Vihar", score: -15 },
  { time: "28 mins ago", source: "Delhi City Times", headline: "New street lighting project commissioned for Govindpuri Extension", tag: "Govindpuri", score: +10 },
  { time: "1 hr ago", source: "NCR Police Alert", headline: "Security audit flags isolated stretches along Tughlaqabad perimeter", tag: "Tughlaqabad", score: -25 },
  { time: "3 hrs ago", source: "Community Tag", headline: "User #4892 flagged non-functional streetlights near Sarai Rohilla", tag: "Sarai Rohilla", score: -10 }
];
