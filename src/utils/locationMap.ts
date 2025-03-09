// In a real-world implementation, we would use a geocoding service API
// For example, Google Maps Geocoding API, Mapbox Geocoding API, or OpenStreetMap Nominatim
// Since we can't make actual API calls in this example, we'll use a more comprehensive
// pre-defined location map for common cities as a fallback

export const locationMap: { [key: string]: { lat: number; lng: number } } = {
  // Major global cities
  'new york': { lat: 40.7128, lng: -74.006 },
  london: { lat: 51.5074, lng: -0.1278 },
  paris: { lat: 48.8566, lng: 2.3522 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  miami: { lat: 25.7617, lng: -80.1918 },

  // US cities
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  houston: { lat: 29.7604, lng: -95.3698 },
  phoenix: { lat: 33.4484, lng: -112.074 },
  philadelphia: { lat: 39.9526, lng: -75.1652 },
  'san antonio': { lat: 29.4241, lng: -98.4936 },
  'san diego': { lat: 32.7157, lng: -117.1611 },
  dallas: { lat: 32.7767, lng: -96.797 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  austin: { lat: 30.2672, lng: -97.7431 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  denver: { lat: 39.7392, lng: -104.9903 },
  boston: { lat: 42.3601, lng: -71.0589 },
  'washington dc': { lat: 38.9072, lng: -77.0369 },
  nashville: { lat: 36.1627, lng: -86.7816 },
  atlanta: { lat: 33.749, lng: -84.388 },

  // European cities
  berlin: { lat: 52.52, lng: 13.405 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  rome: { lat: 41.9028, lng: 12.4964 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  barcelona: { lat: 41.3851, lng: 2.1734 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  dublin: { lat: 53.3498, lng: -6.2603 },
  vienna: { lat: 48.2082, lng: 16.3738 },
  prague: { lat: 50.0755, lng: 14.4378 },

  // Asian cities
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  seoul: { lat: 37.5665, lng: 126.978 },
  shanghai: { lat: 31.2304, lng: 121.4737 },
  beijing: { lat: 39.9042, lng: 116.4074 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  'kuala lumpur': { lat: 3.139, lng: 101.6869 },

  // African cities
  lagos: { lat: 6.5244, lng: 3.3792 },
  cairo: { lat: 30.0444, lng: 31.2357 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  johannesburg: { lat: -26.2041, lng: 28.0473 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  nairobi: { lat: -1.2921, lng: 36.8219 },
  accra: { lat: 5.6037, lng: -0.187 },
  'addis ababa': { lat: 9.0054, lng: 38.7636 },
  'dar es salaam': { lat: -6.7924, lng: 39.2083 },
  tunis: { lat: 36.8065, lng: 10.1815 },
  algiers: { lat: 36.7538, lng: 3.0588 },
  khartoum: { lat: 15.5007, lng: 32.5599 },
  dakar: { lat: 14.7167, lng: -17.4677 },
  marrakesh: { lat: 31.6295, lng: -7.9811 },
  kigali: { lat: -1.9706, lng: 30.1044 },

  // Nigerian cities
  abuja: { lat: 9.0765, lng: 7.3986 },
  kano: { lat: 12.0022, lng: 8.592 },
  ibadan: { lat: 7.3775, lng: 3.947 },
  'port harcourt': { lat: 4.8156, lng: 7.0498 },
  benin: { lat: 6.335, lng: 5.6038 },
  maiduguri: { lat: 11.8311, lng: 13.1508 },
  zaria: { lat: 11.0885, lng: 7.7199 },
  aba: { lat: 5.1067, lng: 7.3669 },
  jos: { lat: 9.8965, lng: 8.8583 },
  ilorin: { lat: 8.5373, lng: 4.5426 },
  onitsha: { lat: 6.1447, lng: 6.7867 },
  warri: { lat: 5.5167, lng: 5.75 },
  enugu: { lat: 6.4584, lng: 7.5464 },
  abeokuta: { lat: 7.1475, lng: 3.3619 },
  sokoto: { lat: 13.0622, lng: 5.2339 },
  calabar: { lat: 4.9781, lng: 8.325 },
  kaduna: { lat: 10.5222, lng: 7.4383 },
  uyo: { lat: 5.0335, lng: 7.9231 },
  makurdi: { lat: 7.74, lng: 8.52 },
  osogbo: { lat: 7.7614, lng: 4.5616 },
};

// Function to geocode location string into coordinates using the browser's geocoding API
export const geocodeLocation = async (
  locationStr: string,
): Promise<{ lat: number; lng: number } | null> => {
  // Handle virtual events
  if (locationStr.toLowerCase().includes('virtual')) {
    return null;
  }

  // Try to extract coordinates if they're already in the string
  const coordsMatch = locationStr.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
  if (coordsMatch) {
    return {
      lat: parseFloat(coordsMatch[1]),
      lng: parseFloat(coordsMatch[2]),
    };
  }

  try {
    // Check if we have a cached result for this location
    const cachedLocations = localStorage.getItem('geocodedLocations');
    if (cachedLocations) {
      const locations = JSON.parse(cachedLocations);
      if (locations[locationStr]) {
        return locations[locationStr];
      }
    }

    // Check if the location string contains any of our known cities
    const lowerCaseLocation = locationStr.toLowerCase();
    for (const [city, coords] of Object.entries(locationMap)) {
      if (lowerCaseLocation.includes(city)) {
        // Cache this result
        const existingCache = localStorage.getItem('geocodedLocations');
        const cacheObj = existingCache ? JSON.parse(existingCache) : {};
        cacheObj[locationStr] = coords;
        localStorage.setItem('geocodedLocations', JSON.stringify(cacheObj));

        return coords;
      }
    }

    // In a real implementation, we would make an API call to a geocoding service here
    console.warn(`Could not geocode location: ${locationStr}`);
    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};
