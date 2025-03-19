import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutGrid, List, MapPin, Compass } from 'lucide-react';
import EventCard from './EventsCard';
import { useNetwork } from '../../contexts/NetworkContext';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { calculateDistance, geocodeLocation } from '../../utils/locationMap';
import { formatDate, formatDistance } from '../../utils/utils';
import { safeContractRead } from '../../config/client';
import { UIEvent, EventFilter } from '../../types';
import { zeroAddress } from 'viem';

const ITEMS_PER_PAGE = 8;

// Filters to match contract's ticket type categories
const filters: EventFilter[] = [
  'All',
  'Free',
  'Paid',
  'Regular',
  'VIP',
  'Virtual',
  'In-Person',
  'Nearby',
];

const EventsSection: React.FC = () => {
  // Get network context
  const {
    isTestnet,
    chainId,
    isConnected,
    getPublicClient,
    getActiveContractAddress,
    refreshData,
    contractEvents,
  } = useNetwork();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<EventFilter>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>('Date');
  const [events, setEvents] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoPermissionDenied, setGeoPermissionDenied] = useState<boolean>(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string>('idle');
  const [networkSwitched, setNetworkSwitched] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const previousChainIdRef = useRef<number | null>(null);

  // Get ticket type based on event data
  const getTicketType = (eventData: any): string => {
    if (!eventData) return 'Unknown';

    if (Number(eventData.ticketType) === 0) return 'Free';

    // Check if event has VIP tickets
    const hasRegular = eventData.paidTicketCategory === 1; // PaidTicketCategory.REGULAR takes nuber 1 position in enum
    const hasVIP = eventData.paidTicketCategory === 2; // PaidTicketCategory.VIP takes nuber 2 position in enum
    if (hasVIP && hasRegular) return 'Paid';

    return 'Paid';
  };

  // Function to get user's location
  const getUserLocation = (): void => {
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

  // Fetch events from blockchain
  const fetchEvents = useCallback(
    async (showLoadingState = true): Promise<void> => {
      if (showLoadingState) {
        setLoading(true);
        setErrorMessage('');
      } else {
        setIsRefreshing(true);
      }

      // Get the public client based on current network
      const publicClient = getPublicClient();

      // Get the correct contract address based on current network
      const contractAddress = getActiveContractAddress();

      //   console.log(`Fetching events for network: ${isTestnet ? 'Testnet' : 'Mainnet'}`);
      //   console.log(`Using contract address: ${contractAddress}`);

      try {
        // Get valid event IDs using safeContractRead
        let validEventIds: bigint[];
        try {
          validEventIds = (await safeContractRead(
            publicClient,
            {
              address: contractAddress,
              abi: TICKET_CITY_ABI,
              functionName: 'getAllValidEvents',
              args: [],
            },
            isTestnet,
          )) as bigint[];
        } catch (error: any) {
          console.error('Error fetching valid events:', error);
          setErrorMessage(`Failed to fetch events: ${error.message}`);
          if (!showLoadingState) {
            setIsRefreshing(false);
          } else {
            setLoading(false);
          }
          return;
        }

        console.log('Valid event IDs:', validEventIds);

        if (!validEventIds || !Array.isArray(validEventIds) || validEventIds.length === 0) {
          console.warn('No valid events found');
          setEvents([]);

          if (!showLoadingState) {
            setIsRefreshing(false);
          } else {
            setLoading(false);
          }
          return;
        }

        // Fetch each event's details using the getEvent function
        const eventsData = await Promise.all(
          validEventIds.map(async (eventId) => {
            try {
              const eventData = await safeContractRead(
                publicClient,
                {
                  address: contractAddress,
                  abi: TICKET_CITY_ABI,
                  functionName: 'getEvent',
                  args: [eventId],
                },
                isTestnet,
              );

              console.log(`Event ${eventId} data:`, eventData);
              return { eventId, eventData };
            } catch (error) {
              console.error(`Error fetching event ${eventId}:`, error);
              return null;
            }
          }),
        );

        // Fetch ticket details for each event and geocode locations
        const formattedEvents = await Promise.all(
          eventsData
            .filter((event): event is { eventId: bigint; eventData: any } => event !== null)
            .map(async ({ eventId, eventData }) => {
              if (!eventData) return null;

              // Check if event has ended
              const hasEnded = Number(eventData.endDate) * 1000 < Date.now();

              // Get ticket details for events
              let regularPrice = 0;
              let vipPrice = 0;
              let hasRegularTicket = false;
              let hasVIPTicket = false;
              let hasTicketCreated = false;

              try {
                // Fetch ticket details for both free and paid events
                const eventTickets = await safeContractRead(
                  publicClient,
                  {
                    address: contractAddress,
                    abi: TICKET_CITY_ABI,
                    functionName: 'eventTickets',
                    args: [eventId],
                  },
                  isTestnet,
                );

                console.log(`Event ${eventId} tickets:`, eventTickets);

                // Check if ticket data is an array (legacy format) or object (new format)
                if (Array.isArray(eventTickets)) {
                  hasRegularTicket = Boolean(eventTickets[0]);
                  hasVIPTicket = Boolean(eventTickets[1]);
                  regularPrice = hasRegularTicket ? Number(eventTickets[2]) / 1e18 : 0;
                  vipPrice = hasVIPTicket ? Number(eventTickets[3]) / 1e18 : 0;
                } else {
                  const tickets = eventTickets as any;
                  hasRegularTicket = Boolean(tickets.hasRegularTicket);
                  hasVIPTicket = Boolean(tickets.hasVIPTicket);
                  regularPrice = hasRegularTicket ? Number(tickets.regularTicketFee) / 1e18 : 0;
                  vipPrice = hasVIPTicket ? Number(tickets.vipTicketFee) / 1e18 : 0;
                }

                // Check if any ticket type is available
                hasTicketCreated =
                  hasRegularTicket || hasVIPTicket || Number(eventData.ticketType) === 0; // Free events are always considered to have tickets

                // For free events, ensure they're marked as having tickets if NFT address exists
                if (
                  Number(eventData.ticketType) === 0 &&
                  eventData.ticketNFTAddr &&
                  eventData.ticketNFTAddr !== zeroAddress
                ) {
                  hasTicketCreated = true;
                }
              } catch (error) {
                console.error(`Error fetching ticket details for event ${eventId}:`, error);
                // For backwards compatibility, check if ticketFee is set
                if (eventData.ticketFee) {
                  regularPrice = Number(eventData.ticketFee) / 1e18 || 0;
                  vipPrice = regularPrice * 2 || 0; // Estimate VIP as double regular price
                  hasRegularTicket = regularPrice > 0;
                  hasVIPTicket = false;
                  hasTicketCreated = hasRegularTicket;
                }
              }

              // Validate and process the image URL
              let imageUrl = eventData.imageUri || '/placeholder-event.jpg';

              // Get remaining tickets
              const remainingTickets =
                Number(eventData.expectedAttendees) - Number(eventData.userRegCount);

              // Geocode location to get coordinates
              const locationStr = eventData.location || 'TBD';
              let coordinates = null;
              try {
                coordinates = await geocodeLocation(locationStr);
              } catch (error) {
                console.error(`Error geocoding location for event ${eventId}:`, error);
              }

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

              // Create proper event object with typed rawData
              const event: UIEvent = {
                id: eventId.toString(),
                type: getTicketType(eventData),
                title: eventData.title || 'Untitled Event',
                description: eventData.desc || 'No description available',
                location: locationStr,
                coordinates: coordinates,
                distance: distance,
                date: formatDate(eventData.startDate),
                endDate: formatDate(eventData.endDate),
                price: {
                  regular: regularPrice,
                  vip: vipPrice,
                },
                image: imageUrl,
                organiser: eventData.organiser,
                attendees: {
                  registered: Number(eventData.userRegCount),
                  expected: Number(eventData.expectedAttendees),
                  verified: Number(eventData.verifiedAttendeesCount),
                },
                remainingTickets: remainingTickets,
                hasEnded: hasEnded,
                hasTicketCreated: hasTicketCreated,
                hasRegularTicket: hasRegularTicket,
                hasVIPTicket: hasVIPTicket,
                isVerified: false,
                startTimestamp: Number(eventData.startDate) * 1000,
                rawData: {
                  ...eventData,
                  startDate: eventData.startDate,
                  endDate: eventData.endDate,
                },
              };

              return event;
            }),
        );

        // Remove any null events
        const validEvents = formattedEvents.filter((event): event is UIEvent => event !== null);

        console.log('Formatted events:', validEvents);

        // Filter out events that have not ended AND ensure at least one ticket is available
        const activeEvents = validEvents.filter(
          (event) => !event.hasEnded && event.hasTicketCreated,
        );

        console.log('Active events with tickets:', activeEvents);
        setEvents(activeEvents);

        // Update the last updated timestamp
        setLastUpdated(new Date());

        if (userLocation) {
          setSortBy('Distance');
        }

        // Reset network switched flag if it was set
        if (networkSwitched) {
          setNetworkSwitched(false);
        }
      } catch (error: any) {
        console.error('Failed to fetch events:', error);
        setErrorMessage(`Failed to fetch events: ${error.message}`);
      } finally {
        if (showLoadingState) {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [
      isTestnet,
      chainId,
      isConnected,
      getPublicClient,
      getActiveContractAddress,
      userLocation,
      networkSwitched,
    ],
  );

  // Handle cached location
  const handleCachedLocation = async (): Promise<void> => {
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

  // Initial data fetch only
  useEffect(() => {
    // Fetch events for the first time
    fetchEvents(true).then(() => {
      setInitialLoadComplete(true);
    });

    // Set initial chain ID reference
    previousChainIdRef.current = chainId;
  }, []);

  // Watch for contract events from NetworkContext and update data when they occur
  useEffect(() => {
    if (initialLoadComplete && contractEvents.length > 0) {
      // Refresh data when new contract events are detected
      fetchEvents(false);
    }
  }, [initialLoadComplete, contractEvents, fetchEvents]);

  // Handle cached location status
  useEffect(() => {
    handleCachedLocation();
  }, []);

  // Monitor network changes and refresh data when network changes
  useEffect(() => {
    // Skip if not initialized yet
    if (previousChainIdRef.current === null) {
      previousChainIdRef.current = chainId;
      return;
    }

    // Check if chain ID has changed
    if (previousChainIdRef.current !== chainId) {
      console.log(`Network changed from chain ID ${previousChainIdRef.current} to ${chainId}`);

      // Update reference
      previousChainIdRef.current = chainId;

      // Clear events to avoid showing wrong data during transition
      setEvents([]);

      // Set network switched flag
      setNetworkSwitched(true);

      // Refresh data
      refreshData();
      fetchEvents(true);
    } else if (initialLoadComplete && !isConnected) {
      // Network connection lost
      fetchEvents(false);
    }
  }, [chainId, isTestnet, isConnected, fetchEvents, initialLoadComplete, refreshData]);

  // Apply filters and sorting to the events
  const filteredEvents = events.filter((event) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Free' && event.type === 'Free') return true;
    if (activeFilter === 'Paid' && event.type !== 'Free') return true;
    // check both event type and hasVIPTicket flag
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
      return (a.startTimestamp || 0) - (b.startTimestamp || 0);
    } else if (sortBy === 'Popularity') {
      // Sort by attendance percentage (registered/expected)
      const aPopularity = a.attendees.registered / (a.attendees.expected || 1);
      const bPopularity = b.attendees.registered / (b.attendees.expected || 1);
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
      {/* Header with refresh indicator, location and network info */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Upcoming Events</h2>
            <p className="text-textGray text-sm">
              Network: {isTestnet ? 'Testnet' : 'Mainnet'}
              {!isConnected && ' (RPC Error)'}
            </p>
          </div>
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

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg">
          <p className="text-red-500 text-sm">{errorMessage}</p>
          <button
            onClick={() => {
              setErrorMessage('');
              fetchEvents(true);
            }}
            className="mt-2 text-xs text-white bg-red-500 px-3 py-1 rounded"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
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
              const newSortBy = e.target.value;
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
            className=" hidden md:flex items-center gap-2 text-textGray hover:text-white p-2 rounded-lg bg-searchBg"
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

      {/* Event count display */}
      {!loading && !isRefreshing && (
        <div className="mb-4 text-sm text-textGray">
          Showing {paginatedEvents.length} of {sortedEvents.length} events
          {activeFilter !== 'All' ? ` (filtered by ${activeFilter})` : ''}
          {sortBy !== 'Date' ? ` (sorted by ${sortBy})` : ''}
        </div>
      )}

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
                No upcoming events available on the {isTestnet ? 'Testnet' : 'Mainnet'} network.
                {isTestnet ? ' Try switching to Mainnet.' : ' Try again later.'}
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
