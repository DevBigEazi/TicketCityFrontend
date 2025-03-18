import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, Users, AlertCircle, Loader2 } from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import { encodeFunctionData } from 'viem';
import contractAbi from '../../abi/abi.json';
import { pinata } from '../../config/pinata';
import { useNetwork } from '../../contexts/NetworkContext';
import { waitForReceipt } from '../../utils/utils';

// Enum for smart contract compatibility
enum TicketType {
  NONE = 0,
  REGULAR = 1,
  VIP = 2,
}

// form data interface without ticketType
interface EventFormData {
  title: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  description: string;
  capacity: number;
  image: File | null | string;
  eventType: 'FREE' | 'PAID';
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

const EventPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wallets } = useWallets();
  // Use NetworkContext to get network-specific data
  const { getActiveContractAddress, networkName, isConnected } = useNetwork();

  const [formData, setFormData] = useState<EventFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);

  // Check wallet connection status
  useEffect(() => {
    const wallet = wallets?.[0];
    setWalletConnected(!!wallet);
  }, [wallets]);

  useEffect(() => {
    setIsLoading(true);

    // Check if location state has form data
    if (location.state) {
      setFormData(location.state as EventFormData);
      setIsLoading(false);
      return;
    }

    // Otherwise try to get from localStorage
    try {
      const storedData = localStorage.getItem('eventFormData');
      if (storedData) {
        setFormData(JSON.parse(storedData));
      } else {
        setError('No event data found - please create an event first');
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      setError('Failed to load event data');
    } finally {
      setIsLoading(false);
    }
  }, [location.state]);

  // Validate dates for blockchain submission
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

  // Convert JS date to Unix timestamp for blockchain
  const convertToUnixTimestamp = (dateStr: string): bigint => {
    return BigInt(Math.floor(new Date(dateStr).getTime() / 1000));
  };

  // Determine ticket type for blockchain based on event type
  const getTicketTypeForBlockchain = (eventType: string): bigint => {
    return eventType === 'PAID' ? BigInt(TicketType.REGULAR) : BigInt(TicketType.NONE);
  };

  const handleGoBack = () => {
    navigate('/create-event', { state: formData });
  };

  // Function to create event
  const handleConfirm = async () => {
    if (!formData) {
      setError('No event data available');
      return;
    }

    if (!walletConnected) {
      setError('Please connect your wallet to create an event');
      return;
    }

    if (!isConnected) {
      setError('Network connection error. Please check your network connection and try again.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const wallet = wallets[0];
      if (!wallet || !formData.image) {
        throw new Error(wallet ? 'Image not selected' : 'Wallet not connected');
      }

      validateDates(formData.startDateTime, formData.endDateTime);

      const provider = await wallet.getEthereumProvider();
      const address = wallet.address;

      // Get the contract address from network context instead of hardcoded value
      const CONTRACT_ADDRESS = getActiveContractAddress();

      // Upload image to IPFS
      let ipfsUrl = '';
      if (typeof formData.image === 'string') {
        // If image is already a base64 string, convert it to a file
        const response = await fetch(formData.image);
        const blob = await response.blob();
        const file = new File([blob], 'event-image.jpg', { type: 'image/jpeg' });

        const upload = await pinata.upload.file(file);
        ipfsUrl = await pinata.gateways.convert(upload.IpfsHash);
      } else {
        // If image is a File object, upload directly
        const upload = await pinata.upload.file(formData.image);
        ipfsUrl = await pinata.gateways.convert(upload.IpfsHash);
      }

      // Prepare event data
      const capacity =
        formData.capacity !== undefined && formData.capacity !== null
          ? BigInt(formData.capacity)
          : BigInt(0);

      // Get the appropriate ticket type based on event type
      const ticketType = getTicketTypeForBlockchain(formData.eventType);

      // Create event
      const createEventData = encodeFunctionData({
        abi: contractAbi,
        functionName: 'createEvent',
        args: [
          formData.title,
          formData.description,
          ipfsUrl,
          formData.location,
          convertToUnixTimestamp(formData.startDateTime),
          convertToUnixTimestamp(formData.endDateTime),
          capacity,
          ticketType,
        ],
      });

      const eventTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: CONTRACT_ADDRESS, data: createEventData }],
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
            params: [{ to: CONTRACT_ADDRESS, data: getEventCountData }, 'latest'],
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

      // Clear form data from localStorage after successful creation
      localStorage.removeItem('eventFormData');
      localStorage.removeItem('eventFormDataHash');

      // Navigate to the new event details page with the event ID
      navigate(`/event/${createdEventId}`);
    } catch (error: any) {
      console.error('Error during event creation:', error);
      setError(error.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  // Format date and time for display
  const formatDate = (dateTimeString: string) => {
    if (!dateTimeString) return 'TBD';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateTimeString: string) => {
    if (!dateTimeString) return 'TBD';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-button-inset p-8">
          <h1 className="text-white text-2xl font-bold mb-4 text-center">
            Loading Event Preview...
          </h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !formData) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-button-inset p-8">
          <h1 className="text-white text-2xl font-bold mb-4 text-center">Error</h1>
          <div className="bg-red-500/20 text-white p-4 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate('/create-event')}
            className="w-full bg-primary text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Create New Event
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!formData) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-button-inset p-8">
          <h1 className="text-white text-2xl font-bold mb-4 text-center">No Event Data Found</h1>
          <p className="text-white text-center mb-6">Please go back and create an event.</p>
          <button
            onClick={() => navigate('/create-event')}
            className="w-full bg-primary text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Create Event
          </button>
        </div>
      </div>
    );
  }

  // Wallet not connected state
  if (!walletConnected) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-button-inset p-8">
          <h1 className="text-white text-2xl font-bold mb-4 text-center">
            Wallet Connection Required
          </h1>
          <p className="text-white text-center mb-6">
            Please connect your wallet to create an event on the blockchain.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Network error state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-button-inset p-8">
          <h1 className="text-white text-2xl font-bold mb-4 text-center">
            Network Connection Error
          </h1>
          <div className="bg-red-500/20 text-white p-4 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>
              Unable to connect to the blockchain network. Please check your connection and try
              again.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Main preview display
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-[80%] mx-auto py-8">
        {/* Back Button */}
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 mb-8 hover:opacity-80"
          disabled={isCreating}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
          <span className="font-inter text-regular text-white">Back to Event Form</span>
        </button>

        {/* Preview Header */}
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-bold">Event Preview</h1>
          <p className="text-gray-400 mt-2">
            Review your event details before creating on blockchain
          </p>
        </div>

        {/* Event Banner */}
        <div className="w-full rounded-lg overflow-hidden mb-8 border border-[#3A3A3A]">
          {formData.image ? (
            <img
              src={
                typeof formData.image === 'string'
                  ? formData.image
                  : URL.createObjectURL(formData.image)
              }
              alt="Event Banner"
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
              <p className="text-white text-lg">No Event Banner Uploaded</p>
            </div>
          )}
        </div>

        {/* Event Title */}
        <div className="rounded-lg border border-[#3A3A3A] p-6 mb-8 space-y-4">
          <h1 className="font-exo text-large tracking-tightest text-white mb-4">
            Event Name: {formData.title || 'Untitled Event'}
          </h1>

          <p className="font-inter text-medium text-white mb-4 whitespace-pre-wrap">
            Description: {formData.description || 'No description provided'}
          </p>

          <div className="flex items-left justify-start gap-2 mb-2">
            <MapPin className="w-5 h-5 text-white" />
            <span className="font-inter text-medium text-white">
              Location: {formData.location || 'Location not specified'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white" />
            <span className="font-inter text-medium text-white">
              Date: {formatDate(formData.startDateTime)} to {formatDate(formData.endDateTime)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-white" />
            <span className="font-inter text-medium text-white">
              Time: {formatTime(formData.startDateTime)} to {formatTime(formData.endDateTime)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <span className="font-inter text-medium text-white">
              Capacity: {formData.capacity} Attendees
            </span>
          </div>
        </div>

        {/* Event Type Information */}
        <div className="rounded-lg border border-[#3A3A3A] p-6 mb-8">
          {/* Network Information */}
          <p className="text-gray-300">
            Current Network: <span className="text-primary">{networkName || 'Unknown'}</span>
          </p>
          <h2 className="font-poppins text-large text-white mb-4">Event Type</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-gray-700 rounded-full text-white">
                {formData.eventType}
              </span>
            </div>

            <p className="text-gray-300">
              {formData.eventType === 'FREE'
                ? 'This is a free event. Attendees will be able to register without payment.'
                : "This is a paid event. You'll need to set up ticket prices after creating the event."}
            </p>
          </div>

          {/* Blockchain Information */}
          <p className="text-gray-300 mt-4">
            When you create this event, it will be stored permanently on the blockchain. You will be
            asked to confirm this transaction with your wallet.
          </p>
          <p className="text-gray-300 text-large">
            Connected wallet:{' '}
            {wallets?.[0]?.address
              ? `${wallets[0].address.slice(0, 6)}...${wallets[0].address.slice(-4)}`
              : 'Not connected'}
          </p>
        </div>

        {/* Error display if any */}
        {error && (
          <div className="rounded-lg border border-red-500 p-4 mb-6 bg-red-900/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-white">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleGoBack}
            className="flex-1 border border-primary text-white py-4 rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors"
            disabled={isCreating}
          >
            Edit Event
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-primary text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Event...
              </>
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPreview;
