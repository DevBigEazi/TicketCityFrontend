import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, MapPin, Compass } from 'lucide-react';
import EventCard from './EventsCard';
import { UIEvent, EventFilter, ViewMode } from '../../types';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { createPublicClientInstance, TICKET_CITY_ADDR } from '../../utils/client';

const ITEMS_PER_PAGE = 12;
const REFRESH_INTERVAL = 30000; // 30 seconds

// Updated filters to match contract's ticket type categories
const filters = ['All', 'Free', 'Paid', 'Regular', 'VIP', 'Virtual', 'In-Person', 'Nearby'];

const EventsSection: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<EventFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'Distance' | 'Popularity' | 'Ticket Price' | 'Date'>('Date');
  const [events, setEvents] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'idle'>(
    'idle',
  );
  const [geoPermissionDenied, setGeoPermissionDenied] = useState<boolean>(false);

  const publicClient = createPublicClientInstance();

  // Helper function to format Unix timestamp to readable date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'TBD';

    const eventDate = new Date(Number(timestamp) * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset hours to compare just the dates
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    // Format the time portion
    const timeString = eventDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Check if event is today or tomorrow
    if (eventDay.getTime() === todayDay.getTime()) {
      return `Today | ${timeString}`;
    } else if (eventDay.getTime() === tomorrowDay.getTime()) {
      return `Tomorrow | ${timeString}`;
    } else {
      // For other dates, use the standard format
      return `${eventDate.toLocaleDateString()} | ${timeString}`;
    }
  };

  // Enhanced to better match contract's ticket type structure
  const getTicketType = (eventData: any) => {
    if (Number(eventData.ticketType) === 0) return 'Free';

    // Check if event has VIP tickets
    const hasVIP = eventData.paidTicketCategory === 2; // Assuming PaidTicketCategory.VIP is 2
    if (hasVIP) return 'VIP';

    return 'Paid'; // Default for paid tickets
  };

  // Function to get user's location
  const getUserLocation = () => {
    setLocationStatus('loading');

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      setLocationStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('success');
        localStorage.setItem(
          'userLocation',
          JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now(),
          }),
        );

        // Set sort by distance when location is obtained, but don't change the filter
        setSortBy('Distance');

        // Refresh events to apply the new sorting
        fetchEvents(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationStatus('error');

        // Check if permission was denied
        if (error.code === error.PERMISSION_DENIED) {
          setGeoPermissionDenied(true);
        }

        // Try to use cached location if available
        const cachedLocation = localStorage.getItem('userLocation');
        if (cachedLocation) {
          try {
            const parsedLocation = JSON.parse(cachedLocation);
            // Only use cached location if it's less than 24 hours old
            if (Date.now() - parsedLocation.timestamp < 24 * 60 * 60 * 1000) {
              setUserLocation({
                lat: parsedLocation.lat,
                lng: parsedLocation.lng,
              });
              setLocationStatus('success');
            }
          } catch (e) {
            console.error('Error parsing cached location:', e);
          }
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10 * 60 * 1000 }, // 10 minute max age for cached position
    );
  };

  // Function to geocode location string into coordinates using the browser's geocoding API
  const geocodeLocation = async (
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

      // In a real-world implementation, we would use a geocoding service API
      // For example, Google Maps Geocoding API, Mapbox Geocoding API, or OpenStreetMap Nominatim
      // Since we can't make actual API calls in this example, we'll use a more comprehensive
      // pre-defined location map for common cities as a fallback
      const locationMap: { [key: string]: { lat: number; lng: number } } = {
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
      };

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
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  // Fetch events from blockchain
  const fetchEvents = async (showLoadingState = true) => {
    if (showLoadingState) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Get valid event IDs from the contract using getAllValidEvents
      const validEventIds = await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'getAllValidEvents',
        args: [],
      });

      console.log('Valid event IDs:', validEventIds);

      if (!validEventIds || !Array.isArray(validEventIds) || validEventIds.length === 0) {
        console.warn('No valid events found');
        setEvents([]);
        return;
      }

      // Fetch each event's details using the getEvent function
      const eventsData = await Promise.all(
        validEventIds.map(async (eventId) => {
          try {
            const eventData = await publicClient.readContract({
              address: TICKET_CITY_ADDR,
              abi: TICKET_CITY_ABI,
              functionName: 'getEvent',
              args: [eventId],
            });

            console.log(`Event ${eventId} data:`, eventData);
            return { eventId, eventData };
          } catch (error) {
            console.error(`Error fetching event ${eventId}:`, error);
            return null;
          }
        }),
      );

      // Fetch ticket details for each event and geocode locations
      const formattedEvents: UIEvent[] = await Promise.all(
        eventsData
          .filter((event): event is { eventId: any; eventData: any } => event !== null)
          .map(async ({ eventId, eventData }) => {
            // Check if event has ended
            const hasEnded = Number((eventData as any).endDate) * 1000 < Date.now();

            // Get ticket details for events
            let regularPrice = 0;
            let vipPrice = 0;
            let hasRegularTicket = false;
            let hasVIPTicket = false;
            let hasTicketCreated = false;

            try {
              // Fetch ticket details for both free and paid events
              const eventTickets = await publicClient.readContract({
                address: TICKET_CITY_ADDR,
                abi: TICKET_CITY_ABI,
                functionName: 'eventTickets',
                args: [eventId],
              });

              console.log(`Event ${eventId} tickets:`, eventTickets);

              // Check if ticket data is an array (legacy format) or object (new format)
              if (Array.isArray(eventTickets)) {
                hasRegularTicket = eventTickets[0];
                hasVIPTicket = eventTickets[1];
                regularPrice = hasRegularTicket ? Number(eventTickets[2]) / 1e18 : 0;
                vipPrice = hasVIPTicket ? Number(eventTickets[3]) / 1e18 : 0;
              } else {
                const tickets = eventTickets as {
                  hasRegularTicket: boolean;
                  hasVIPTicket: boolean;
                  regularTicketFee: string;
                  vipTicketFee: string;
                };
                hasRegularTicket = tickets.hasRegularTicket;
                hasVIPTicket = (eventTickets as { hasVIPTicket: boolean }).hasVIPTicket;
                regularPrice = hasRegularTicket
                  ? Number((eventTickets as { regularTicketFee: string }).regularTicketFee) / 1e18
                  : 0;
                vipPrice = hasVIPTicket
                  ? Number((eventTickets as { vipTicketFee: string }).vipTicketFee) / 1e18
                  : 0;
              }

              // Check if any ticket type is available
              hasTicketCreated =
                hasRegularTicket || hasVIPTicket || Number((eventData as any).ticketType) === 0; // Free events are always considered to have tickets

              // For free events, ensure they're marked as having tickets if NFT address exists
              if (
                Number((eventData as any).ticketType) === 0 &&
                (eventData as any).ticketNFTAddr &&
                (eventData as any).ticketNFTAddr !== '0x0000000000000000000000000000000000000000'
              ) {
                hasTicketCreated = true;
              }
            } catch (error) {
              console.error(`Error fetching ticket details for event ${eventId}:`, error);
              // For backwards compatibility, check if ticketFee is set
              if ((eventData as any).ticketFee) {
                regularPrice = Number((eventData as any).ticketFee) / 1e18 || 0;
                vipPrice = regularPrice * 2 || 0; // Estimate VIP as double regular price
                hasRegularTicket = regularPrice > 0;
                hasVIPTicket = false;
                hasTicketCreated = hasRegularTicket;
              }
            }

            // Validate and process the image URL
            let imageUrl = (eventData as any).imageUri || '/placeholder-event.jpg';

            // Get remaining tickets
            const remainingTickets =
              Number((eventData as any).expectedAttendees) -
              Number((eventData as any).userRegCount);

            // Geocode location to get coordinates
            const locationStr = (eventData as any).location || 'TBD';
            const coordinates = await geocodeLocation(locationStr);

            // Calculate distance if user location is available
            let distance = null;
            if (userLocation && coordinates) {
              distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                coordinates.lat,
                coordinates.lng,
              );
            }

            // Create proper UIEvent object with typed rawData
            const event: UIEvent = {
              id: eventId.toString(),
              type: getTicketType(eventData),
              title: (eventData as any).title || 'Untitled Event',
              description: (eventData as any).desc || 'No description available',
              location: locationStr,
              coordinates: coordinates,
              distance: distance,
              date: formatDate((eventData as any).startDate),
              endDate: formatDate((eventData as any).endDate),
              price: {
                regular: regularPrice,
                vip: vipPrice,
              },
              image: imageUrl,
              organiser: (eventData as any).organiser,
              attendees: {
                registered: Number((eventData as any).userRegCount),
                expected: Number((eventData as any).expectedAttendees),
                verified: Number((eventData as any).verifiedAttendeesCount),
              },
              remainingTickets: remainingTickets,
              hasEnded: hasEnded,
              hasTicketCreated: hasTicketCreated,
              hasRegularTicket: hasRegularTicket,
              hasVIPTicket: hasVIPTicket,
              isVerified: false,
              rawData: {
                ...eventData,
                startDate: (eventData as any).startDate,
                endDate: (eventData as any).endDate,
              },
            };

            return event;
          }),
      );

      console.log('Formatted events:', formattedEvents);

      // Filter out events that have ended AND ensure at least one ticket is available
      const activeEvents: UIEvent[] = formattedEvents.filter(
        (event) => !event.hasEnded && event.hasTicketCreated,
      );

      console.log('Active events with tickets:', activeEvents);
      setEvents(activeEvents);

      // Update the last updated timestamp
      setLastUpdated(new Date());

      if (userLocation) {
        setSortBy('Distance');
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      if (showLoadingState) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  //
  const handleSetLocationStatus = async () => {
    const cachedLocation = localStorage.getItem('userLocation');
    if (cachedLocation) {
      try {
        const parsedLocation = JSON.parse(cachedLocation);

        // Only use cached location if it's less than 24 hours old
        if (Date.now() - parsedLocation.timestamp < 24 * 60 * 60 * 1000) {
          setUserLocation({
            lat: parsedLocation.lat,
            lng: parsedLocation.lng,
          });
          setLocationStatus('success');

          // Set sort by distance when location is available, but keep the current filter
          setSortBy('Distance');
        }
      } catch (e) {
        console.error('Error parsing cached location:', e);
      }
    } else {
      // If no cached location, try to get it automatically
      getUserLocation();
    }
  };

  // Initial fetch and check for cached user location
  useEffect(() => {
    // Try to load cached location first
    handleSetLocationStatus();
    // Fetch events regardless of location status
    fetchEvents(true);
  }, []);

  // Set up polling for real-time updates
  useEffect(() => {
    // Try to load cached location first
    handleSetLocationStatus();

    // Only set up polling if we have loaded events at least once
    if (loading && events.length === 0) return;

    // Set up interval to refresh data
    const pollInterval = setInterval(() => {
      fetchEvents(false);
    }, REFRESH_INTERVAL);

    // Clean up interval on component unmount
    return () => clearInterval(pollInterval);
  }, [events, loading]);

  // Add visibility change detection to refresh when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User has returned to the tab - refresh data silently
        fetchEvents(false);
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listener on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Format distance for display
  const formatDistance = (distance: number | null): string => {
    if (distance === null) return 'N/A';
    if (distance >= 10000) return 'Virtual';

    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)} km`;
    } else {
      return `${distance.toFixed(0)} km`;
    }
  };

  // Apply filters and sorting to the events
  const filteredEvents = events.filter((event) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Free' && event.type === 'Free') return true;
    if (activeFilter === 'Paid' && event.type !== 'Free') return true;
    // Fix for VIP filter - check both event type and hasVIPTicket flag
    if (activeFilter === 'VIP' && (event.type === 'VIP' || event.hasVIPTicket)) return true;
    if (activeFilter === 'Regular' && event.hasRegularTicket && event.price.regular > 0)
      return true;
    if (activeFilter === 'Virtual' && event.location.toLowerCase().includes('virtual')) return true;
    if (activeFilter === 'In-Person' && !event.location.toLowerCase().includes('virtual'))
      return true;
    // New filter for nearby events (within 25km)
    if (activeFilter === 'Nearby' && typeof event.distance === 'number' && event.distance < 25)
      return true;
    return false;
  });

  // Enhanced sorting with multiple options including distance
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'Date') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'Popularity') {
      // Sort by attendance percentage (registered/expected)
      const aPopularity = a.attendees.registered / a.attendees.expected;
      const bPopularity = b.attendees.registered / b.attendees.expected;
      return bPopularity - aPopularity; // Higher percentage first
    } else if (sortBy === 'Ticket Price') {
      // Compare regular ticket prices (or minimum prices)
      const aPrice = a.price.regular || 0;
      const bPrice = b.price.regular || 0;
      return aPrice - bPrice; // Lower price first
    } else if (sortBy === 'Distance') {
      // Sort by distance (virtual events come last)
      const aDistance = typeof a.distance === 'number' ? a.distance : 99999;
      const bDistance = typeof b.distance === 'number' ? b.distance : 99999;
      return aDistance - bDistance; // Closer first
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedEvents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = sortedEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-white ml-4">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with refresh indicator and location */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white mb-4">Upcoming Events</h2>
          <div className="flex items-center space-x-4">
            {/* Location button/indicator */}
            {userLocation ? (
              <div className="flex items-center gap-2 text-green-400 p-2 rounded-lg bg-searchBg">
                <MapPin className="w-4 h-4" />
                <span className="font-inter text-xs">Location active</span>
              </div>
            ) : (
              <button
                onClick={getUserLocation}
                disabled={locationStatus === 'loading' || geoPermissionDenied}
                className="flex items-center gap-2 text-textGray hover:text-white p-2 rounded-lg hover:bg-searchBg disabled:opacity-50"
              >
                <Compass
                  className={`w-4 h-4 ${locationStatus === 'loading' ? 'animate-pulse' : ''}`}
                />
                <span className="font-inter text-xs">
                  {locationStatus === 'loading'
                    ? 'Getting location...'
                    : geoPermissionDenied
                    ? 'Location access denied'
                    : 'Enable location'}
                </span>
              </button>
            )}

            {/* Last Refresh time */}
            <span className="font-inter text-xs text-textGray">
              {isRefreshing ? 'Refreshing...' : `Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter as EventFilter);
                // If selecting Nearby filter but no location, prompt for location
                if (filter === 'Nearby' && !userLocation && !geoPermissionDenied) {
                  getUserLocation();
                }
              }}
              className={`px-4 py-2 rounded-2xl font-inter border border-[#3A3A3A] text-sm
                ${
                  activeFilter === filter
                    ? 'bg-[#ff8a00] text-white'
                    : 'text-textGray hover:text-white'
                }
                ${filter === 'Nearby' && !userLocation ? 'relative' : ''}
              `}
            >
              {filter}
              {filter === 'Nearby' && !userLocation && !geoPermissionDenied && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => {
              const newSortBy = e.target.value as
                | 'Date'
                | 'Popularity'
                | 'Ticket Price'
                | 'Distance';
              setSortBy(newSortBy);

              // If sorting by distance but no location, prompt for location
              if (newSortBy === 'Distance' && !userLocation && !geoPermissionDenied) {
                getUserLocation();
              }
            }}
            className="bg-searchBg text-white rounded-lg px-4 py-2 font-inter text-sm"
          >
            <option value="Date">Date</option>
            <option value="Popularity">Popularity</option>
            <option value="Ticket Price">Ticket Price</option>
            <option value="Distance">Distance</option>
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex items-center gap-2 text-textGray hover:text-white p-2 rounded-lg bg-searchBg"
          >
            {viewMode === 'grid' ? (
              <List className="w-4 h-4" />
            ) : (
              <LayoutGrid className="w-4 h-4" />
            )}
            <span className="font-inter text-sm hidden md:inline">
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </span>
          </button>
        </div>
      </div>

      {/* Events Grid/List */}
      <div
        className={`grid gap-6 mb-8 ${
          viewMode === 'grid'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'
        }`}
      >
        {paginatedEvents.length > 0 ? (
          paginatedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={{
                ...event,
                // Add locationInfo as a new property in the event object being passed
                locationInfo:
                  typeof event.distance === 'number' && userLocation
                    ? `${formatDistance(event.distance)} away`
                    : event.location,
              }}
              viewMode={viewMode}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <p className="text-white">No events found matching your filters.</p>
            {activeFilter === 'Nearby' && !userLocation && (
              <div className="mt-4">
                <p className="text-textGray mb-2">Enable location services to see nearby events.</p>
                <button
                  onClick={getUserLocation}
                  disabled={locationStatus === 'loading' || geoPermissionDenied}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-inter text-sm"
                >
                  {locationStatus === 'loading' ? 'Getting location...' : 'Share location'}
                </button>
              </div>
            )}
            {activeFilter === 'Nearby' && userLocation && events.length > 0 && (
              <p className="text-textGray mt-2">
                No events found near your location. Try expanding your search or switching to "All"
                filter.
              </p>
            )}
            {events.length === 0 && (
              <p className="text-textGray mt-2">
                No upcoming events available. Check back later or try refreshing the page.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-inter text-sm
                ${currentPage === 1 ? 'text-textGray opacity-50' : 'text-white hover:bg-searchBg'}`}
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-inter text-sm
                  ${
                    currentPage === index + 1
                      ? 'bg-primary text-white'
                      : 'text-textGray hover:text-white hover:bg-searchBg'
                  }`}
              >
                {index + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-inter text-sm
                ${
                  currentPage === totalPages
                    ? 'text-textGray opacity-50'
                    : 'text-white hover:bg-searchBg'
                }`}
            >
              &gt;
            </button>
          </div>
        </div>
      )}

      {/* Location permission helper */}
      {geoPermissionDenied && (
        <div className="mt-6 p-4 bg-searchBg rounded-lg text-white">
          <h3 className="font-bold mb-2">Location access denied</h3>
          <p className="text-sm text-textGray mb-3">
            To enable location-based features, please update your browser settings to allow location
            access for this site.
          </p>
          <ol className="text-sm text-textGray list-decimal pl-5 space-y-1">
            <li>Click on the lock/info icon in your browser's address bar</li>
            <li>Find "Location" or "Site settings"</li>
            <li>Change the permission to "Allow"</li>
            <li>Refresh the page</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default EventsSection;
