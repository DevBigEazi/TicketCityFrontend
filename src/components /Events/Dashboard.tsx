import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, CheckCircle, Clock, Wallet } from 'lucide-react';
import EventCard from './EventsCard';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { safeContractRead } from '../../config/client';
import { encodeFunctionData } from 'viem';
import { formatDate, truncateAddress } from '../../utils/utils';
import {
  EventDataStructure,
  EventObjects,
  EventTickets,
  TicketDetails,
  TicketsMap,
} from '../../types';
import { useNetwork } from '../../contexts/NetworkContext';

const Dashboard = () => {
  // Core state
  const [viewMode] = useState<'grid' | 'list'>('grid');
  const [events, setEvents] = useState<EventObjects[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Ref to track the current wallet address to detect changes
  const currentWalletAddressRef = useRef<string>('');

  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  // Network context
  const {
    isTestnet,
    chainId,
    isConnected,
    tokenBalance,
    currentWalletAddress,
    getPublicClient,
    getActiveContractAddress,
    checkRPCStatus,
    networkName,
    connectionStatus,
    contractEvents,
  } = useNetwork();

  // Main data fetching function
  const fetchUserData = useCallback(async () => {
    if (!currentWalletAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const publicClient = getPublicClient();
      const contractAddress = getActiveContractAddress();

      // Check if RPC is responsive
      const isRpcConnected = await checkRPCStatus();
      if (!isRpcConnected) {
        setLoading(false);
        return;
      }

      // Get all events the user has registered for
      const registeredEventIds = (await safeContractRead(
        publicClient,
        {
          address: contractAddress,
          abi: TICKET_CITY_ABI,
          functionName: 'allEventsRegisteredForByAUser',
          args: [currentWalletAddress],
        },
        isTestnet,
      )) as bigint[];

      if (!registeredEventIds || registeredEventIds.length === 0) {
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
              const isVerified = await safeContractRead(
                publicClient,
                {
                  address: contractAddress,
                  abi: TICKET_CITY_ABI,
                  functionName: 'isVerified',
                  args: [currentWalletAddress, eventId],
                },
                isTestnet,
              );
              verifiedMap[eventIdStr] = Boolean(isVerified);
            } catch (error) {
              verifiedMap[eventIdStr] = false;
            }
          } catch (error) {}
        }),
      );

      // Get ticket types for the registered events
      try {
        const ticketDetails = (await safeContractRead(
          publicClient,
          {
            address: contractAddress,
            abi: TICKET_CITY_ABI,
            functionName: 'getMyTickets',
            args: [],
          },
          isTestnet,
        )) as TicketDetails;

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
      } catch (error) {}

      setUserTickets(ticketsMap);

      // Fetch details for each registered event
      const eventsData = await Promise.all(
        registeredEventIds.map(async (eventId): Promise<EventObjects | null> => {
          try {
            const eventIdStr = eventId.toString();
            const eventData = (await safeContractRead(
              publicClient,
              {
                address: contractAddress,
                abi: TICKET_CITY_ABI,
                functionName: 'getEvent',
                args: [eventId],
              },
              isTestnet,
            )) as EventDataStructure;

            // Classify event status based on current time
            const now = Date.now();
            const startTimestamp = Number(eventData.startDate) * 1000;
            const endTimestamp = Number(eventData.endDate) * 1000;

            // Make sure we properly classify events
            const hasEnded = endTimestamp < now;
            const hasNotStarted = startTimestamp > now;
            const isLive = !hasEnded && !hasNotStarted;

            // Get ticket price details
            let regularPrice = 0;
            let vipPrice = 0;
            let ticketType = ticketsMap[eventIdStr] || 'Regular';
            let hasRegularTicket = false;
            let hasVIPTicket = false;

            try {
              const eventTickets = (await safeContractRead(
                publicClient,
                {
                  address: contractAddress,
                  abi: TICKET_CITY_ABI,
                  functionName: 'eventTickets',
                  args: [eventId],
                },
                isTestnet,
              )) as EventTickets;

              if (eventTickets) {
                regularPrice = eventTickets.regularTicketFee
                  ? Number(eventTickets.regularTicketFee) / 1e18
                  : 0;
                vipPrice = eventTickets.vipTicketFee ? Number(eventTickets.vipTicketFee) / 1e18 : 0;

                // Determine if ticket types are available
                hasRegularTicket = regularPrice > 0;
                hasVIPTicket = vipPrice > 0;
              }
            } catch (error) {}

            // Process the image URL
            let imageUrl = eventData.imageUri || '/placeholder-event.jpg';

            // Calculate remaining tickets
            const remainingTickets =
              Number(eventData.expectedAttendees) - Number(eventData.userRegCount);

            // Create an event object with all required properties
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
              remainingTickets,
              hasTicketCreated: true,
              hasRegularTicket,
              hasVIPTicket,
              coordinates: null,
              distance: null,
            };
          } catch (error) {
            return null;
          }
        }),
      );

      // Filter out null responses with a type predicate
      const formattedEvents: EventObjects[] = eventsData.filter(
        (event): event is EventObjects => event !== null,
      );

      // Update ticket stats
      const checkedIn = formattedEvents.filter((event) => event.isVerified).length;
      setTicketStats({
        total: formattedEvents.length,
        checkedIn,
        pending: formattedEvents.length - checkedIn,
      });

      // Store all events in one array but with status flags
      setEvents(formattedEvents);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [getPublicClient, getActiveContractAddress, currentWalletAddress, isTestnet, checkRPCStatus]);

  // Watch for wallet changes and update data accordingly
  useEffect(() => {
    const handleWalletChanges = async () => {
      if (authenticated && wallets?.length > 0) {
        const newWalletAddress = (wallets[0]?.address as string) || '';

        // If the wallet address changed, refresh the data
        if (newWalletAddress && newWalletAddress !== currentWalletAddressRef.current) {
          // Update the ref to the new wallet address
          currentWalletAddressRef.current = newWalletAddress;

          // Reset states for the new wallet
          setEvents([]);
          setUserTickets({});
          setTicketStats({ total: 0, checkedIn: 0, pending: 0 });

          // Fetch data for the new wallet
          fetchUserData();
        } else if (!currentWalletAddressRef.current && newWalletAddress) {
          // First connection
          currentWalletAddressRef.current = newWalletAddress;
          fetchUserData();
        }
      } else {
        // Reset the ref if wallet disconnects
        currentWalletAddressRef.current = '';
        setLoading(false);
      }
    };

    handleWalletChanges();
  }, [authenticated, wallets, fetchUserData]);

  // Watch for contract events from NetworkContext and update data
  useEffect(() => {
    if (authenticated && currentWalletAddress && contractEvents.length > 0) {
      // Only refresh data when relevant contract events are detected
      fetchUserData();
    }
  }, [authenticated, currentWalletAddress, contractEvents, fetchUserData]);

  // Quick refresh after network switch
  useEffect(() => {
    if (authenticated && currentWalletAddress) {
      // refresh to ensure data is loaded
      const timeoutId = setTimeout(() => {
        fetchUserData();
      }, 1000); // 1 seconds refresh after switch

      return () => clearTimeout(timeoutId);
    }
  }, [authenticated, currentWalletAddress, chainId, isTestnet, fetchUserData]);

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
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!receipt) {
      throw new Error('Transaction receipt not found after maximum retries');
    }

    return receipt;
  };

  // Handle check-in process with network awareness
  const handleCheckIn = async (eventId: string) => {
    if (!wallets?.[0] || checkingIn || !currentWalletAddress) return;

    // Check RPC connection before attempting transaction
    const isRpcConnected = await checkRPCStatus();
    if (!isRpcConnected) {
      alert('Network connection is unavailable. Please check your connection and try again.');
      return;
    }

    setCheckingIn(true);
    setCheckInStatus({
      eventId: eventId,
      status: 'pending',
      message: 'Checking in...',
    });

    try {
      const wallet = wallets[0];
      const provider = await wallet.getEthereumProvider();
      const contractAddress = getActiveContractAddress();

      // verify Attendance
      const verifyAttendanceData = encodeFunctionData({
        abi: TICKET_CITY_ABI,
        functionName: 'verifyAttendance',
        args: [BigInt(eventId)],
      });

      const eventTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: currentWalletAddress, to: contractAddress, data: verifyAttendanceData }],
      });

      // Wait for transaction receipt
      await waitForReceipt(provider, eventTxHash);

      setCheckInStatus({
        eventId: eventId,
        status: 'processing',
        message: 'Transaction submitted. Waiting for confirmation...',
      });

      // Wait for the transaction to be confirmed
      const publicClient = getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: eventTxHash as `0x${string}`,
      });

      if (receipt.status === 'success') {
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

  // Copy wallet address to clipboard
  const copyWalletAddress = async () => {
    if (currentWalletAddress) {
      try {
        await navigator.clipboard.writeText(currentWalletAddress);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
      } catch (err) {}
    }
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

      {/* Header with refresh indicator and network info */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">My Events Dashboard</h2>
          <p className="text-sm text-indigo-400 mt-1">
            Connected to {networkName}
            {connectionStatus}
          </p>
          {!isConnected && (
            <p className="text-sm text-red-400 mt-1">
              Network connection error. Some features may not work.
            </p>
          )}
        </div>
      </div>

      {/* Wallet and Ticket Overview Section */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Wallet Info Card */}
        <div className="shadow-button-inset border border-borderStroke rounded-xl p-6 flex-1 backdrop-blur-sm">
          <h3 className="text-white text-xl font-semibold mb-4">Wallet Address</h3>
          <div className="flex items-center gap-2">
            <p className="text-emerald-400 text-lg">{truncateAddress(currentWalletAddress)}</p>
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
              tokenBalance !== '--' &&
              tokenBalance !== 'Network Error'
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

export default Dashboard;
