import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Link, Users, Calendar, Clock, AlertCircle } from 'lucide-react';
import { usePrivy, useUser, useWallets } from '@privy-io/react-auth';
import {
  createPublicClientInstance,
  createWalletClientInstance,
  TICKET_CITY_ADDR,
} from '../../utils/client';
import { formatEther } from 'viem';
import TICKET_CITY_ABI from '../../abi/abi.json';
import TicketCreationSection from '../../components /Events/TicketCreationSection';
import EventDetailsFooter from '../../components /Events/EventDetailsFooter';

// Enums for ticket types to match the contract
const EventType = {
  FREE: 0,
  PAID: 1,
};

const PaidTicketCategory = {
  NONE: 0,
  REGULAR: 1,
  VIP: 2,
};

// Loading state component
const LoadingState = () => (
  <div className="min-h-screen bg-background p-8">
    <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
      <h1 className="text-white text-2xl font-bold mb-4 text-center">Loading Event Details...</h1>
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    </div>
  </div>
);

// Error state component
const ErrorState = ({ error, navigate }) => (
  <div className="min-h-screen bg-background p-8">
    <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
      <h1 className="text-white text-2xl font-bold mb-4 text-center">Error</h1>
      <div className="bg-red-500 text-white p-4 rounded-lg mb-4">{error}</div>
      <button
        onClick={() => navigate(-1)}
        className="bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:opacity-80"
      >
        Back
      </button>
    </div>
  </div>
);

// No event state component
const NoEventState = ({ navigate }) => (
  <div className="min-h-screen bg-background p-8">
    <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
      <h1 className="text-white text-2xl font-bold mb-4 text-center">Event Not Found</h1>
      <p className="text-white text-center mb-6">The event you're looking for couldn't be found.</p>
      <div className="flex justify-center">
        <button
          onClick={() => navigate(-1)}
          className="bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:opacity-80"
        >
          Back
        </button>
      </div>
    </div>
  </div>
);

const EventDetails = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { refreshUser } = useUser();
  const [balance, setBalance] = useState('Loading...');

  // Local state for event data
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  const [attendanceRate, setAttendanceRate] = useState('Loading...');
  const [selectedTicketType, setSelectedTicketType] = useState('REGULAR');
  const [purchaseError, setPurchaseError] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const publicClient = createPublicClientInstance();

  // Fetch ETN balance
  const getETNBalance = async () => {
    if (!wallets || !wallets[0]?.address) return;

    try {
      const balanceWei = await publicClient.getBalance({
        address: wallets[0].address,
      });

      const formattedBalance = formatEther(balanceWei);
      setBalance(parseFloat(formattedBalance).toFixed(4));

      await refreshUser();
    } catch (error) {
      setBalance('Error loading balance');
    }
  };

  // Fetch event details directly from the contract
  const loadEventDetails = async () => {
    if (!eventId) {
      setIsLoading(false);
      setError('Event ID not provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const eventIdNumber = parseInt(eventId);

      // Get event data from contract directly
      const eventData = await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'getEvent',
        args: [eventIdNumber],
      });

      // Get ticket information
      const eventTicketsData = await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'eventTickets',
        args: [eventIdNumber],
      });

      // Format the ticket data properly
      const formattedTicketsData = {
        hasRegularTicket: eventTicketsData[0],
        hasVIPTicket: eventTicketsData[1],
        regularTicketFee: eventTicketsData[2],
        vipTicketFee: eventTicketsData[3],
        ticketURI: eventTicketsData[4],
      };

      // Set event data
      const formattedEvent = {
        ...eventData,
        id: eventIdNumber,
        ticketsData: formattedTicketsData,
      };

      setEvent(formattedEvent);

      // Check if tickets have been created
      const hasTicketCreated =
        (Number(eventData.ticketType) === EventType.FREE ||
          Number(eventData.ticketType) === EventType.PAID) &&
        (formattedTicketsData.hasRegularTicket || formattedTicketsData.hasVIPTicket) &&
        eventData.ticketNFTAddr !== '0x0000000000000000000000000000000000000000';

      setTicketCreated(hasTicketCreated);

      // Set appropriate initial ticket type based on what's available
      // Determine if tickets have been created - different logic for FREE vs PAID events
      if (Number(eventData.ticketType) === EventType.FREE) {
        // For FREE events, we only need the NFT contract address to be set
        setTicketCreated(eventData.ticketNFTAddr !== '0x0000000000000000000000000000000000000000');
      } else if (Number(eventData.ticketType) === EventType.PAID) {
        // For PAID events, we need ticket types and NFT contract
        setTicketCreated(
          (formattedTicketsData.hasRegularTicket || formattedTicketsData.hasVIPTicket) &&
            eventData.ticketNFTAddr !== '0x0000000000000000000000000000000000000000',
        );
      } else {
        setTicketCreated(false);
      }

      // If user is authenticated, check for user-specific information
      if (authenticated && wallets && wallets[0]?.address) {
        // Check if this user is the organizer of the event
        const isUserOrganizer =
          wallets[0]?.address &&
          eventData.organiser &&
          eventData.organiser.toLowerCase() === wallets[0].address.toLowerCase();

        setIsOrganizer(isUserOrganizer);

        // Check if user has registered for event
        const hasRegistered = await publicClient.readContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'hasRegistered',
          args: [wallets[0].address, eventIdNumber],
        });

        setHasTicket(hasRegistered);
      }

      // Calculate attendance rate
      if (eventData.userRegCount > 0) {
        const rate =
          (Number(eventData.verifiedAttendeesCount) * 100) / Number(eventData.userRegCount);
        setAttendanceRate(`${rate.toFixed(1)}%`);
      } else {
        setAttendanceRate('0%');
      }
    } catch (error) {
      setError(`Failed to fetch event details: ${error.message || 'Unknown error'}`);
      setEvent(null); // Reset event state on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch event details first
    loadEventDetails();

    // Then fetch user-specific data if authenticated
    if (authenticated && wallets && wallets[0]?.address) {
      getETNBalance();
    }
  }, [eventId, authenticated, wallets]);

  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'TBD';
    return new Date(Number(timestamp) * 1000).toDateString();
  };

  // Format time from timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return 'TBD';
    return new Date(Number(timestamp) * 1000).toLocaleTimeString();
  };

  // Purchase ticket function error handling
  const handlePurchaseTicket = async () => {
    if (!event || !wallets || !wallets[0]) {
      setPurchaseError('Event details not available or wallet not connected');
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      // First check if the event is FREE or PAID
      const isFreeEvent = Number(event.ticketType) === EventType.FREE;

      // Determine ticket category based on event type and selection
      let ticketCategory;
      let ticketPrice;

      if (isFreeEvent) {
        // For FREE events, always use NONE (0) category
        ticketCategory = PaidTicketCategory.NONE;
        ticketPrice = 0n;
      } else {
        // For PAID events, use the selected ticket type
        if (selectedTicketType === 'REGULAR' && event.ticketsData.hasRegularTicket) {
          ticketCategory = PaidTicketCategory.REGULAR; // This is index 1 in the enum
          ticketPrice = event.ticketsData.regularTicketFee;
        } else if (selectedTicketType === 'VIP' && event.ticketsData.hasVIPTicket) {
          ticketCategory = PaidTicketCategory.VIP; // This is index 2 in the enum
          ticketPrice = event.ticketsData.vipTicketFee;
        } else {
          throw new Error('Selected ticket type is not available for this event');
        }
      }

      // Get wallet client
      const provider = await wallets[0].getEthereumProvider();
      const walletClient = createWalletClientInstance(provider);

      try {
        // Purchase the ticket
        const hash = await walletClient.writeContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'purchaseTicket',
          args: [event.id, ticketCategory], // Using the numeric enum value
          value: ticketPrice,
          account: wallets[0].address,
        });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
        });

        if (receipt.status === 'success') {
          alert('Ticket purchased successfully!');
          // Refresh event details
          await loadEventDetails();
          // Update balance
          await getETNBalance();
        } else {
          throw new Error('Transaction failed');
        }
      } catch (txError) {
        // Check if user rejected the transaction in their wallet
        if (
          txError.message.includes('rejected') ||
          txError.message.includes('denied') ||
          txError.message.includes('cancelled')
        ) {
          throw new Error('Transaction was rejected in wallet');
        } else {
          throw txError; // rethrow other errors
        }
      }
    } catch (error) {
      setPurchaseError(`Failed to purchase ticket: ${error.message || 'Unknown error'}`);
    } finally {
      // Ensure the purchasing state is reset even if there's an error
      setIsPurchasing(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Render error state
  if (error) {
    return <ErrorState error={error} navigate={navigate} />;
  }

  // Render no event state
  if (!event) {
    return <NoEventState navigate={navigate} />;
  }

  const TicketTypeSelector = () => {
    // Determine what options should be available
    const isPaidEvent = event && Number(event.ticketType) === EventType.PAID;
    const hasRegularOption = isPaidEvent && event.ticketsData?.hasRegularTicket;
    const hasVipOption = isPaidEvent && event.ticketsData?.hasVIPTicket;

    // Make sure we have a valid selection based on available options
    useEffect(() => {
      if (isPaidEvent) {
        if (selectedTicketType !== 'REGULAR' && selectedTicketType !== 'VIP') {
          // Default to first available option
          if (hasRegularOption) {
            setSelectedTicketType('REGULAR');
          } else if (hasVipOption) {
            setSelectedTicketType('VIP');
          }
        } else if (selectedTicketType === 'REGULAR' && !hasRegularOption && hasVipOption) {
          // Switch to VIP if REGULAR isn't available
          setSelectedTicketType('VIP');
        } else if (selectedTicketType === 'VIP' && !hasVipOption && hasRegularOption) {
          // Switch to REGULAR if VIP isn't available
          setSelectedTicketType('REGULAR');
        }
      } else {
        // For free events
        setSelectedTicketType('NONE');
      }
    }, [event, isPaidEvent, hasRegularOption, hasVipOption]);

    return (
      <div>
        <label className="font-inter text-medium text-white block mb-2">Choose Ticket Type:</label>
        <select
          className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
          value={selectedTicketType}
          onChange={(e) => setSelectedTicketType(e.target.value)}
          disabled={!authenticated || isPurchasing}
        >
          {isPaidEvent ? (
            // Paid event options
            <>
              {hasRegularOption && (
                <option value="REGULAR">
                  REGULAR - {formatEther(event.ticketsData.regularTicketFee)} ETN
                </option>
              )}
              {hasVipOption && (
                <option value="VIP">VIP - {formatEther(event.ticketsData.vipTicketFee)} ETN</option>
              )}
              {!hasRegularOption && !hasVipOption && (
                <option value="NONE">No tickets available</option>
              )}
            </>
          ) : (
            // Free event option
            <option value="NONE">FREE</option>
          )}
        </select>
      </div>
    );
  };

  // Wallet info component
  const WalletInfo = () => (
    <div className="space-y-2">
      <p className="font-inter text-medium text-white">
        Wallet:{' '}
        {wallets?.[0]?.address
          ? `${wallets[0].address.slice(0, 6)}...${wallets[0].address.slice(-4)}`
          : 'Not Connected'}
      </p>
      <p className="font-inter text-medium text-white">
        💳 ETN Balance: {authenticated ? balance : 'Connect your wallet to view your ETN balance'}
      </p>
    </div>
  );

  // Ticket owned component
  const TicketOwnedSection = () => (
    <div className="rounded-lg border border-borderStroke p-6 bg-gradient-to-r from-green-900/30 to-primary/20">
      <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
        🎟️ You Own a Ticket!
      </h2>
      <p className="font-inter text-medium text-white mb-4">
        Your NFT ticket has been minted to your wallet. You can use this ticket to attend the event.
      </p>
      <div className="space-y-2">
        <p className="font-inter text-medium text-white">
          Ticket NFT Address:{' '}
          {event.ticketNFTAddr &&
          event.ticketNFTAddr !== '0x0000000000000000000000000000000000000000'
            ? `${event.ticketNFTAddr.slice(0, 6)}...${event.ticketNFTAddr.slice(-4)}`
            : 'Not available'}
        </p>
        <p className="font-inter text-medium text-white">✅ Entry Status: Ready for check-in</p>
      </div>
    </div>
  );

  // Purchase ticket section component
  const PurchaseTicketSection = () => (
    <div className="rounded-lg border border-borderStroke p-6">
      <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
        🎟️ {authenticated ? 'Get Your Ticket' : 'Ticket Information'}
      </h2>
      <div className="space-y-4">
        <TicketTypeSelector />

        <div className="flex items-center justify-between">
          <span className="font-inter text-medium text-white">
            🎫 Your ticket will be minted as an NFT
          </span>
        </div>

        {purchaseError && (
          <div className="bg-red-900/30 p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="font-inter text-sm text-white">{purchaseError}</p>
          </div>
        )}

        {authenticated ? (
          <button
            onClick={handlePurchaseTicket}
            disabled={isPurchasing}
            className="w-full bg-primary rounded-lg py-3 font-poppins text-[18px] leading-[27px] tracking-wider text-white disabled:opacity-50"
          >
            {isPurchasing ? 'Processing...' : 'Purchase Ticket'}
          </button>
        ) : (
          <button
            onClick={login}
            className="w-full bg-primary rounded-lg py-3 font-poppins text-[18px] leading-[27px] tracking-wider text-white"
          >
            Connect Wallet 🔗
          </button>
        )}

        <WalletInfo />
      </div>
    </div>
  );

  // No tickets available component
  const NoTicketsSection = () => (
    <div className="rounded-lg border border-borderStroke p-6">
      <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
        🎟️ Tickets
      </h2>
      <p className="font-inter text-medium text-white mb-4">
        Tickets are not available for this event yet. Please check back later.
      </p>
    </div>
  );

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-[80%] mx-auto py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 hover:opacity-80"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
          <span className="font-inter text-regular text-white">Back</span>
        </button>

        {/* Event Header */}
        <div className="text-center mb-8">
          <h1 className="font-exo text-xlarge tracking-tightest text-white mb-4">
            {event.title || 'Blockchain Summit'} {hasTicket && '🎫'}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-white" />
            <span className="font-inter text-medium text-white">
              {event.location || 'Virtual (CrossFi Metaverse)'}
            </span>
          </div>
          <p className="gradient-text font-inter text-medium">
            {new Date() < new Date(Number(event.startDate) * 1000)
              ? `Event starts in: ${Math.ceil(
                  (Number(event.startDate) * 1000 - Date.now()) / (1000 * 60 * 60 * 24),
                )} days`
              : new Date() < new Date(Number(event.endDate) * 1000)
              ? 'Event is live now!'
              : 'Event has ended'}
          </p>
        </div>

        {/* Banner Image */}
        <div className="w-full rounded-lg overflow-hidden mb-8">
          {event.imageUri ? (
            <img
              src={event.imageUri}
              alt="Event Banner"
              className="w-full h-64 object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder-image.jpg';
                e.target.alt = 'Image not available';
              }}
            />
          ) : (
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
              <p className="text-white text-lg">No Image Available</p>
            </div>
          )}
        </div>

        {/* Event Info Section */}
        <div className="flex flex-col gap-8">
          {/* Host Information */}
          <div className="rounded-lg border border-borderStroke p-6">
            <h2 className="font-poppins text-large text-white mb-4">
              👥 Hosted by:{' '}
              {event.organiser
                ? `${event.organiser.slice(0, 6)}...${event.organiser.slice(-4)}`
                : 'Unknown'}
            </h2>
            <p className="font-inter text-medium text-white mb-4">
              {event.desc ||
                'Join top Web3 developers and entrepreneurs as we explore the future of decentralized technology.'}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Date: {formatDate(event.startDate)} to {formatDate(event.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Time: {formatTime(event.startDate)} to {formatTime(event.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Ticket NFT:{' '}
                  {event.ticketNFTAddr &&
                  event.ticketNFTAddr !== '0x0000000000000000000000000000000000000000'
                    ? `${event.ticketNFTAddr.slice(0, 6)}...${event.ticketNFTAddr.slice(-4)}`
                    : 'Not created yet'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Capacity: {event.expectedAttendees?.toString() || '5000'} Attendees
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Attendance Rate: {attendanceRate}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Section - Content depends on user authentication state */}
          {authenticated ? (
            isOrganizer ? (
              /* ORGANIZER VIEW */
              <>
                {/* Ticket Creation Section for Organizer */}
                {(Number(event.ticketType) === EventType.FREE && !ticketCreated) ||
                (Number(event.ticketType) === EventType.PAID &&
                  (!event.ticketsData.hasRegularTicket || !event.ticketsData.hasVIPTicket)) ? (
                  <TicketCreationSection
                    event={event}
                    fetchEventDetails={loadEventDetails}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                  />
                ) : null}

                {/* Organizer - Purchase Ticket Section */}
                {ticketCreated && !hasTicket ? <PurchaseTicketSection /> : null}

                {/* Organizer - Ticket Owned Section */}
                {hasTicket && <TicketOwnedSection />}
              </>
            ) : (
              /* AUTHENTICATED NON-ORGANIZER VIEW */
              <>
                {/* If tickets are available and user doesn't have a ticket */}
                {ticketCreated && !hasTicket ? (
                  <PurchaseTicketSection />
                ) : hasTicket ? (
                  // If user already has a ticket
                  <TicketOwnedSection />
                ) : (
                  // If no tickets have been created yet
                  <NoTicketsSection />
                )}
              </>
            )
          ) : /* NON-AUTHENTICATED USER VIEW */
          ticketCreated ? (
            <PurchaseTicketSection />
          ) : (
            <NoTicketsSection />
          )}
        </div>

        {/* Footer Information - Hide for organizer */}
        {authenticated && isOrganizer ? null : <EventDetailsFooter />}
      </div>
    </div>
  );
};

export default EventDetails;
