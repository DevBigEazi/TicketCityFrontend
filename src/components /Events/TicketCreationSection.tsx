import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import { parseEther, zeroAddress } from 'viem';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { useNetwork } from '../../contexts/NetworkContext';
import { createWalletClientInstance } from '../../config/client';
import { safeFormatEther, truncateAddress } from '../../utils/utils';
import { PaidTicketCategory, TicketCreationSectionProps, TicketType } from '../../types';

const TicketCreationSection = ({ event, isLoading }: TicketCreationSectionProps) => {
  const { wallets } = useWallets();
  const {
    getPublicClient,
    getActiveContractAddress,
    isTestnet,
    chainId,
    currentWalletAddress,
    contractEvents,
  } = useNetwork();

  // Create public client using the network context
  const publicClient = getPublicClient();

  // State for managing ticket creation
  const [ticketState, setTicketState] = useState({
    type: 'REGULAR', // This is the string representation
    typeEnum: PaidTicketCategory.REGULAR, // This is the actual enum value (1 for REGULAR, 2 for VIP)
    price: 0,
    regularPrice: 0,
    vipPrice: 0,
    ticketUrl: '',
    image: null as File | null,
    imageUrl: '',
  });

  const [creationStatus, setCreationStatus] = useState({
    loading: false,
    success: false,
    error: null as string | null,
    currentType: null as string | null,
  });

  // Validate that we have the correct wallet and network before proceeding
  const validateNetworkAndWallet = () => {
    if (!wallets || !wallets[0]) {
      return 'Wallet not connected';
    }

    if (!currentWalletAddress || currentWalletAddress === zeroAddress) {
      return 'Invalid wallet address';
    }

    if (chainId === null) {
      return 'Network not detected';
    }

    return null; // No error
  };

  // Handle ticket type and price changes
  type TicketField = 'type' | 'regularPrice' | 'vipPrice' | 'ticketUrl';

  const handleTicketChange = (field: TicketField, value: string | number) => {
    setTicketState((prevState) => {
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
    // Validate network and wallet first
    const validationError = validateNetworkAndWallet();
    if (validationError) {
      setCreationStatus({
        ...creationStatus,
        error: validationError,
      });
      return;
    }

    if (!event) {
      setCreationStatus({
        ...creationStatus,
        error: 'Event details not available',
      });
      return;
    }

    // Ensure we have the ID as a number
    const eventId = typeof event.id === 'string' ? parseInt(event.id, 10) : event.id;

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
      // Get wallet client - use the isTestnet flag from network context
      const provider = await wallets[0].getEthereumProvider();
      const walletClient = createWalletClientInstance(provider, isTestnet);

      // Use image URL if available
      const ticketUri = ticketState.imageUrl;

      // Determine the appropriate ticket category and price based on event type
      let ticketCategory;
      let ticketPrice;

      // Handle FREE event case
      if (Number(event.ticketType) === TicketType.FREE) {
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
        // Get contract address from network context
        const contractAddress = getActiveContractAddress();
        console.log(`Creating ticket on contract: ${contractAddress} (isTestnet: ${isTestnet})`);

        // Create the ticket using the wallet address from context
        hash = await walletClient.writeContract({
          address: contractAddress,
          abi: TICKET_CITY_ABI,
          functionName: 'createTicket',
          args: [eventId, ticketCategory, ticketPrice, ticketUri],
          account: currentWalletAddress as `0x${string}`,
        });

        console.log('Create ticket transaction hash:', hash);
      } catch (walletError: any) {
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
          if (Number(event.ticketType) === TicketType.PAID) {
            if (ticketState.type === 'REGULAR' && !event.ticketsData.hasVIPTicket) {
              setTicketState((prev) => ({
                ...prev,
                type: 'VIP',
                typeEnum: PaidTicketCategory.VIP, // Set the proper enum value (2)
              }));
            }
          }
        } else {
          throw new Error('Transaction failed');
        }
      } catch (confirmationError: any) {
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
    } catch (error: any) {
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
  const isFreeEvent = Number(event.ticketType) === TicketType.FREE;

  // Automatically set the ticket type based on what's available
  useEffect(() => {
    if (Number(event.ticketType) === TicketType.PAID) {
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

  // Effect to monitor contract events and update UI accordingly
  useEffect(() => {
    // If we have new contract events and the component is in a success state,
    // the event listener in the context has caught new events so we should show updated UI
    if (contractEvents.length > 0 && creationStatus.success) {
      // Reset status after a short delay for better UX
      const timeoutId = setTimeout(() => {
        setCreationStatus((prev) => ({
          ...prev,
          success: false,
          currentType: null,
        }));
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [contractEvents, creationStatus.success]);

  // Reset error status when network or wallet changes
  useEffect(() => {
    if (creationStatus.error) {
      setCreationStatus((prev) => ({
        ...prev,
        error: null,
      }));
    }
  }, [isTestnet, chainId, currentWalletAddress]);

  // For free events, render a simpler interface
  if (isFreeEvent) {
    return (
      <div className="rounded-lg border border-borderStroke p-6">
        <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
          🎟️ Create Free Ticket
        </h2>

        {event.ticketsData.hasRegularTicket || event.ticketNFTAddr !== zeroAddress ? (
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

            {/* Network Information */}
            <div className="bg-primary/20 p-3 rounded-lg">
              <p className="font-inter text-sm text-white">
                Network: {isTestnet ? '🧪 Testnet' : '🌐 Mainnet'}{' '}
              </p>
              <p className="font-inter text-sm text-white">
                Wallet:{' '}
                {currentWalletAddress ? truncateAddress(currentWalletAddress) : 'Not connected'}
              </p>
              <p className="font-inter text-sm text-white">
                Contract: {truncateAddress(getActiveContractAddress())}
              </p>
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
        {/* Network Information */}
        <div className="bg-primary/20 p-3 rounded-lg">
          <p className="font-inter text-sm text-white">
            Network: {isTestnet ? '🧪 Testnet' : '🌐 Mainnet'}{' '}
            {chainId ? `(Chain ID: ${chainId})` : ''}
          </p>
          <p className="font-inter text-sm text-white">
            Wallet: {currentWalletAddress ? truncateAddress(currentWalletAddress) : 'Not connected'}
          </p>
          <p className="font-inter text-sm text-white">
            Contract: {truncateAddress(getActiveContractAddress())}
          </p>
        </div>

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
