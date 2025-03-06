import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { encodeFunctionData } from 'viem';
import contractAbi from '../../abi/abi.json';
import { useWallets } from '@privy-io/react-auth';
import { pinata } from '../../utils/pinata';
import { TICKET_CITY_ADDR } from '../../utils/client';

enum TicketType {
  NONE = 0,
  REGULAR = 1,
  VIP = 2,
}

interface EventFormData {
  title: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  description: string;
  capacity: number;
  image: File | null;
  eventType: 'PAID' | 'FREE';
  ticketType: keyof typeof TicketType;
}

/**
 * Extracts the event ID directly from transaction logs without relying on ABI decoding
 * The EventOrganized event has the event ID as the second indexed parameter (third topic)
 */
const extractEventIdFromReceipt = (receipt: any): string | null => {
  if (!receipt || !receipt.logs || receipt.logs.length === 0) {
    console.log('No logs found in receipt');
    return null;
  }

  for (const log of receipt.logs) {
    // Check if this log has enough topics to potentially be our event
    if (log.topics && log.topics.length >= 3) {
      try {
        // Extract the event ID from the third topic (index 2)
        const eventIdHex = log.topics[2];
        const eventId = parseInt(eventIdHex, 16);

        console.log(`Found potential event ID: ${eventId} (hex: ${eventIdHex})`);
        return eventId.toString();
      } catch (err) {
        console.log('Error parsing event ID from topic:', err);
      }
    }
  }

  return null;
};

const EventPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { wallets } = useWallets();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventFormData | null>(null);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);

  // Check wallet connection status
  useEffect(() => {
    const wallet = wallets?.[0];
    setWalletConnected(!!wallet);
  }, [wallets]);

  // Get event data from location state
  useEffect(() => {
    const data = location.state as EventFormData | null;
    setEventData(data);

    // Redirect if no event data is available
    if (!data) {
      setError('No event data available. Please create an event first.');
    }
  }, [location.state, navigate]);

  const validateDates = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      throw new Error('Start date cannot be in the past');
    }
    if (end <= start) {
      throw new Error('End date must be after start date');
    }
  };

  const convertToUnixTimestamp = (dateStr: string): bigint => {
    return BigInt(Math.floor(new Date(dateStr).getTime() / 1000));
  };

  const handleEditEvent = () => {
    navigate('/create-event', { state: eventData });
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

  const handleCreateEvent = async () => {
    if (!eventData) {
      setError('No event data available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const wallet = wallets[0];
      if (!wallet || !eventData.image) {
        throw new Error(wallet ? 'Image not selected' : 'Wallet not connected');
      }

      validateDates(eventData.startDateTime, eventData.endDateTime);

      const provider = await wallet.getEthereumProvider();
      const address = wallet.address;

      // Upload image to IPFS
      const upload = await pinata.upload.file(eventData.image);
      const ipfsUrl = await pinata.gateways.convert(upload.IpfsHash);

      // Prepare event data
      const capacity =
        eventData.capacity !== undefined && eventData.capacity !== null
          ? BigInt(eventData.capacity)
          : BigInt(0);

      const ticketType =
        eventData.ticketType in TicketType ? BigInt(TicketType[eventData.ticketType]) : BigInt(0);

      // Create event
      const createEventData = encodeFunctionData({
        abi: contractAbi,
        functionName: 'createEvent',
        args: [
          eventData.title,
          eventData.description,
          ipfsUrl,
          eventData.location,
          convertToUnixTimestamp(eventData.startDateTime),
          convertToUnixTimestamp(eventData.endDateTime),
          capacity,
          ticketType,
        ],
      });

      const eventTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: TICKET_CITY_ADDR, data: createEventData }],
      });

      // Wait for transaction receipt
      const eventReceipt = await waitForReceipt(provider, eventTxHash);

      if (eventReceipt?.status !== '0x1') {
        throw new Error('Event creation transaction failed');
      }

      // Multi-step approach to extract event ID, with fallbacks
      let createdEventId;

      // Step 1: Try to extract directly from logs
      try {
        createdEventId = extractEventIdFromReceipt(eventReceipt);
        console.log('Extracted event ID from logs:', createdEventId);
      } catch (err) {
        console.error('Error extracting event ID from logs:', err);
      }

      // Step 2: Use totalEventOrganised as fallback if needed
      if (!createdEventId) {
        try {
          const getEventCountData = encodeFunctionData({
            abi: contractAbi,
            functionName: 'totalEventOrganised',
          });

          const countResult = await provider.request({
            method: 'eth_call',
            params: [{ to: TICKET_CITY_ADDR, data: getEventCountData }, 'latest'],
          });

          // Parse result from hex to decimal
          createdEventId = parseInt(countResult, 16).toString();
          console.log('Using current event count as ID:', createdEventId);
        } catch (err) {
          console.error('Error getting event count:', err);
        }
      }

      // Step 3: Final fallback - just use a default value
      if (!createdEventId) {
        console.warn("All ID extraction methods failed, using '1' as default event ID");
        createdEventId = '1';
      }

      // Navigate to the new event details page with the event ID and user address
      navigate(`/event/${createdEventId}`);
    } catch (error: any) {
      console.error('Error during event creation:', error);
      setError(error.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle case when no wallet is connected
  if (!walletConnected) {
    return (
      <div className="min-h-screen bg-background p-8 flex flex-col justify-center items-center">
        <div className="max-w-[80%] w-full border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
          <p className="text-white text-center mb-4">Connect your wallet to create an event</p>
          <div className="flex justify-center">
            <button className="bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:opacity-80">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8 flex flex-col justify-center items-center">
        <div className="max-w-[80%] w-full border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
          <p className="text-white text-center">Creating your event...</p>
        </div>
      </div>
    );
  }

  // Handle case when no event data is available
  if (!eventData) {
    return (
      <div className="min-h-screen bg-background p-8 flex flex-col justify-center items-center">
        <div className="max-w-[80%] w-full border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
          <p className="text-white text-center mb-4">No event data available.</p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/create-event')}
              className="bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:opacity-80"
            >
              Create New Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
        <h1 className="text-white text-2xl font-bold mb-4 text-center">Event Preview</h1>

        {/* Event Details */}
        <div className="border border-borderStroke p-6 rounded-lg bg-searchBg">
          {eventData.image && (
            <img
              src={URL.createObjectURL(eventData.image)}
              alt="Event"
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
          )}
          <h2 className="text-white text-xl font-semibold">{eventData.title}</h2>
          <p className="text-white">
            <strong>Date:</strong> {new Date(eventData.startDateTime).toDateString()} -{' '}
            {new Date(eventData.endDateTime).toDateString()}
          </p>
          <p className="text-white">
            <strong>Time:</strong> {new Date(eventData.startDateTime).toLocaleTimeString()} -{' '}
            {new Date(eventData.endDateTime).toLocaleTimeString()}
          </p>
          <p className="text-white">
            <strong>Location:</strong> {eventData.location}
          </p>
          <p className="text-white">
            <strong>Attendees Capacity:</strong> {eventData.capacity}
          </p>
          <p className="text-white">
            <strong>Type:</strong> {eventData.eventType}
          </p>
          <p className="text-white mt-4">
            <strong>Description:</strong> {eventData.description}
          </p>
        </div>

        {error && <div className="bg-red-500 text-white p-4 rounded-lg mb-4">{error}</div>}

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleEditEvent}
            disabled={isLoading}
            className="bg-searchBg text-white py-3 px-6 rounded-lg font-semibold hover:opacity-80 disabled:opacity-50"
          >
            Edit Event
          </button>

          <button
            onClick={handleCreateEvent}
            disabled={isLoading}
            className="bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:opacity-80 disabled:opacity-50"
          >
            {isLoading ? 'Creating Event...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPreview;
