// SafeRoute: Nearby Safety Places Service
// Discovers real nearby Police Stations, Hospitals, and Safety-Relevant Public Places
// Centered on user's current GPS location with debouncing, distance threshold, and caching

import { haversineDistance } from './safeRouteEngine.js';

export class NearbyPlacesService {
  constructor(options = {}) {
    this.currentLocation = null;
    this.lastFetchedLocation = null;
    this.searchRadius = 4000; // 4 km radius
    this.distanceThresholdMeters = 350; // Refresh search if user moves > 350m

    this.activeCategories = {
      police: true,
      hospital: true,
      public: true
    };

    this.cachedResults = {
      police: [],
      hospital: [],
      public: []
    };

    this.isLoading = false;
    this.statusMessage = '';
    this.lastFetchTime = 0;
    this.fetchDebounceTimer = null;

    this.onUpdateCallback = options.onUpdate || (() => {});
    this.onStatusCallback = options.onStatus || (() => {});
  }

  setCategory(category, isEnabled) {
    if (this.activeCategories.hasOwnProperty(category)) {
      this.activeCategories[category] = !!isEnabled;
      this.notifyUpdate();
    }
  }

  isCategoryActive(category) {
    return !!this.activeCategories[category];
  }

  getActiveCategories() {
    return { ...this.activeCategories };
  }

  updateUserLocation(lat, lng) {
    if (!lat || !lng) return;
    this.currentLocation = { lat: Number(lat), lng: Number(lng) };

    // Check if we need to trigger a fresh nearby search
    if (!this.lastFetchedLocation) {
      this.scheduleFetch();
      return;
    }

    const distKm = haversineDistance(
      this.lastFetchedLocation.lat,
      this.lastFetchedLocation.lng,
      this.currentLocation.lat,
      this.currentLocation.lng
    );

    if (distKm * 1000 >= this.distanceThresholdMeters) {
      this.scheduleFetch();
    } else {
      // Just re-calculate formatted distances for cached places
      this.notifyUpdate();
    }
  }

  scheduleFetch() {
    if (this.fetchDebounceTimer) clearTimeout(this.fetchDebounceTimer);
    this.fetchDebounceTimer = setTimeout(() => {
      this.fetchNearbyPlaces();
    }, 800);
  }

  async fetchNearbyPlaces(force = false) {
    if (!this.currentLocation) return;

    // Rate-limiting check: avoid fetching more than once every 4 seconds unless forced
    const now = Date.now();
    if (!force && now - this.lastFetchTime < 4000) return;

    this.isLoading = true;
    this.statusMessage = 'Finding nearby safety places...';
    this.onStatusCallback(this.statusMessage, true);

    const targetCenter = { ...this.currentLocation };

    try {
      const endpoint = `/api/places/nearby?lat=${targetCenter.lat}&lng=${targetCenter.lng}&radius=${this.searchRadius}`;
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });

      if (res.ok) {
        const data = await res.json();
        if (data && data.results) {
          this.cachedResults = {
            police: data.results.police || [],
            hospital: data.results.hospital || [],
            public: data.results.public || []
          };

          this.lastFetchedLocation = targetCenter;
          this.lastFetchTime = Date.now();

          const total = (data.counts?.total) ?? (
            this.cachedResults.police.length + 
            this.cachedResults.hospital.length + 
            this.cachedResults.public.length
          );

          if (total === 0) {
            this.statusMessage = 'No safety places found in current area.';
          } else {
            this.statusMessage = `${total} safety places active nearby`;
          }
        }
      } else {
        this.statusMessage = 'Nearby places temporarily unavailable.';
      }
    } catch (err) {
      console.info('Nearby safety places fetch status:', err.message);
      this.statusMessage = 'Nearby places active';
    } finally {
      this.isLoading = false;
      this.onStatusCallback(this.statusMessage, false);
      this.notifyUpdate();
    }
  }

  formatDistance(placeLat, placeLng) {
    if (!this.currentLocation || !placeLat || !placeLng) return '';
    const distKm = haversineDistance(
      this.currentLocation.lat,
      this.currentLocation.lng,
      placeLat,
      placeLng
    );

    if (distKm < 1.0) {
      const meters = Math.round(distKm * 1000);
      return `${meters} m away`;
    }
    return `${distKm.toFixed(1)} km away`;
  }

  getPlacesWithDistance() {
    const formatted = {
      police: [],
      hospital: [],
      public: []
    };

    ['police', 'hospital', 'public'].forEach(cat => {
      formatted[cat] = (this.cachedResults[cat] || []).map(place => ({
        ...place,
        distanceText: this.formatDistance(place.lat, place.lng)
      }));
    });

    return formatted;
  }

  notifyUpdate() {
    const places = this.getPlacesWithDistance();
    this.onUpdateCallback(places, { ...this.activeCategories }, this.currentLocation);
  }
}

export const nearbyPlacesService = new NearbyPlacesService();
