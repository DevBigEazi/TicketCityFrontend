import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { createWalletClientInstance } from '../../utils/client';
import { formatEther } from 'viem';
import TICKET_CITY_ABI from '../../abi/abi.json';
import { useNetwork } from '../../contexts/NetworkContext';
import { truncateAddress } from '../../utils/generalUtils';

// Enums for ticket types to match the contract
const TicketType = {
  FREE: 0,
  PAID: 1,
};

const PaidTicketCategory = {
  NONE: 0,
  REGULAR: 1,
  VIP: 2,
};

interface PurchaseTicketSectionProps {
  event: any;
  authenticated: boolean;
  login: () => void;
  wallets: any[];
  refreshEventDetails: () => Promise<void>;
}

const PurchaseTicketSection = ({
  event,
  authenticated,
  login,
  wallets,
  refreshEventDetails,
}: PurchaseTicketSectionProps) => {
  const [selectedTicketType, setSelectedTicketType] = useState('REGULAR');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Use the network context instead of creating clients directly
  const {
    getPublicClient,
    getActiveContractAddress,
    isTestnet,
    currentWalletAddress,
    tokenBalance,
    isConnected,
    networkName,
    refreshData,
  } = useNetwork();

  // Get the public client from network context
  const publicClient = getPublicClient();

  // Determine what options should be available
  const isPaidEvent = event && Number(event.ticketType) === TicketType.PAID;
  const hasRegularOption = isPaidEvent && event.ticketsData?.hasRegularTicket;
  const hasVipOption = isPaidEvent && event.ticketsData?.hasVIPTicket;

  // Make sure we have a valid selection based on available options
  useEffect(() => {
    if (isPaidEvent) {
      if (hasRegularOption && hasVipOption) {
        // Both options available, default to REGULAR if not already set
        if (selectedTicketType !== 'REGULAR' && selectedTicketType !== 'VIP') {
          setSelectedTicketType('REGULAR');
        }
      } else if (hasRegularOption) {
        setSelectedTicketType('REGULAR');
      } else if (hasVipOption) {
        setSelectedTicketType('VIP');
      } else {
        setSelectedTicketType('NONE');
      }
    } else {
      // For free events
      setSelectedTicketType('NONE');
    }
  }, [isPaidEvent, hasRegularOption, hasVipOption]);

  // Purchase ticket function with enhanced error handling
  const handlePurchaseTicket = async () => {
    if (!event || !wallets || !wallets[0]) {
      setPurchaseError('Event details not available or wallet not connected');
      return;
    }

    // Check if network is connected
    if (!isConnected) {
      setPurchaseError('Network RPC is not available. Please check your connection');
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);
    setPurchaseSuccess(false);

    try {
      // First check if the event is FREE or PAID
      const isFreeEvent = Number(event.ticketType) === TicketType.FREE;

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
          ticketCategory = PaidTicketCategory.REGULAR;
          ticketPrice = event.ticketsData.regularTicketFee;
        } else if (selectedTicketType === 'VIP' && event.ticketsData.hasVIPTicket) {
          ticketCategory = PaidTicketCategory.VIP;
          ticketPrice = event.ticketsData.vipTicketFee;
        } else {
          throw new Error('Selected ticket type is not available for this event');
        }
      }

      // Get contract address from context
      const contractAddress = getActiveContractAddress();

      // Verify user has enough balance
      const balanceWei = await publicClient.getBalance({
        address: currentWalletAddress as `0x${string}`,
      });

      if (balanceWei < ticketPrice) {
        throw new Error(
          `Insufficient ETN balance. You need at least ${formatEther(ticketPrice)} ETN.`,
        );
      }

      // Get wallet client - use the isTestnet flag from context
      const provider = await wallets[0].getEthereumProvider();
      const walletClient = createWalletClientInstance(provider, isTestnet);

      try {
        // Purchase the ticket
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: TICKET_CITY_ABI,
          functionName: 'purchaseTicket',
          args: [event.id, ticketCategory],
          value: ticketPrice,
          account: currentWalletAddress as `0x${string}`,
        });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
        });

        if (receipt.status === 'success') {
          setPurchaseSuccess(true);
          // Set timeout to hide success message after 5 seconds
          setTimeout(() => {
            setPurchaseSuccess(false);
          }, 5000);

          // Refresh event details
          await refreshEventDetails();
          // Update balance and network state
          await refreshData();
        } else {
          throw new Error('Transaction failed');
        }
      } catch (txError) {
        // Check if user rejected the transaction in their wallet
        if (
          txError instanceof Error &&
          (txError.message.includes('rejected') ||
            txError.message.includes('denied') ||
            txError.message.includes('cancelled'))
        ) {
          throw new Error('Transaction was rejected in wallet');
        } else {
          throw txError; // rethrow other errors
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      if (error instanceof Error) {
        setPurchaseError(`Failed to purchase ticket: ${error.message || 'Unknown error'}`);
      } else {
        setPurchaseError('Failed to purchase ticket: Unknown error');
      }
    } finally {
      // Ensure the purchasing state is reset even if there's an error
      setIsPurchasing(false);
    }
  };

  // Ticket Type Selector Component
  const TicketTypeSelector = () => {
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
                  Regular Ticket ({formatEther(event.ticketsData.regularTicketFee)} ETN)
                </option>
              )}
              {hasVipOption && (
                <option value="VIP">
                  VIP Ticket ({formatEther(event.ticketsData.vipTicketFee)} ETN)
                </option>
              )}
            </>
          ) : (
            // Free event options
            <option value="NONE">Free Event Ticket</option>
          )}
        </select>
      </div>
    );
  };

  // Render auth button if not authenticated
  if (!authenticated) {
    return (
      <div className="rounded-lg border border-borderStroke p-6">
        <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
          🎟️ Purchase Ticket
        </h2>
        <p className="font-inter text-medium text-white mb-4">
          You need to connect your wallet to purchase a ticket for this event.
        </p>
        <button
          onClick={login}
          className="w-full bg-primary rounded-lg py-3 font-poppins text-[18px] leading-[27px] tracking-wider text-white"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-borderStroke p-6">
      <h2 className="font-poppins text-large text-white flex items-center gap-2 mb-4">
        🎟️ Purchase Ticket
      </h2>

      {/* Network Information */}
      <div className="bg-primary/20 p-3 rounded-lg mb-4">
        <p className="font-inter text-sm text-white">
          Network: {isTestnet ? '🧪 Testnet' : '🌐 Mainnet'}{' '}
          <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
            {networkName} {isConnected ? '(Connected)' : '(RPC Error)'}
          </span>
        </p>
        <p className="font-inter text-sm text-white">
          Wallet: {currentWalletAddress ? truncateAddress(currentWalletAddress) : 'Not connected'}
        </p>
        <p className="font-inter text-sm text-white">
          Contract: {truncateAddress(getActiveContractAddress())}
        </p>
      </div>

      {/* Success message */}
      {purchaseSuccess && (
        <div className="bg-green-900/30 p-4 rounded-lg flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="font-inter text-medium text-white">
            Ticket purchased successfully! Check your wallet.
          </p>
        </div>
      )}

      {/* Error message */}
      {purchaseError && (
        <div className="bg-red-900/30 p-4 rounded-lg flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="font-inter text-medium text-white">{purchaseError}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Balance info */}
        <div className="bg-slate-800/50 p-3 rounded-lg">
          <p className="font-inter text-medium text-white">Your Balance: {tokenBalance} ETN</p>
        </div>

        {/* Ticket selector for paid events */}
        {isPaidEvent && (hasRegularOption || hasVipOption) && <TicketTypeSelector />}

        {/* Price display */}
        <div className="bg-primary/10 p-3 rounded-lg">
          <p className="font-inter text-medium text-white">
            Price:{' '}
            {isPaidEvent
              ? selectedTicketType === 'REGULAR' && hasRegularOption
                ? `${formatEther(event.ticketsData.regularTicketFee)} ETN`
                : selectedTicketType === 'VIP' && hasVipOption
                ? `${formatEther(event.ticketsData.vipTicketFee)} ETN`
                : 'Ticket type not available'
              : 'Free'}
          </p>
        </div>

        {/* Purchase button */}
        <button
          onClick={handlePurchaseTicket}
          disabled={
            isPurchasing ||
            !isConnected ||
            (!hasRegularOption && !hasVipOption && !event.ticketNFTAddr)
          }
          className="w-full bg-primary rounded-lg py-3 font-poppins text-[18px] leading-[27px] tracking-wider text-white disabled:opacity-50"
        >
          {isPurchasing ? 'Processing...' : 'Purchase Ticket'}
        </button>

        {/* Additional info */}
        <p className="text-sm text-gray-400 text-center mt-2">
          Tickets are minted as NFTs and will be sent to your connected wallet.
        </p>
      </div>
    </div>
  );
};

export default PurchaseTicketSection;
