import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar, Ticket, RefreshCw, QrCode } from 'lucide-react';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { safeContractRead } from '../../utils/client';
import { useNetwork } from '../../contexts/NetworkContext';
import { MyEvent, Stats } from '../../types';

const MyEvents = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'past'>('upcoming');
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [eventsWithoutTickets, setEventsWithoutTickets] = useState<MyEvent[]>([]);
  const [balance, setBalance] = useState<string>('••••');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    revenuePending: 0,
    refundsIssued: 0,
  });
  const initialDataLoaded = useRef<boolean>(false);
  const previousChainIdRef = useRef<number | null>(null);

  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  // Get network context
  const {
    isTestnet,
    chainId,
    isConnected,
    getPublicClient,
    getActiveContractAddress,
    tokenBalance,
    currentWalletAddress,
    checkRPCStatus,
    refreshData,
    networkName,
  } = useNetwork();

  // Get ETN Balance using NetworkContext
  const getETNBalance = useCallback(() => {
    // Directly update balance from tokenBalance in NetworkContext
    if (tokenBalance && tokenBalance !== 'Loading...' && tokenBalance !== '--') {
      setBalance(tokenBalance);
    } else {
      setBalance('••••');
    }
  }, [tokenBalance]);

  // Fetch events with tickets using the optimized contract function
  const fetchEventsWithTickets = useCallback(async () => {
    if (!currentWalletAddress || !isConnected) {
      console.log('No wallet address available or network not connected, skipping data fetch');
      setLoading(false);
      return;
    }

    // Check RPC connection first
    const rpcConnected = await checkRPCStatus();
    if (!rpcConnected) {
      console.error('RPC connection error. Cannot fetch events.');
      setLoading(false);
      return;
    }

    try {
      // Get client and contract address
      const publicClient = getPublicClient();
      const contractAddress = getActiveContractAddress();

      // Use the contract function to get events with tickets
      const eventsWithTicketIds = (await safeContractRead(
        publicClient,
        {
          address: contractAddress,
          abi: TICKET_CITY_ABI,
          functionName: 'getEventsWithTicketByUser',
          args: [currentWalletAddress],
        },
        isTestnet,
      )) as unknown[];

      console.log('Events with tickets IDs:', eventsWithTicketIds);

      if (!eventsWithTicketIds || eventsWithTicketIds.length === 0) {
        console.log('No events with tickets found');
        setEvents([]);
        setStats({
          totalRevenue: 0,
          revenuePending: 0,
          refundsIssued: 0,
        });
      } else {
        // Process events with tickets
        const eventsWithTickets: MyEvent[] = [];
        let totalRevenue = 0;
        let revenuePending = 0;
        let refundsIssued = 0;

        const eventsData = await Promise.all(
          eventsWithTicketIds.map(async (eventId) => {
            try {
              let eventIdStr: string;
              if (typeof eventId === 'bigint' || typeof eventId === 'number') {
                eventIdStr = eventId.toString();
              } else if (typeof eventId === 'string') {
                eventIdStr = eventId;
              } else {
                // Handle other cases or throw an error
                throw new Error('eventId is not a valid type');
              }

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

              // Check if revenue can be released
              const revenueDetails = await safeContractRead(
                publicClient,
                {
                  address: contractAddress,
                  abi: TICKET_CITY_ABI,
                  functionName: 'canReleaseRevenue',
                  args: [eventId],
                },
                isTestnet,
              );

              const now = Date.now();
              const startTimestamp = Number((eventData as any).startDate) * 1000;
              const endTimestamp = Number((eventData as any).endDate) * 1000;

              const hasEnded = endTimestamp < now;
              const hasNotStarted = startTimestamp > now;
              const isLive = !hasEnded && !hasNotStarted;

              // Process the image URL
              let imageUrl = (eventData as any).imageUri || '/placeholder-event.jpg';

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

              const formattedEvent: MyEvent = {
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
        const validEvents = eventsData.filter((event): event is MyEvent => event !== null);
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
  }, [
    currentWalletAddress,
    isConnected,
    checkRPCStatus,
    getPublicClient,
    getActiveContractAddress,
    isTestnet,
  ]);

  // Fetch events without tickets
  const fetchEventsWithoutTickets = useCallback(async () => {
    if (!currentWalletAddress || !isConnected) {
      console.log('No wallet address available for fetching events without tickets');
      return;
    }

    try {
      // Get client and contract address
      const publicClient = getPublicClient();
      const contractAddress = getActiveContractAddress();

      // Call the smart contract function to get events without tickets
      const eventsWithoutTicketIds = await safeContractRead(
        publicClient,
        {
          address: contractAddress,
          abi: TICKET_CITY_ABI,
          functionName: 'getEventsWithoutTicketsByUser',
          args: [currentWalletAddress],
        },
        isTestnet,
      );

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

            const now = Date.now();
            const startTimestamp = Number((eventData as any).startDate) * 1000;
            const endTimestamp = Number((eventData as any).endDate) * 1000;

            const hasEnded = endTimestamp < now;
            const hasNotStarted = startTimestamp > now;
            const isLive = !hasEnded && !hasNotStarted;

            // Process the image URL
            let imageUrl = (eventData as any).imageUri || '/placeholder-event.jpg';

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

            const formattedEvent: MyEvent = {
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
      const validEventsWithoutTickets = noTicketsEventsData.filter(
        (event): event is MyEvent => event !== null,
      );
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
  }, [currentWalletAddress, isConnected, getPublicClient, getActiveContractAddress, isTestnet]);

  // Fetch all event data
  const fetchAllEventData = useCallback(async () => {
    if (!currentWalletAddress) {
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
  }, [currentWalletAddress, fetchEventsWithTickets, fetchEventsWithoutTickets]);

  // Update balance immediately whenever tokenBalance changes
  useEffect(() => {
    getETNBalance();
  }, [tokenBalance, getETNBalance]);

  // Initial data fetch on wallet connection
  useEffect(() => {
    // Only fetch if authenticated and wallet is connected
    if (authenticated && wallets?.length > 0) {
      console.log('Wallet connected, fetching initial data...');
      fetchAllEventData();
      initialDataLoaded.current = true;

      // Initialize chainId reference
      previousChainIdRef.current = chainId;
    } else if (!authenticated || wallets?.length === 0) {
      setBalance('••••');
      setLoading(false);
      // Reset the ref if wallet disconnects
      initialDataLoaded.current = false;
    }
  }, [authenticated, wallets?.length, fetchAllEventData, chainId]);

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
      setEventsWithoutTickets([]);

      // Set loading state
      setLoading(true);

      // Refresh data
      refreshData();
      fetchAllEventData();
    } else if (initialDataLoaded.current && !isConnected) {
      // Network connection lost
      fetchAllEventData();
    }
  }, [chainId, isTestnet, isConnected, fetchAllEventData, initialDataLoaded, refreshData]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    if (isRefreshing) return;

    console.log('Manual refresh triggered');
    setIsRefreshing(true);

    refreshData(); // Use the NetworkContext refreshData method
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
      {/* Welcome Header with Refresh Button and Network Info */}
      <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-poppins mb-1">
              Welcome, <span className="text-[#8B5CF6]">Organizer</span>
            </h1>
            <p className="text-sm text-textGray">
              Connected to {networkName}
              {!isConnected && ' (RPC Error)'}
            </p>
          </div>
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
        {/* Last Updated Timestamp */}
        <div className="mt-4 text-xs text-textGray flex items-center">
          <span>Last updated: {lastUpdated.toLocaleString()}</span>
          {isRefreshing && <span className="ml-2 text-primary animate-pulse">Updating...</span>}
        </div>
      </div>

      {/* Network error message */}
      {!isConnected && (
        <div className="mb-6 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
          <p className="text-red-400 font-medium mb-1">Network Connection Error</p>
          <p className="text-sm text-red-300">
            Cannot connect to the {isTestnet ? 'Testnet' : 'Mainnet'} RPC. Events may not be
            up-to-date. Please check your network connection and try again.
          </p>
          <button
            onClick={() => fetchAllEventData()}
            className="mt-2 px-4 py-1 bg-red-500 text-white rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      )}

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
              onClick={() => setActiveTab(tab as 'upcoming' | 'ongoing' | 'past')}
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
            {!isConnected && (
              <p className="text-red-300 mt-2">
                Network connection issues may prevent displaying your events.
              </p>
            )}
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

export default MyEvents;
