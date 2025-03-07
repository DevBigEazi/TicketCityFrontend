import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, RefreshCw } from 'lucide-react';
import EventCard from './EventsCard';
import { UIEvent, EventFilter, ViewMode } from '../../types';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { createPublicClientInstance, TICKET_CITY_ADDR } from '../../utils/client';

const ITEMS_PER_PAGE = 12;
const REFRESH_INTERVAL = 30000; // 30 seconds

// Updated filters to match contract's ticket type categories
const filters = ['All', 'Free', 'Paid', 'Regular', 'VIP', 'Virtual', 'In-Person'];

const EventsSection: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<EventFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'Date' | 'Popularity' | 'Ticket Price'>('Date');
  const [events, setEvents] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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

  // Fetch events from blockchain - modified to support silent refreshes
  const fetchEvents = async (showLoadingState = true) => {
    if (showLoadingState) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Step 1: Get valid event IDs from the contract using getAllValidEvents
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

      // Step 2: Fetch each event's details using the getEvent function
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

      // Step 3: Fetch ticket details for each event
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

            // Create proper UIEvent object with typed rawData
            const event: UIEvent = {
              id: eventId.toString(),
              type: getTicketType(eventData),
              title: (eventData as any).title || 'Untitled Event',
              description: (eventData as any).desc || 'No description available',
              location: (eventData as any).location || 'TBD',
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

  // Initial fetch - with loading state
  useEffect(() => {
    fetchEvents(true);
  }, []);

  // Set up polling for real-time updates
  useEffect(() => {
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

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchEvents(false);
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
    return false;
  });

  // Enhanced sorting with multiple options
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
      {/* Header with refresh indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white mb-4">Upcoming Events</h2>
          <div className="flex items-center">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 text-textGray hover:text-white p-2 rounded-lg hover:bg-searchBg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-inter text-xs text-textGray">
                {isRefreshing
                  ? 'Refreshing...'
                  : `Last updated: ${lastUpdated.toLocaleTimeString()}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as EventFilter)}
              className={`px-4 py-2 rounded-2xl font-inter border border-[#3A3A3A] text-sm
                ${
                  activeFilter === filter
                    ? 'bg-[#ff8a00]  text-white'
                    : 'text-textGray hover:text-white'
                }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-searchBg text-white rounded-lg px-4 py-2 font-inter text-sm"
          >
            <option value="Date">Date</option>
            <option value="Popularity">Popularity</option>
            <option value="Ticket Price">Ticket Price</option>
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
            <EventCard key={event.id} event={event} viewMode={viewMode} />
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <p className="text-white">No events found matching your filters.</p>
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
    </div>
  );
};

export default EventsSection;
