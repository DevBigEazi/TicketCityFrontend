import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar, Ticket, RefreshCw, QrCode } from 'lucide-react';
import { EventImg1 } from '../../assets';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClientInstance, TICKET_CITY_ADDR } from '../../utils/client';
import { formatEther } from 'viem';

const MyEventsComponent = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsWithoutTickets, setEventsWithoutTickets] = useState<Event[]>([]);
  const [balance, setBalance] = useState('••••');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  console.log(lastUpdated);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenuePending: 0,
    refundsIssued: 0,
  }) as any[];
  const initialDataLoaded = useRef(false);

  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const walletAddress = wallets?.[0]?.address;
  const publicClient = createPublicClientInstance();

  // Format date for display - keeping only for backward compatibility
  interface Event {
    id: string;
    title: string;
    image: string;
    location: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    startTimestamp: number;
    endTimestamp: number;
    ticketsSold: number;
    ticketsTotal: number;
    ticketsVerified: number;
    hasEnded: boolean;
    hasNotStarted: boolean;
    isLive: boolean;
    hasTickets: boolean;
    revenue: number;
    canRelease: boolean;
    attendanceRate: number;
  }

  interface Stats {
    totalRevenue: number;
    revenuePending: number;
    refundsIssued: number;
  }

  const formatDate = (timestamp: number | string | undefined): string => {
    if (!timestamp) return 'TBD';

    const eventDate = new Date(Number(timestamp) * 1000);

    // Get today and tomorrow dates for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if date is today or tomorrow
    let dateText;
    if (eventDate.toDateString() === today.toDateString()) {
      dateText = 'Today';
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
      dateText = 'Tomorrow';
    } else {
      dateText = eventDate.toLocaleDateString();
    }

    return (
      dateText +
      ' | ' +
      eventDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  // Get ETN Balance
  const getETNBalance = useCallback(async () => {
    if (!wallets || !wallets.length || !wallets[0]?.address) {
      console.log('No wallet available yet, skipping balance fetch');
      return;
    }

    try {
      const tokenBalanceWei = await publicClient.getBalance({
        address: ethers.utils.getAddress(wallets[0].address),
      });

      const formattedBalance = formatEther(tokenBalanceWei);
      setBalance(parseFloat(formattedBalance).toFixed(4));
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setBalance('••••');
    }
  }, [wallets, publicClient]);

  // Fetch events with tickets using the optimized contract function
  const fetchEventsWithTickets = useCallback(async () => {
    if (!walletAddress) {
      console.log('No wallet address available yet, skipping data fetch');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Use the optimized contract function to get events with tickets
      const eventsWithTicketIds: any[] = await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'getEventsWithTicketByUser',
        args: [walletAddress],
      });

      console.log('Events with tickets IDs:', eventsWithTicketIds);

      if (!eventsWithTicketIds || eventsWithTicketIds.length === 0) {
        console.log('No events with tickets found');
        setEvents([]);
      } else {
        // Process events with tickets
        const eventsWithTickets: Event[] = [];
        let totalRevenue = 0;
        let revenuePending = 0;
        let refundsIssued = 0;

        const eventsData = await Promise.all(
          eventsWithTicketIds.map(async (eventId) => {
            try {
              const eventIdStr = eventId.toString();
              const eventData = await publicClient.readContract({
                address: TICKET_CITY_ADDR,
                abi: TICKET_CITY_ABI,
                functionName: 'getEvent',
                args: [eventId],
              });

              // Check if revenue can be released
              const revenueDetails = await publicClient.readContract({
                address: TICKET_CITY_ADDR,
                abi: TICKET_CITY_ABI,
                functionName: 'canReleaseRevenue',
                args: [eventId],
              });

              const now = Date.now();
              const startTimestamp = Number((eventData as any).startDate) * 1000;
              const endTimestamp = Number((eventData as any).endDate) * 1000;

              const hasEnded = endTimestamp < now;
              const hasNotStarted = startTimestamp > now;
              const isLive = !hasEnded && !hasNotStarted;

              // Process the image URL
              let imageUrl = (eventData as any).imageUri || EventImg1;

              // Calculate revenue info
              const eventRevenue = (revenueDetails as any[])[2]
                ? Number((revenueDetails as any[])[2]) / 1e18
                : 0;

              if (hasEnded) {
                totalRevenue += eventRevenue;
              } else {
                revenuePending += eventRevenue;
              }

              // Format start and end times
              const startDate = new Date(startTimestamp);
              const endDate = new Date(endTimestamp);

              // Get today and tomorrow dates for comparison
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);

              // Format start date with special cases for today/tomorrow
              let formattedStartDate;
              if (startDate.toDateString() === today.toDateString()) {
                formattedStartDate = 'Today';
              } else if (startDate.toDateString() === tomorrow.toDateString()) {
                formattedStartDate = 'Tomorrow';
              } else {
                formattedStartDate = startDate.toLocaleDateString();
              }

              // Format end date with special cases for today/tomorrow
              let formattedEndDate;
              if (endDate.toDateString() === today.toDateString()) {
                formattedEndDate = 'Today';
              } else if (endDate.toDateString() === tomorrow.toDateString()) {
                formattedEndDate = 'Tomorrow';
              } else {
                formattedEndDate = endDate.toLocaleDateString();
              }

              const formattedStartTime = startDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const formattedEndTime = endDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const formattedEvent = {
                id: eventIdStr,
                title: (eventData as any).title || 'Untitled Event',
                image: imageUrl,
                location: (eventData as any).location || 'TBD',
                startDate: formattedStartDate,
                endDate: formattedEndDate,
                startTime: formattedStartTime,
                endTime: formattedEndTime,
                startTimestamp: startTimestamp,
                endTimestamp: endTimestamp,
                ticketsSold: Number((eventData as any).userRegCount),
                ticketsTotal: Number((eventData as any).expectedAttendees),
                ticketsVerified: Number((eventData as any).verifiedAttendeesCount),
                hasEnded,
                hasNotStarted,
                isLive,
                hasTickets: true,
                revenue: eventRevenue,
                canRelease: (revenueDetails as any[])[0],
                attendanceRate: (revenueDetails as any[])[1],
              };

              // Add event to the events with tickets list
              eventsWithTickets.push(formattedEvent);

              return formattedEvent;
            } catch (error) {
              console.error(`Error fetching event with ticket ${eventId}:`, error);
              return null;
            }
          }),
        );

        // Filter out null responses
        const validEvents = eventsData.filter((event) => event !== null);
        console.log('Successfully fetched', validEvents.length, 'events with tickets');

        // Update events with tickets list
        setEvents(eventsWithTickets);

        // Update stats
        setStats({
          totalRevenue,
          revenuePending,
          refundsIssued, // This would need additional logic to calculate
        });
      }

      // Update timestamp
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch events with tickets:', error);
      setEvents([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [walletAddress, publicClient, formatDate]);

  // Fetch events without tickets using the dedicated smart contract function
  const fetchEventsWithoutTickets = useCallback(async () => {
    if (!walletAddress) {
      console.log('No wallet address available for fetching events without tickets');
      return;
    }

    try {
      // Call the smart contract function to get events without tickets
      const eventsWithoutTicketIds = await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'getEventsWithoutTicketsByUser',
        args: [walletAddress],
      });

      const eventsWithoutTicketIdsArray: any[] = eventsWithoutTicketIds as any[];
      console.log('Events without tickets IDs:', eventsWithoutTicketIdsArray);

      if (!Array.isArray(eventsWithoutTicketIds) || eventsWithoutTicketIds.length === 0) {
        console.log('No events without tickets found');
        setEventsWithoutTickets([]);
        return;
      }

      // Fetch details for each event without tickets
      const noTicketsEventsData = await Promise.all(
        eventsWithoutTicketIds.map(async (eventId) => {
          try {
            const eventIdStr = eventId.toString();
            const eventData = await publicClient.readContract({
              address: TICKET_CITY_ADDR,
              abi: TICKET_CITY_ABI,
              functionName: 'getEvent',
              args: [eventId],
            });

            const now = Date.now();
            const startTimestamp = Number((eventData as any).startDate) * 1000;
            const endTimestamp = Number((eventData as any).endDate) * 1000;

            const hasEnded = endTimestamp < now;
            const hasNotStarted = startTimestamp > now;
            const isLive = !hasEnded && !hasNotStarted;

            // Process the image URL
            let imageUrl = (eventData as any).imageUri || EventImg1;

            // Format start and end times
            const startDate = new Date(startTimestamp);
            const endDate = new Date(endTimestamp);

            // Get today and tomorrow dates for comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Format start date with special cases for today/tomorrow
            let formattedStartDate;
            if (startDate.toDateString() === today.toDateString()) {
              formattedStartDate = 'Today';
            } else if (startDate.toDateString() === tomorrow.toDateString()) {
              formattedStartDate = 'Tomorrow';
            } else {
              formattedStartDate = startDate.toLocaleDateString();
            }

            // Format end date with special cases for today/tomorrow
            let formattedEndDate;
            if (endDate.toDateString() === today.toDateString()) {
              formattedEndDate = 'Today';
            } else if (endDate.toDateString() === tomorrow.toDateString()) {
              formattedEndDate = 'Tomorrow';
            } else {
              formattedEndDate = endDate.toLocaleDateString();
            }

            const formattedStartTime = startDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const formattedEndTime = endDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const formattedEvent: Event = {
              id: eventIdStr,
              title: (eventData as any).title || 'Untitled Event',
              image: imageUrl,
              location: (eventData as any).location || 'TBD',
              startDate: formattedStartDate,
              endDate: formattedEndDate,
              startTime: formattedStartTime,
              endTime: formattedEndTime,
              startTimestamp: startTimestamp,
              endTimestamp: endTimestamp,
              ticketsSold: 0, // Default value
              ticketsTotal: Number((eventData as any).expectedAttendees),
              ticketsVerified: 0, // Default value
              hasEnded,
              hasNotStarted,
              isLive,
              hasTickets: false,
              revenue: 0, // Default value
              canRelease: false, // Default value
              attendanceRate: 0, // Default value
            };

            return formattedEvent;
          } catch (error) {
            console.error(`Error fetching event without tickets ${eventId}:`, error);
            return null;
          }
        }),
      );

      // Filter out null responses
      const validEventsWithoutTickets = noTicketsEventsData.filter((event) => event !== null);
      console.log(
        'Successfully fetched',
        validEventsWithoutTickets.length,
        'events without tickets',
      );

      // Update events without tickets list
      setEventsWithoutTickets(validEventsWithoutTickets);
    } catch (error) {
      console.error('Failed to fetch events without tickets:', error);
      setEventsWithoutTickets([]);
    }
  }, [walletAddress, publicClient, formatDate]);

  // Fetch all event data
  const fetchAllEventData = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch both types of events in parallel
      await Promise.all([fetchEventsWithTickets(), fetchEventsWithoutTickets()]);
    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, fetchEventsWithTickets, fetchEventsWithoutTickets]);

  // Initial data fetch on wallet connection
  useEffect(() => {
    // Only fetch if authenticated, wallet is connected, and data hasn't been loaded yet
    if (authenticated && wallets?.length > 0 && !initialDataLoaded.current) {
      console.log('Wallet connected, fetching initial data...');
      getETNBalance();
      fetchAllEventData();
      initialDataLoaded.current = true;
    } else if (!authenticated || wallets?.length === 0) {
      setBalance('••••');
      setLoading(false);
      // Reset the ref if wallet disconnects
      initialDataLoaded.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, wallets?.length, getETNBalance]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    if (isRefreshing) return;

    console.log('Manual refresh triggered');
    setIsRefreshing(true);

    getETNBalance();
    fetchAllEventData();
  };

  // Filter events based on active tab
  const filteredEvents = events.filter((event) => {
    if (activeTab === 'upcoming') return event.hasNotStarted;
    if (activeTab === 'ongoing') return event.isLive;
    if (activeTab === 'past') return event.hasEnded;
    return true;
  });

  // If not authenticated, show connect wallet UI
  if (!authenticated) {
    return (
      <div className="w-full min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">My Events Dashboard</h2>
          <p className="text-textGray mb-6">Connect your wallet to view your events</p>
        </div>
        <button
          onClick={() => login()}
          className="bg-primary rounded-lg px-6 py-3 font-poppins text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-white ml-4">Loading your events...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background p-6">
      {/* Welcome Header with Refresh Button */}
      <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <h1 className="text-white text-2xl md:text-3xl font-poppins">
            Welcome, <span className="text-[#8B5CF6]">Organizer</span>
          </h1>
          <div className="flex mt-4 md:mt-0 gap-4">
            <div className="flex items-center bg-[#201c2b] px-4 py-2 rounded-lg">
              <span className="font-poppins text-white mr-2">ETN Balance: {balance}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-transparent border border-primary text-primary rounded-lg px-4 py-2 font-poppins hover:bg-primary/10 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl hover:scale-105 hover:shadow-button-inset border border-borderStroke shadow-light-inset-shadow p-6">
          <h3 className="text-white text-lg font-poppins mb-2">Total Revenue</h3>
          <p className="text-primary text-2xl font-bold">{stats.totalRevenue.toFixed(2)} ETN</p>
        </div>
        <div className="rounded-2xl hover:scale-105 hover:shadow-button-inset border border-borderStroke shadow-light-inset-shadow p-6">
          <h3 className="text-white text-lg font-poppins mb-2">Revenue Pending</h3>
          <p className="text-primary text-2xl font-bold">{stats.revenuePending.toFixed(2)} ETN</p>
        </div>
        <div className="rounded-2xl hover:scale-105 hover:shadow-button-inset border border-borderStroke shadow-light-inset-shadow p-6">
          <h3 className="text-white text-lg font-poppins mb-2">Refunds Issued</h3>
          <p className="text-primary text-2xl font-bold">{stats.refundsIssued.toFixed(2)} ETN</p>
        </div>
      </div>

      {/* My Events Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-2xl font-poppins">
            My <span className="text-[#8B5CF6]">Events</span>
          </h2>
          <button
            onClick={() => navigate('/create-event')}
            className="bg-primary rounded-lg px-4 py-2 font-poppins text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={24} />
            Create New Event
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['upcoming', 'ongoing', 'past'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-poppins ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : ' text-textGray border border-borderStroke hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Event Cards Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-borderStroke shadow-button-inset overflow-hidden"
              >
                <img src={event.image} alt={event.title} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h3 className="text-white text-xl font-poppins mb-3">{event.title}</h3>
                  <div className="flex items-center text-textGray mb-2">
                    <MapPin size={16} className="mr-2 text-primary" />
                    <span className="text-sm">{event.location}</span>
                  </div>
                  <div className="flex flex-col gap-2 mb-3 border-y border-primary/30 py-2 my-3">
                    <div className="flex items-center">
                      <div className="bg-primary/20 p-1 rounded mr-2">
                        <Calendar size={16} className="text-primary" />
                      </div>
                      <span className="text-sm text-white">
                        <span className="text-primary font-medium">Start:</span> {event.startDate} |{' '}
                        {event.startTime}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-primary/20 p-1 rounded mr-2">
                        <Calendar size={16} className="text-primary" />
                      </div>
                      <span className="text-sm text-white">
                        <span className="text-primary font-medium">End:</span> {event.endDate} |{' '}
                        {event.endTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center text-textGray mb-4">
                    <Ticket size={16} className="mr-2 text-primary" />
                    <span className="text-sm">
                      Tickets Sold: {event.ticketsSold}/{event.ticketsTotal}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/manage-event/${event.id}`)}
                      className="flex-1 bg-primary rounded-2xl py-1 text-center text-white font-inter font-normal hover:opacity-90 transition-opacity"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => navigate(`/attendance-scan?eventId=${event.id}`)}
                      className="flex items-center justify-center bg-blue-500 rounded-2xl px-3 text-white font-inter font-normal hover:opacity-90 transition-opacity"
                      title="Scan QR for Attendance"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-[#1c1827] rounded-xl border border-borderStroke">
            <p className="text-textGray">No {activeTab} events found</p>
          </div>
        )}
      </div>

      {/* Events Without Tickets Section */}
      {eventsWithoutTickets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white text-2xl font-poppins mb-6">
            Events <span className="text-amber-400">Without Tickets</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventsWithoutTickets.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-borderStroke shadow-button-inset overflow-hidden"
              >
                <div className="relative">
                  <img src={event.image} alt={event.title} className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 bg-amber-400 text-black px-3 py-1 rounded-full text-xs font-medium">
                    No Tickets Created
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white text-xl font-poppins mb-3">{event.title}</h3>
                  <div className="flex items-center text-textGray mb-2">
                    <MapPin size={16} className="mr-2" />
                    <span className="text-sm">{event.location}</span>
                  </div>
                  <div className="flex items-start mb-3">
                    <Calendar size={16} className="mr-2 mt-0.5 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-sm text-white">
                        <span className="text-primary font-medium">Start:</span> {event.startDate} |{' '}
                        {event.startTime}
                      </span>
                      <span className="text-sm text-white">
                        <span className="text-primary font-medium">End:</span> {event.endDate} |{' '}
                        {event.endTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center text-textGray mb-4">
                    <Ticket size={16} className="mr-2" />
                    <span className="text-sm">Capacity: {event.ticketsTotal}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="w-full bg-amber-400 text-black rounded-2xl py-1 text-center font-inter font-normal hover:bg-amber-500 transition-colors"
                  >
                    Create Tickets
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEventsComponent;
