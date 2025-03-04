import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, Calendar, Ticket } from 'lucide-react';
import EventCard from './EventsCard';
import { Event, EventFilter, ViewMode } from '../../types';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { createPublicClientInstance, TICKET_CITY_ADDR } from '../../utils/client';

const ITEMS_PER_PAGE = 12;

// Updated filters to match contract's ticket type categories
const filters = ['All', 'Free', 'Paid', 'Regular', 'VIP', 'Virtual', 'In-Person'];

const EventsSection: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<EventFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'Date' | 'Popularity' | 'Ticket Price'>('Date');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const publicClient = createPublicClientInstance();

  // Helper function to format Unix timestamp to readable date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'TBD';
    const date = new Date(Number(timestamp) * 1000);
    return `${date.toLocaleDateString()} | ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  // Enhanced to better match contract's ticket type structure
  const getTicketType = (eventData: any) => {
    if (Number(eventData.ticketType) === 0) return 'Free';

    // Check if event has VIP tickets
    const hasVIP = eventData.paidTicketCategory === 2; // Assuming PaidTicketCategory.VIP is 2
    if (hasVIP) return 'VIP';

    return 'Paid'; // Default for paid tickets
  };

  // Fetch events from blockchain
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
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
          setLoading(false);
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
          })
        );

        // Step 3: Fetch ticket details for each event
        const formattedEvents = await Promise.all(
          eventsData
            .filter(event => event !== null)
            .map(async ({ eventId, eventData }) => {
              // Check if event has ended
              const hasEnded = Number(eventData.endDate) * 1000 < Date.now();
              
              // Get ticket details for paid events
              let regularPrice = 0;
              let vipPrice = 0;

              try {
                // For paid events, get ticket details
                if (Number(eventData.ticketType) === 1) { // PAID event
                  const eventTickets = await publicClient.readContract({
                    address: TICKET_CITY_ADDR,
                    abi: TICKET_CITY_ABI,
                    functionName: 'eventTickets',
                    args: [eventId],
                  });

                  if (eventTickets) {
                    regularPrice = eventTickets.hasRegularTicket
                      ? Number(eventTickets.regularTicketFee) / 1e18
                      : 0;
                    vipPrice = eventTickets.hasVIPTicket
                      ? Number(eventTickets.vipTicketFee) / 1e18
                      : 0;
                  }
                }
              } catch (error) {
                console.error(`Error fetching ticket details for event ${eventId}:`, error);
                // Fallback to ticketFee from event data
                regularPrice = Number(eventData.ticketFee) / 1e18 || 0;
                vipPrice = regularPrice * 2 || 0; // Estimate VIP as double regular price
              }

              // Validate and process the image URL
              let imageUrl = eventData.imageUri || '/placeholder-event.jpg';

              // Get remaining tickets
              const remainingTickets =
                Number(eventData.expectedAttendees) - Number(eventData.userRegCount);

              return {
                id: eventId.toString(),
                type: getTicketType(eventData),
                title: eventData.title,
                description: eventData.desc,
                location: eventData.location,
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
                rawData: eventData // Keep raw data for debugging
              };
            })
        );

        console.log('Formatted events:', formattedEvents);
        
        // Filter out events that have ended
        const activeEvents = formattedEvents.filter(event => !event.hasEnded);
        setEvents(activeEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Apply filters and sorting to the events
  const filteredEvents = events.filter((event) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Free' && event.type === 'Free') return true;
    if (activeFilter === 'Paid' && event.type !== 'Free') return true;
    if (activeFilter === 'Regular' && event.price.regular > 0 && event.type !== 'VIP') return true;
    if (activeFilter === 'VIP' && event.type === 'VIP') return true;
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
      {/* Header with stats */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Upcoming Events</h2>
        <div className="flex flex-wrap gap-4">
          <div className="bg-searchBg rounded-lg p-4 flex items-center">
            <Calendar className="text-primary mr-2" />
            <div>
              <p className="text-sm text-textGray">Total Events</p>
              <p className="text-xl font-bold text-white">{events.length}</p>
            </div>
          </div>
          <div className="bg-searchBg rounded-lg p-4 flex items-center">
            <Ticket className="text-primary mr-2" />
            <div>
              <p className="text-sm text-textGray">Available Events</p>
              <p className="text-xl font-bold text-white">
                {events.filter((e) => !e.hasEnded && e.remainingTickets > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full font-inter text-sm
                ${
                  activeFilter === filter
                    ? 'bg-searchBg shadow-button-inset text-white'
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