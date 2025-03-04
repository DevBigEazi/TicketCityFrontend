import { useState } from 'react';

import { AlertCircle, CheckCircle } from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import {
  createPublicClientInstance,
  createWalletClientInstance,
  TICKET_CITY_ADDR,
} from '../../utils/client';
import { formatEther, parseEther } from 'viem';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { pinata } from '../../utils/pinata';

// Define enums for ticket types to match the contract
const TicketType = {
  FREE: 0,
  PAID: 1,
};

const PaidTicketCategory = {
  NONE: 0,
  REGULAR: 1,
  VIP: 2,
};

// Create a ticket creation component
const TicketCreationSection = ({ event, fetchEventDetails, isLoading, setIsLoading }) => {
  const { wallets } = useWallets();
  const publicClient = createPublicClientInstance();

  // State for managing ticket creation
  const [ticketState, setTicketState] = useState({
    type: 'REGULAR',
    price: 50,
    regularPrice: 50,
    vipPrice: 120,
    ticketUrl: '',
    image: null,
    imageUrl: '',
  });

  const [creationStatus, setCreationStatus] = useState({
    loading: false,
    success: false,
    error: null,
    currentType: null,
  });

  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setCreationStatus({ ...creationStatus, loading: true, error: null });

        // Upload image to IPFS
        const upload = await pinata.upload.file(file);
        const ipfsUrl = await pinata.gateways.convert(upload.IpfsHash);

        setTicketState((prevState) => ({
          ...prevState,
          image: file,
          imageUrl: ipfsUrl,
          ticketUrl: ipfsUrl, // Also set ticket URL to use the IPFS link
        }));

        setCreationStatus({ ...creationStatus, loading: false });
      } catch (error) {
        console.error('Error uploading image:', error);
        setCreationStatus({
          ...creationStatus,
          loading: false,
          error: `Failed to upload image: ${error.message || 'Unknown error'}`,
        });
      }
    }
  };

  // Handle ticket type and price changes
  const handleTicketChange = (field, value) => {
    setTicketState((prevState) => {
      switch (field) {
        case 'type':
          return {
            ...prevState,
            type: value,
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

    // Validate input fields
    if (!ticketState.ticketUrl && !ticketState.imageUrl) {
      setCreationStatus({
        ...creationStatus,
        error: 'Please upload a ticket image or provide a ticket URL',
      });
      return;
    }

    // For PAID events, validate ticket price based on type
    if (Number(event.ticketType) === TicketType.PAID) {
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

      // VIP tickets must cost more than regular tickets if they exist
      if (
        ticketState.type === 'VIP' &&
        event.ticketsData.hasRegularTicket &&
        ticketState.vipPrice <= Number(formatEther(event.ticketsData.regularTicketFee))
      ) {
        setCreationStatus({
          ...creationStatus,
          error: 'VIP ticket price must be higher than regular ticket price',
        });
        return;
      }

      // Regular tickets must cost less than VIP tickets if they exist
      if (
        ticketState.type === 'REGULAR' &&
        event.ticketsData.hasVIPTicket &&
        ticketState.regularPrice >= Number(formatEther(event.ticketsData.vipTicketFee))
      ) {
        setCreationStatus({
          ...creationStatus,
          error: 'Regular ticket price must be lower than VIP ticket price',
        });
        return;
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
      const ticketUri = ticketState.imageUrl || ticketState.ticketUrl;

      // Determine the appropriate ticket category and price based on event type
      let ticketCategory;
      let ticketPrice;

      // Handle FREE event case
      if (Number(event.ticketType) === TicketType.FREE) {
        // For FREE events, use NONE (0) ticket category
        ticketCategory = PaidTicketCategory.NONE;
        ticketPrice = 0n; // Zero price for free tickets
      } else {
        // For PAID events
        if (ticketState.type === 'REGULAR') {
          ticketCategory = PaidTicketCategory.REGULAR;
          ticketPrice = parseEther(ticketState.regularPrice.toString());
        } else {
          ticketCategory = PaidTicketCategory.VIP;
          ticketPrice = parseEther(ticketState.vipPrice.toString());
        }
      }

      let hash;
      try {
        console.log('Creating ticket with parameters:', {
          eventId: event.id,
          category: ticketCategory,
          ticketFee: ticketPrice,
          ticketUri: ticketUri,
        });

        // Create the ticket
        hash = await walletClient.writeContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'createTicket',
          args: [event.id, ticketCategory, ticketPrice, ticketUri],
          account: wallets[0].address,
        });

        console.log('Create ticket transaction hash:', hash);
      } catch (walletError) {
        // Handle wallet rejections and other transaction initiation errors
        console.error('Transaction initiation error:', walletError);
        setCreationStatus({
          loading: false,
          success: false,
          error: `Transaction failed: ${walletError.message || 'Unknown error'}. Please try again.`,
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

        if (receipt.status === 'success') {
          setCreationStatus({
            loading: false,
            success: true,
            error: null,
            currentType: ticketState.type,
          });

          // Reset form for the next ticket type if needed
          if (Number(event.ticketType) === TicketType.PAID) {
            if (ticketState.type === 'REGULAR' && !event.ticketsData.hasVIPTicket) {
              setTicketState((prev) => ({
                ...prev,
                type: 'VIP',
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

        if (confirmationError.message.includes('timed out')) {
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
              confirmationError.message || 'Unknown error'
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
          error.message || 'Unknown error'
        }`,
        currentType: ticketState.type,
      });
    }
  };

  // Determine which ticket types can be created
  const canCreateRegular = !event.ticketsData.hasRegularTicket;
  const canCreateVIP = !event.ticketsData.hasVIPTicket;
  const isFreeEvent = Number(event.ticketType) === TicketType.FREE;

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
              <label className="font-inter text-medium text-white block mb-2">
                Upload Ticket Image:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
              />
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
                {formatEther(event.ticketsData.regularTicketFee)} XFI
              </span>
            </div>
          )}
          {event.ticketsData.hasVIPTicket && (
            <div className="flex justify-between items-center">
              <span className="font-inter text-medium text-white">VIP Ticket:</span>
              <span className="font-inter text-medium text-primary">
                {formatEther(event.ticketsData.vipTicketFee)} XFI
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
            Regular ticket created: {formatEther(event.ticketsData.regularTicketFee)} XFI
          </p>
        </div>
      )}

      {event.ticketsData.hasVIPTicket && (
        <div className="mb-4 bg-green-900/30 p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="font-inter text-sm text-white">
            VIP ticket created: {formatEther(event.ticketsData.vipTicketFee)} XFI
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Auto-select ticket type if only one type can be created */}
        {canCreateRegular && canCreateVIP ? (
          <div>
            <label className="font-inter text-medium text-white block mb-2">
              Ticket Type to Create:
            </label>
            <select
              className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
              value={ticketState.type}
              onChange={(e) => handleTicketChange('type', e.target.value)}
            >
              {canCreateRegular && <option value="REGULAR">REGULAR</option>}
              {canCreateVIP && <option value="VIP">VIP</option>}
            </select>
          </div>
        ) : (
          // If only one type can be created, show which type is being created
          <div className="bg-primary/20 p-3 rounded-lg">
            <p className="font-inter text-medium text-white">
              Creating {canCreateRegular ? 'Regular' : 'VIP'} Ticket
            </p>
          </div>
        )}

        {/* Image upload */}
        <div>
          <label className="font-inter text-medium text-white block mb-2">
            Upload Ticket Image:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
          />
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

        {/* Display only relevant price field based on which ticket can be created */}
        {canCreateRegular && (!canCreateVIP || ticketState.type === 'REGULAR') && (
          <div>
            <label className="font-inter text-medium text-white block mb-2">
              Regular Ticket Price (XFI):
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
                Price must be less than VIP ticket ({formatEther(event.ticketsData.vipTicketFee)}{' '}
                XFI)
              </p>
            )}
          </div>
        )}

        {canCreateVIP && (!canCreateRegular || ticketState.type === 'VIP') && (
          <div>
            <label className="font-inter text-medium text-white block mb-2">
              VIP Ticket Price (XFI):
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
                {formatEther(event.ticketsData.regularTicketFee)} XFI)
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
                !canCreateRegular && canCreateVIP
                  ? 'VIP'
                  : !canCreateVIP && canCreateRegular
                  ? 'Regular'
                  : ticketState.type
              } Ticket...`
            : `Create ${
                !canCreateRegular && canCreateVIP
                  ? 'VIP'
                  : !canCreateVIP && canCreateRegular
                  ? 'Regular'
                  : ticketState.type
              } Ticket`}
        </button>
      </div>
    </div>
  );
};

export default TicketCreationSection;
