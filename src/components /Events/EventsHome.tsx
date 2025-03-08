import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Copy, CheckCircle, Clock, Wallet } from 'lucide-react';
import EventCard from './EventsCard';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClientInstance, TICKET_CITY_ADDR } from '../../utils/client';
import { encodeFunctionData, formatEther } from 'viem';

// Define interfaces for the event data structure
interface EventData {
  title: string;
  desc: string;
  location: string;
  startDate: bigint;
  endDate: bigint;
  ticketType: number;
  imageUri: string;
  organiser: string;
  userRegCount: bigint;
  expectedAttendees: bigint;
  verifiedAttendeesCount: bigint;
  // Add other properties as needed
}

interface EventTickets {
  regularTicketFee: bigint;
  vipTicketFee: bigint;
  // Add other properties as needed
}

// Define interface for event objects in your state
interface Event {
  id: string;
  type: string;
  title: string;
  description: string;
  location: string;
  date: string;
  endDate: string;
  price: {
    regular: number;
    vip: number;
  };
  image: string;
  organiser: string;
  attendees: {
    registered: number;
    expected: number;
    verified: number;
  };
  hasEnded: boolean;
  hasNotStarted: boolean;
  isLive: boolean;
  isVerified: boolean;
  hasTicket: boolean;
  ticketType: string;
  startTimestamp: number;
  endTimestamp: number;
  rawData: EventData;

  remainingTickets: number;
  hasTicketCreated: boolean;
  hasRegularTicket: boolean;
  hasVIPTicket: boolean;
}

interface TicketDetails {
  eventIds: bigint[];
  ticketTypes: string[];
}

interface TicketsMap {
  [key: string]: string;
}

// Define component prop types
// interface EventCardProps {
//   event: Event;
//   viewMode: 'grid' | 'list';
//   hasTicket: boolean;
//   ticketType: string;
//   isDashboard: boolean;
//   onCheckIn: (eventId: string) => void;
// }

const EventsDashboardHome = () => {
  const [viewMode] = useState<'grid' | 'list'>('grid');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('Loading...');
  const [userTickets, setUserTickets] = useState<TicketsMap>({});
  const [copyStatus, setCopyStatus] = useState(false);
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    checkedIn: 0,
    pending: 0,
  });
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<{
    eventId: string | null;
    status: string;
    message: string;
  }>({ eventId: null, status: '', message: '' });

  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const walletAddress = wallets?.[0]?.address as `0x${string}`;
  const wallet = wallets?.[0];

  const publicClient = createPublicClientInstance();

  // Helper function to format Unix timestamp to readable date
  const formatDate = (timestamp: bigint | string | number | undefined): string => {
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

  // Get ETN Balance
  const getETNBalance = useCallback(async () => {
    if (!wallets || !wallets.length || !wallets[0]?.address) {
      console.log('No wallet available yet, skipping balance fetch');
      return;
    }

    try {
      const tokenBalanceWei = await publicClient.getBalance({
        address: walletAddress,
      });

      const formattedBalance = formatEther(tokenBalanceWei);
      setTokenBalance(parseFloat(formattedBalance).toFixed(4));
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setTokenBalance('--');
    }
  }, [wallets, publicClient]);

  // Copy wallet address to clipboard
  const copyWalletAddress = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
      } catch (err) {
        console.error('Failed to copy wallet address:', err);
      }
    }
  };

  // Main data fetching function - using allEventsRegisteredForByAUser
  const fetchUserData = useCallback(async () => {
    if (!walletAddress) {
      console.log('No wallet address available yet, skipping data fetch');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get all events the user has registered for
      const registeredEventIds = (await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'allEventsRegisteredForByAUser',
        args: [walletAddress],
      })) as bigint[];

      console.log('User registered event ids:', registeredEventIds);
      console.log('User registered events count:', registeredEventIds?.length || 0);

      if (!registeredEventIds || registeredEventIds.length === 0) {
        console.log('No registered events found');
        setEvents([]);
        setTicketStats({ total: 0, checkedIn: 0, pending: 0 });
        setLoading(false);
        return;
      }

      // Check verification status for each registered event
      const ticketsMap: TicketsMap = {};
      const verifiedMap: Record<string, boolean> = {};

      // Batch check verification status for each event
      await Promise.all(
        registeredEventIds.map(async (eventId) => {
          try {
            const eventIdStr = eventId.toString();

            // Check verification status
            try {
              const isVerified = await publicClient.readContract({
                address: TICKET_CITY_ADDR,
                abi: TICKET_CITY_ABI,
                functionName: 'isVerified',
                args: [walletAddress, eventId],
              });
              verifiedMap[eventIdStr] = Boolean(isVerified);
            } catch (error) {
              console.error(`Error checking verification for event ${eventIdStr}:`, error);
              verifiedMap[eventIdStr] = false;
            }
          } catch (error) {
            console.error(`Error checking verification for event ${eventId}:`, error);
          }
        }),
      );

      // Get ticket types for the registered events
      try {
        const ticketDetails = (await publicClient.readContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'getMyTickets',
          args: [],
        })) as TicketDetails;

        if (
          ticketDetails &&
          ticketDetails.eventIds &&
          Array.isArray(ticketDetails.eventIds) &&
          ticketDetails.ticketTypes &&
          Array.isArray(ticketDetails.ticketTypes)
        ) {
          ticketDetails.eventIds.forEach((eventId, index) => {
            const eventIdStr = eventId.toString();
            if (index < ticketDetails.ticketTypes.length) {
              ticketsMap[eventIdStr] = ticketDetails.ticketTypes[index];
            }
          });
        }
      } catch (error) {
        console.error('Error fetching ticket details:', error);
      }

      setUserTickets(ticketsMap);

      // Fetch details for each registered event
      const eventsData = await Promise.all(
        registeredEventIds.map(async (eventId) => {
          try {
            const eventIdStr = eventId.toString();
            const eventData = (await publicClient.readContract({
              address: TICKET_CITY_ADDR,
              abi: TICKET_CITY_ABI,
              functionName: 'getEvent',
              args: [eventId],
            })) as EventData;

            // Classify event status based on current time
            const now = Date.now();
            const startTimestamp = Number(eventData.startDate) * 1000;
            const endTimestamp = Number(eventData.endDate) * 1000;

            // Make sure we properly classify events
            const hasEnded = endTimestamp < now;
            const hasNotStarted = startTimestamp > now;
            const isLive = !hasEnded && !hasNotStarted;

            console.log(
              `Event ${eventData.title} - Start: ${new Date(
                startTimestamp,
              ).toLocaleString()}, End: ${new Date(endTimestamp).toLocaleString()}, Now: ${new Date(
                now,
              ).toLocaleString()}, hasEnded: ${hasEnded}, hasNotStarted: ${hasNotStarted}, isLive: ${isLive}`,
            );

            // Get ticket price details
            let regularPrice = 0;
            let vipPrice = 0;
            let ticketType = ticketsMap[eventIdStr] || 'Regular';

            try {
              const eventTickets = (await publicClient.readContract({
                address: TICKET_CITY_ADDR,
                abi: TICKET_CITY_ABI,
                functionName: 'eventTickets',
                args: [eventId],
              })) as EventTickets;

              if (eventTickets) {
                regularPrice = eventTickets.regularTicketFee
                  ? Number(eventTickets.regularTicketFee) / 1e18
                  : 0;
                vipPrice = eventTickets.vipTicketFee ? Number(eventTickets.vipTicketFee) / 1e18 : 0;
              }
            } catch (error) {
              console.error(`Error fetching ticket details for event ${eventId}:`, error);
            }

            // Process the image URL
            let imageUrl = eventData.imageUri || '/placeholder-event.jpg';

            return {
              id: eventIdStr,
              type: Number(eventData.ticketType) === 0 ? 'Free' : ticketType,
              title: eventData.title || 'Untitled Event',
              description: eventData.desc || 'No description available',
              location: eventData.location || 'TBD',
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
              hasEnded,
              hasNotStarted,
              isLive,
              isVerified: verifiedMap[eventIdStr] || false,
              hasTicket: true,
              ticketType: ticketType,
              startTimestamp,
              endTimestamp,
              rawData: eventData,
            };
          } catch (error) {
            console.error(`Error fetching event ${eventId}:`, error);
            return null;
          }
        }),
      );

      // Filter out null responses
      const formattedEvents = eventsData.filter((event): event is Event => event !== null);
      console.log('Successfully fetched', formattedEvents.length, 'events');

      // Update ticket stats
      const checkedIn = formattedEvents.filter((event) => event.isVerified).length;
      setTicketStats({
        total: formattedEvents.length,
        checkedIn,
        pending: formattedEvents.length - checkedIn,
      });

      // Store all events in one array but with status flags
      setEvents(formattedEvents);
      console.log(formattedEvents);

      // Update timestamp
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [walletAddress, publicClient]);

  // Initial data fetch on wallet connection
  useEffect(() => {
    // Only fetch if authenticated and wallet is connected
    if (authenticated && wallets?.length > 0) {
      console.log('Wallet connected, fetching initial data...');
      getETNBalance();
      fetchUserData();
    } else {
      setTokenBalance('Connect Wallet');
      setLoading(false);
    }
    // Note: getETNBalance and fetchUserData are created with useCallback so they won't
    // cause infinite loops, but we exclude them from dependencies to be safe
  }, [authenticated, wallets?.length]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    if (isRefreshing) return;

    console.log('Manual refresh triggered');
    setIsRefreshing(true);

    getETNBalance();
    fetchUserData();
  };

  // Format wallet address for display
  const formatWalletAddress = (address: string): string => {
    if (!address) return 'Not Connected';
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  // Function to wait for a transaction receipt
  const waitForReceipt = async (provider: any, txHash: string) => {
    let receipt = null;
    let retries = 0;
    const maxRetries = 10;

    while (!receipt && retries < maxRetries) {
      receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      if (!receipt) {
        retries++;
        console.log(`Retry ${retries}: Waiting for transaction receipt...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!receipt) {
      throw new Error('Transaction receipt not found after maximum retries');
    }

    console.log('Final Receipt:', receipt);
    return receipt;
  };

  // Handle check-in process
  const handleCheckIn = async (eventId: string) => {
    if (!wallet || checkingIn) return;

    setCheckingIn(true);
    setCheckInStatus({
      eventId: eventId,
      status: 'pending',
      message: 'Checking in...',
    });

    try {
      console.log(`Checking in to event ${eventId}...`);

      const provider = await wallet.getEthereumProvider();

      // verify Attendance
      const verifyAttendanceData = encodeFunctionData({
        abi: TICKET_CITY_ABI,
        functionName: 'verifyAttendance',
        args: [BigInt(eventId)],
      });

      const eventTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: TICKET_CITY_ADDR, data: verifyAttendanceData }],
      });

      // Wait for transaction receipt
      await waitForReceipt(provider, eventTxHash);

      setCheckInStatus({
        eventId: eventId,
        status: 'processing',
        message: 'Transaction submitted. Waiting for confirmation...',
      });

      // Wait for the transaction to be confirmed
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: eventTxHash as `0x${string}`,
      });

      if (receipt.status === 'success') {
        console.log('Check-in successful!');
        setCheckInStatus({
          eventId: eventId,
          status: 'success',
          message: 'Successfully checked in!',
        });

        // Update the events array to mark this event as verified
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === eventId ? { ...event, isVerified: true } : event,
          ),
        );

        // Update ticket stats
        setTicketStats((prev) => ({
          ...prev,
          checkedIn: prev.checkedIn + 1,
          pending: prev.pending - 1,
        }));

        // Clear status after a delay
        setTimeout(() => {
          setCheckInStatus({ eventId: null, status: '', message: '' });
        }, 3000);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Check-in failed:', error);
      setCheckInStatus({
        eventId: eventId,
        status: 'error',
        message: error.message || 'Failed to check in. Please try again.',
      });

      // Clear error status after a delay
      setTimeout(() => {
        setCheckInStatus({ eventId: null, status: '', message: '' });
      }, 5000);
    } finally {
      setCheckingIn(false);
    }
  };

  // Filter events by category based on timestamps
  const upcomingEvents = events.filter((event) => event.hasNotStarted);
  const liveEvents = events.filter((event) => event.isLive);
  const pastEvents = events.filter((event) => event.hasEnded);

  // Sort events by start date (upcoming and live) or end date (past)
  upcomingEvents.sort((a, b) => a.startTimestamp - b.startTimestamp);
  liveEvents.sort((a, b) => a.endTimestamp - b.endTimestamp);
  pastEvents.sort((a, b) => b.endTimestamp - a.endTimestamp); // Most recent past events first

  // Handle connect wallet action
  const handleConnectWallet = () => {
    login();
  };

  // If not authenticated, show connect wallet UI
  if (!authenticated) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">My Events Dashboard</h2>
          <p className="text-textGray mb-6">Connect your wallet to view your events and tickets</p>
        </div>
        <button
          onClick={handleConnectWallet}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-white ml-4">Loading your events...</p>
      </div>
    );
  }

  // Check-in status notification
  const renderCheckInNotification = () => {
    if (!checkInStatus.eventId || !checkInStatus.status) return null;

    const getBgColor = () => {
      switch (checkInStatus.status) {
        case 'pending':
        case 'processing':
          return 'bg-blue-500';
        case 'success':
          return 'bg-green-500';
        case 'error':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };

    return (
      <div
        className={`fixed bottom-4 right-4 ${getBgColor()} text-white px-4 py-2 rounded-lg shadow-lg max-w-xs z-50`}
      >
        <p>{checkInStatus.message}</p>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Render check-in notification */}
      {renderCheckInNotification()}

      {/* Header with refresh indicator */}
      <div className="mb-8 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">My Events Dashboard</h2>
        <div className="flex items-center">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-textGray hover:text-white p-2 rounded-lg hover:bg-searchBg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="font-inter text-xs text-textGray">
              {isRefreshing ? 'Refreshing...' : `Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </span>
          </button>
        </div>
      </div>

      {/* Wallet and Ticket Overview Section */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Wallet Info Card */}
        <div className="shadow-button-inset border border-borderStroke rounded-xl p-6 flex-1 backdrop-blur-sm">
          <h3 className="text-white text-xl font-semibold mb-4">Wallet Address</h3>
          <div className="flex items-center gap-2">
            <p className="text-emerald-400 text-lg">{formatWalletAddress(walletAddress || '')}</p>
            <button
              onClick={copyWalletAddress}
              className="text-textGray hover:text-white p-1 rounded transition-colors"
              title="Copy wallet address"
            >
              {copyStatus ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="mt-6">
            <h3 className="text-white text-xl font-semibold mb-2">ETN Balance</h3>
            <p className="text-amber-400 text-3xl font-bold">
              {tokenBalance}{' '}
              {tokenBalance !== 'Connect Wallet' &&
              tokenBalance !== 'Loading...' &&
              tokenBalance !== '--'
                ? 'ETN'
                : ''}
            </p>
          </div>
        </div>

        {/* Ticket Overview Card */}
        <div className="shadow-button-inset border border-borderStroke rounded-xl p-6 flex-1 backdrop-blur-sm">
          <h3 className="text-white text-xl font-semibold mb-4">Ticket Overview</h3>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-rose-400">🎟</span>
              <span className="text-white">Total Tickets:</span>
              <span className="text-rose-400 font-semibold">{ticketStats.total}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✅</span>
              <span className="text-white">Checked-in Events:</span>
              <span className="text-emerald-400 font-semibold">{ticketStats.checkedIn}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400">⌛</span>
              <span className="text-white">Pending Check-in:</span>
              <span className="text-amber-400 font-semibold">{ticketStats.pending}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            Upcoming <span className="text-indigo-400">Events</span>
          </h2>
          <div className="ml-4 bg-indigo-400 bg-opacity-20 text-indigo-300 px-3 py-1 rounded-full flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span className="text-xs">Not started yet</span>
          </div>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                viewMode={viewMode}
                hasTicket={true}
                ticketType={userTickets[event.id] || 'Regular'}
                isDashboard={true}
                onCheckIn={handleCheckIn}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-searchBg bg-opacity-20 rounded-xl shadow-button-inset border border-borderStroke backdrop-blur-sm">
            <p className="text-white">No upcoming events found.</p>
            <p className="text-textGray mt-2">
              Browse the events page to discover and register for upcoming events.
            </p>
          </div>
        )}
      </div>

      {/* Live Events Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            Live <span className="text-primary">Events</span>
          </h2>
          <div className="ml-4 bg-primary bg-opacity-20 text-primary px-3 py-1 rounded-full flex items-center">
            <span className="text-xs">Happening now</span>
          </div>
        </div>

        {liveEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {liveEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                viewMode={viewMode}
                hasTicket={true}
                ticketType={userTickets[event.id] || 'Regular'}
                isDashboard={true}
                onCheckIn={handleCheckIn}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-searchBg bg-opacity-20 rounded-xl shadow-button-inset border border-borderStroke backdrop-blur-sm">
            <p className="text-white">No live events found.</p>
            <p className="text-textGray mt-2">
              Browse the events page to discover and register for new events.
            </p>
          </div>
        )}
      </div>

      {/* Past Events Section */}
      <div>
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            Past <span className="text-gray-400">Events</span>
          </h2>
          <div className="ml-4 bg-gray-400 bg-opacity-20 text-gray-300 px-3 py-1 rounded-full flex items-center">
            <span className="text-xs">Completed</span>
          </div>
        </div>

        {pastEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                viewMode={viewMode}
                hasTicket={true}
                ticketType={userTickets[event.id] || 'Regular'}
                isDashboard={true}
                onCheckIn={handleCheckIn}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-searchBg bg-opacity-20 rounded-xl shadow-button-inset border border-borderStroke backdrop-blur-sm">
            <p className="text-white">No past events found.</p>
            <p className="text-textGray mt-2">
              Your attended events will appear here after they end.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsDashboardHome;
