import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import {
  createPublicClientInstance,
  createWalletClientInstance,
  TICKET_CITY_ADDR,
} from '../../utils/client';
import { formatEther, parseEther } from 'viem';
import TICKET_CITY_ABI from '../../abi/abi.json';

// Define enums for ticket types to match the contract
const EventType = {
  FREE: 0,
  PAID: 1,
};

const PaidTicketCategory = {
  NONE: 0,
  REGULAR: 1,
  VIP: 2,
};

// Updated Event interface to be more flexible
interface TicketCreationEvent {
  id: number | string; // Accept both number and string to handle different sources
  ticketType: number;
  ticketNFTAddr: `0x${string}` | string; // Accept both Ethereum address format and regular string
  ticketsData: {
    hasRegularTicket: boolean;
    hasVIPTicket: boolean;
    regularTicketFee: bigint | string; // Accept both bigint and string to handle different sources
    vipTicketFee: bigint | string; // Accept both bigint and string to handle different sources
  };
}

interface TicketCreationSectionProps {
  event: TicketCreationEvent;
  fetchEventDetails: (showLoading?: boolean) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const TicketCreationSection = ({
  event,
  fetchEventDetails,
  isLoading,
}: //setIsLoading,
TicketCreationSectionProps) => {
  const { wallets } = useWallets();
  const publicClient = createPublicClientInstance();

  // Helper function to convert string/bigint to formatted string
  const safeFormatEther = (value: string | bigint): string => {
    // If it's already a string, parse it to make sure it's a valid number
    if (typeof value === 'string') {
      try {
        // Try to parse it as BigInt first (for "0x..." hex strings)
        return formatEther(BigInt(value));
      } catch {
        // If that fails, try to parse it as a regular number
        return value;
      }
    }
    // If it's a bigint, format it directly
    return formatEther(value);
  };

  // State for managing ticket creation
  const [ticketState, setTicketState] = useState<TicketState>({
    type: 'REGULAR', // This is the string representation
    typeEnum: PaidTicketCategory.REGULAR, // This is the actual enum value (1 for REGULAR, 2 for VIP)
    price: 0,
    regularPrice: 0,
    vipPrice: 0,
    ticketUrl: '',
    image: null as File | null,
    imageUrl: '',
  });

  const [creationStatus, setCreationStatus] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
    currentType: string | null;
  }>({
    loading: false,
    success: false,
    error: null,
    currentType: null,
  });

  // Handle ticket type and price changes
  interface TicketState {
    type: string;
    typeEnum: number;
    price: number;
    regularPrice: number;
    vipPrice: number;
    ticketUrl: string;
    image: File | null;
    imageUrl: string;
  }

  type TicketField = 'type' | 'regularPrice' | 'vipPrice' | 'ticketUrl';

  const handleTicketChange = (field: TicketField, value: string | number) => {
    setTicketState((prevState: TicketState) => {
      switch (field) {
        case 'type':
          // Update both the string type and the enum value
          const newTypeEnum =
            value === 'REGULAR' ? PaidTicketCategory.REGULAR : PaidTicketCategory.VIP;
          return {
            ...prevState,
            type: value as string,
            typeEnum: newTypeEnum,
            price: value === 'REGULAR' ? prevState.regularPrice : prevState.vipPrice,
          };
        case 'regularPrice':
          return {
            ...prevState,
            regularPrice: Number(value),
            ...(prevState.type === 'REGULAR' && { price: Number(value) }),
          };
        case 'vipPrice':
          return {
            ...prevState,
            vipPrice: Number(value),
            ...(prevState.type === 'VIP' && { price: Number(value) }),
          };
        case 'ticketUrl':
          return {
            ...prevState,
            ticketUrl: String(value),
          };
        default:
          return prevState;
      }
    });
  };

  // Create ticket function with enhanced error handling
  const handleCreateTicket = async () => {
    if (!event || !wallets[0]) {
      setCreationStatus({
        ...creationStatus,
        error: 'Event details not available or wallet not connected',
      });
      return;
    }

    // Ensure we have the ID as a number
    const eventId = typeof event.id === 'string' ? parseInt(event.id, 10) : event.id;

    // For PAID events, validate ticket price based on type
    if (Number(event.ticketType) === EventType.PAID) {
      if (ticketState.type === 'REGULAR' && ticketState.regularPrice <= 0) {
        setCreationStatus({
          ...creationStatus,
          error: 'Regular ticket price must be greater than 0',
        });
        return;
      }

      if (ticketState.type === 'VIP' && ticketState.vipPrice <= 0) {
        setCreationStatus({
          ...creationStatus,
          error: 'VIP ticket price must be greater than 0',
        });
        return;
      }

      // Handle comparison logic for price validation
      if (ticketState.type === 'VIP' && event.ticketsData.hasRegularTicket) {
        const regularFee =
          typeof event.ticketsData.regularTicketFee === 'string'
            ? BigInt(event.ticketsData.regularTicketFee)
            : event.ticketsData.regularTicketFee;

        if (parseEther(ticketState.vipPrice.toString()) <= regularFee) {
          setCreationStatus({
            ...creationStatus,
            error: 'VIP ticket price must be higher than regular ticket price',
          });
          return;
        }
      }

      // Regular tickets must cost less than VIP tickets if they exist
      if (ticketState.type === 'REGULAR' && event.ticketsData.hasVIPTicket) {
        const vipFee =
          typeof event.ticketsData.vipTicketFee === 'string'
            ? BigInt(event.ticketsData.vipTicketFee)
            : event.ticketsData.vipTicketFee;

        if (parseEther(ticketState.regularPrice.toString()) >= vipFee) {
          setCreationStatus({
            ...creationStatus,
            error: 'Regular ticket price must be lower than VIP ticket price',
          });
          return;
        }
      }
    }

    setCreationStatus({
      loading: true,
      success: false,
      error: null,
      currentType: ticketState.type,
    });

    try {
      // Get wallet client
      const provider = await wallets[0].getEthereumProvider();
      const walletClient = createWalletClientInstance(provider);

      // Use image URL if available, otherwise use provided ticket URL
      const ticketUri = ticketState.imageUrl;

      // Determine the appropriate ticket category and price based on event type
      let ticketCategory;
      let ticketPrice;

      // Handle FREE event case
      if (Number(event.ticketType) === EventType.FREE) {
        // For FREE events, use NONE (0) ticket category
        ticketCategory = PaidTicketCategory.NONE;
        ticketPrice = 0n; // Zero price for free tickets
      } else {
        // For PAID events, use the typeEnum value from state
        ticketCategory = ticketState.typeEnum;
        if (ticketState.type === 'REGULAR') {
          ticketPrice = parseEther(ticketState.regularPrice.toString());
        } else {
          ticketPrice = parseEther(ticketState.vipPrice.toString());
        }
      }

      let hash;

      try {
        // Ensure wallet address is properly typed
        const walletAddress = wallets[0].address as `0x${string}`;

        // Create the ticket
        hash = await walletClient.writeContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'createTicket',
          args: [eventId, ticketCategory, ticketPrice, ticketUri],
          account: walletAddress,
        });

        console.log('Create ticket transaction hash:', hash);
      } catch (walletError) {
        // Handle wallet rejections and other transaction initiation errors
        console.error('Transaction initiation error:', walletError);
        setCreationStatus({
          loading: false,
          success: false,
          error: `Transaction failed: ${
            walletError instanceof Error ? walletError.message : 'Unknown error'
          }. Please try again.`,
          currentType: ticketState.type,
        });
        return; // Exit early
      }

      try {
        // Set a timeout for waiting for transaction confirmation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Transaction confirmation timed out after 30 seconds'));
          }, 30000); // 30 second timeout
        });

        // Race between the receipt and timeout
        const receipt = await Promise.race([
          publicClient.waitForTransactionReceipt({
            hash,
          }),
          timeoutPromise,
        ]);

        console.log('Transaction receipt:', receipt);

        if ((receipt as { status: string }).status === 'success') {
          setCreationStatus({
            loading: false,
            success: true,
            error: null,
            currentType: ticketState.type,
          });

          // Reset form for the next ticket type if needed
          if (Number(event.ticketType) === EventType.PAID) {
            if (ticketState.type === 'REGULAR' && !event.ticketsData.hasVIPTicket) {
              setTicketState((prev) => ({
                ...prev,
                type: 'VIP',
                typeEnum: PaidTicketCategory.VIP, // Set the proper enum value (2)
              }));
            }
          }

          // Refresh event details after successful creation
          await fetchEventDetails();
        } else {
          throw new Error('Transaction failed');
        }
      } catch (confirmationError) {
        // Handle confirmation errors (timeouts, etc.)
        console.error('Transaction confirmation error:', confirmationError);

        if (confirmationError instanceof Error && confirmationError.message.includes('timed out')) {
          // Special handling for timeout errors
          setCreationStatus({
            loading: false,
            success: false,
            error:
              'Transaction submitted but confirmation timed out. Your transaction may still complete - please check your wallet or transaction history before trying again.',
            currentType: ticketState.type,
          });
        } else {
          setCreationStatus({
            loading: false,
            success: false,
            error: `Transaction could not be confirmed: ${
              confirmationError instanceof Error ? confirmationError.message : 'Unknown error'
            }`,
            currentType: ticketState.type,
          });
        }
      }
    } catch (error) {
      // Catch any other errors that might have been missed
      console.error('Error creating ticket:', error);
      setCreationStatus({
        loading: false,
        success: false,
        error: `Failed to create ${ticketState.type.toLowerCase()} ticket: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        currentType: ticketState.type,
      });
    }
  };

  // Determine which ticket types can be created
  const canCreateRegular = !event.ticketsData.hasRegularTicket;
  const canCreateVIP = !event.ticketsData.hasVIPTicket;
  const isFreeEvent = Number(event.ticketType) === EventType.FREE;

  // Automatically set the ticket type based on what's available
  useEffect(() => {
    if (Number(event.ticketType) === EventType.PAID) {
      if (canCreateRegular) {
        setTicketState((prev) => ({
          ...prev,
          type: 'REGULAR',
          typeEnum: PaidTicketCategory.REGULAR,
        }));
      } else if (canCreateVIP) {
        setTicketState((prev) => ({
          ...prev,
          type: 'VIP',
          typeEnum: PaidTicketCategory.VIP,
        }));
      }
    }
  }, [event.ticketType, canCreateRegular, canCreateVIP]);

  // For free events, render a simpler interface
  if (isFreeEvent) {
    return (
      <div className="rounded-lg border border-borderStroke p-6">
        <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
          🎟️ Create Free Ticket
        </h2>

        {event.ticketsData.hasRegularTicket ||
        event.ticketNFTAddr !== '0x0000000000000000000000000000000000000000' ? (
          <div className="bg-green-900/30 p-4 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="font-inter text-medium text-white">
              Free ticket has been created successfully!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              {ticketState.imageUrl && (
                <div className="mt-2">
                  <img
                    src={ticketState.imageUrl}
                    alt="Ticket preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            {creationStatus.error && (
              <div className="bg-red-900/30 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="font-inter text-sm text-white">{creationStatus.error}</p>
              </div>
            )}

            <button
              onClick={handleCreateTicket}
              disabled={creationStatus.loading || isLoading}
              className="w-full bg-primary rounded-lg py-3 font-poppins text-[18px] leading-[27px] tracking-wider text-white disabled:opacity-50"
            >
              {creationStatus.loading ? 'Creating...' : 'Create Free Ticket'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // For paid events where both ticket types have been created, show a success message
  if (!canCreateRegular && !canCreateVIP) {
    return (
      <div className="rounded-lg border border-borderStroke p-6">
        <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
          🎟️ Tickets Created
        </h2>
        <div className="bg-green-900/30 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="font-inter text-medium text-white">
            All ticket types have been created successfully!
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {event.ticketsData.hasRegularTicket && (
            <div className="flex justify-between items-center">
              <span className="font-inter text-medium text-white">Regular Ticket:</span>
              <span className="font-inter text-medium text-primary">
                {safeFormatEther(event.ticketsData.regularTicketFee)} ETN
              </span>
            </div>
          )}
          {event.ticketsData.hasVIPTicket && (
            <div className="flex justify-between items-center">
              <span className="font-inter text-medium text-white">VIP Ticket:</span>
              <span className="font-inter text-medium text-primary">
                {safeFormatEther(event.ticketsData.vipTicketFee)} ETN
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For paid events where at least one ticket type still needs to be created
  return (
    <div className="rounded-lg border border-borderStroke p-6">
      <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
        🎟️ Create Ticket
      </h2>

      {/* Success messages for created tickets */}
      {event.ticketsData.hasRegularTicket && (
        <div className="mb-4 bg-green-900/30 p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="font-inter text-sm text-white">
            Regular ticket created: {safeFormatEther(event.ticketsData.regularTicketFee)} ETN
          </p>
        </div>
      )}

      {event.ticketsData.hasVIPTicket && (
        <div className="mb-4 bg-green-900/30 p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="font-inter text-sm text-white">
            VIP ticket created: {safeFormatEther(event.ticketsData.vipTicketFee)} ETN
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* If only one ticket type can be created, show which one */}
        {(!canCreateRegular || !canCreateVIP) && (
          <div className="bg-primary/20 p-3 rounded-lg">
            <p className="font-inter text-medium text-white">
              Creating {canCreateVIP ? 'VIP' : 'Regular'} Ticket
            </p>
          </div>
        )}

        {/* Only show the ticket type selector if both options are available */}
        {canCreateRegular && canCreateVIP && (
          <div>
            <label className="font-inter text-medium text-white block mb-2">
              Ticket Type to Create:
            </label>
            <select
              className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
              value={ticketState.type}
              onChange={(e) => handleTicketChange('type', e.target.value)}
            >
              <option value="REGULAR">REGULAR</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
        )}

        {/* Display only relevant price field based on which ticket can be created */}
        {canCreateRegular && (!canCreateVIP || ticketState.type === 'REGULAR') && (
          <div>
            <label className="font-inter text-medium text-white block mb-2">
              Regular Ticket Price (ETN):
            </label>
            <input
              type="number"
              value={ticketState.regularPrice}
              onChange={(e) => handleTicketChange('regularPrice', e.target.value)}
              className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
              min="0"
              step="0.01"
            />
            {event.ticketsData.hasVIPTicket && (
              <p className="text-sm text-gray-400 mt-1">
                Price must be less than VIP ticket (
                {safeFormatEther(event.ticketsData.vipTicketFee)} ETN)
              </p>
            )}
          </div>
        )}

        {canCreateVIP && (!canCreateRegular || ticketState.type === 'VIP') && (
          <div>
            <label className="font-inter text-medium text-white block mb-2">
              VIP Ticket Price (ETN):
            </label>
            <input
              type="number"
              value={ticketState.vipPrice}
              onChange={(e) => handleTicketChange('vipPrice', e.target.value)}
              className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
              min="0"
              step="0.01"
            />
            {event.ticketsData.hasRegularTicket && (
              <p className="text-sm text-gray-400 mt-1">
                Price must be greater than Regular ticket (
                {safeFormatEther(event.ticketsData.regularTicketFee)} ETN)
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {creationStatus.error && (
          <div className="bg-red-900/30 p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="font-inter text-sm text-white">{creationStatus.error}</p>
          </div>
        )}

        {/* Success message */}
        {creationStatus.success && creationStatus.currentType && (
          <div className="bg-green-900/30 p-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="font-inter text-sm text-white">
              {creationStatus.currentType} ticket created successfully!
            </p>
          </div>
        )}

        <button
          onClick={handleCreateTicket}
          disabled={creationStatus.loading || isLoading}
          className="w-full bg-primary rounded-lg py-3 font-poppins text-[18px] leading-[27px] tracking-wider text-white disabled:opacity-50"
        >
          {creationStatus.loading
            ? `Creating ${
                canCreateVIP && !canCreateRegular
                  ? 'VIP'
                  : canCreateRegular && !canCreateVIP
                  ? 'Regular'
                  : ticketState.type
              } Ticket...`
            : `Create ${
                canCreateVIP && !canCreateRegular
                  ? 'VIP'
                  : canCreateRegular && !canCreateVIP
                  ? 'Regular'
                  : ticketState.type
              } Ticket`}
        </button>
      </div>
    </div>
  );
};

export default TicketCreationSection;
