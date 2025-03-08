import React, { useRef } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Link, Users, Calendar, Clock, AlertCircle, Share } from 'lucide-react';
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
import { pinata } from '../../utils/pinata';

// Import unified types
import {
  Event,
  EventDetails as EventDetailsType,
  TicketType,
  PaidTicketCategory,
  ErrorStateProps,
  NoEventStateProps,
  adaptEventForTicketCreation,
} from '../../types/index';

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
const ErrorState = ({ error, navigate }: ErrorStateProps) => (
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
const NoEventState = ({ navigate }: NoEventStateProps) => (
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
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  const [attendanceRate, setAttendanceRate] = useState('Loading...');
  const [selectedTicketType, setSelectedTicketType] = useState('REGULAR');
  const [purchaseError, setPurchaseError] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');

  const publicClient = createPublicClientInstance();

  const walletAddress =
    wallets && wallets.length > 0 && wallets[0]?.address
      ? ((wallets[0].address.startsWith('0x')
          ? wallets[0].address
          : `0x${wallets[0].address}`) as `0x${string}`)
      : ('0x0000000000000000000000000000000000000000' as `0x${string}`);

  // Fetch ETN balance
  const getETNBalance = async () => {
    if (!wallets || !wallets[0]?.address) return;

    try {
      const balanceWei = await publicClient.getBalance({
        address: walletAddress,
      });

      const formattedBalance = formatEther(balanceWei);
      setBalance(parseFloat(formattedBalance).toFixed(4));

      await refreshUser();
    } catch (error) {
      setBalance('Error loading balance');
    }
  };

  // Fetch event details directly from the contract
  const loadEventDetails = async (showLoadingState = false) => {
    if (!eventId) {
      setIsLoading(false);
      setError('Event ID not provided');
      return;
    }

    // Only show loading state on initial load or when explicitly requested
    if (showLoadingState) {
      setIsLoading(true);
    }
    setError('');

    try {
      const eventIdNumber = parseInt(eventId);

      // Get event data from contract directly
      const eventData = (await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'getEvent',
        args: [eventIdNumber],
      })) as unknown as EventDetailsType;

      // Get ticket information
      const eventTicketsData = (await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'eventTickets',
        args: [eventIdNumber],
      })) as [boolean, boolean, bigint, bigint, string];

      // Format the ticket data properly
      const formattedTicketsData = {
        hasRegularTicket: eventTicketsData[0],
        hasVIPTicket: eventTicketsData[1],
        regularTicketFee: eventTicketsData[2],
        vipTicketFee: eventTicketsData[3],
        ticketURI: eventTicketsData[4],
      };

      // Set event data
      const formattedEvent: Event = {
        id: eventIdNumber,
        ticketsData: formattedTicketsData,
        details: eventData,
      };

      setEvent(formattedEvent);

      // Check if tickets have been created
      const hasTicketCreated =
        (Number(eventData.ticketType) === TicketType.FREE ||
          Number(eventData.ticketType) === TicketType.PAID) &&
        (formattedTicketsData.hasRegularTicket || formattedTicketsData.hasVIPTicket) &&
        eventData.ticketNFTAddr !== '0x0000000000000000000000000000000000000000';

      setTicketCreated(hasTicketCreated);

      // Set appropriate initial ticket type based on what's available
      // Determine if tickets have been created - different logic for FREE vs PAID events
      if (Number(eventData.ticketType) === TicketType.FREE) {
        // For FREE events, we only need the NFT contract address to be set
        setTicketCreated(eventData.ticketNFTAddr !== '0x0000000000000000000000000000000000000000');
      } else if (Number(eventData.ticketType) === TicketType.PAID) {
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
          !!wallets[0]?.address &&
          !!eventData.organiser &&
          eventData.organiser.toLowerCase() === walletAddress.toLowerCase();

        setIsOrganizer(isUserOrganizer);

        const hasRegistered = (await publicClient.readContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'hasRegistered',
          args: [walletAddress, eventIdNumber],
        })) as boolean;

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
    } catch (error: any) {
      setError(`Failed to fetch event details: ${error.message || 'Unknown error'}`);
      setEvent(null); // Reset event state on error
    } finally {
      setIsLoading(false);
    }
  };

  // Use this effect for the initial load
  useEffect(() => {
    // Always fetch event details first with loading state shown
    loadEventDetails(true);

    // Then fetch user-specific data if authenticated
    if (authenticated && wallets && wallets[0]?.address) {
      getETNBalance();
    }
  }, [eventId, authenticated, wallets]);

  // Add visibility change detection to refresh data when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User has returned to the tab - refresh data
        loadEventDetails(false);
        if (authenticated && wallets && wallets[0]?.address) {
          getETNBalance();
        }
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listener on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authenticated, wallets]);

  // Format date from timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'TBD';
    return new Date(Number(timestamp) * 1000).toDateString();
  };

  // Format time from timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'TBD';
    return new Date(Number(timestamp) * 1000).toLocaleTimeString();
  };

  // Purchase ticket function error handling
  const handlePurchaseTicket = async () => {
    // Check if event exists and wallet is connected
    if (!event || !wallets || !wallets.length || !wallets[0]) {
      setPurchaseError('Event details not available or wallet not connected');
      return;
    }

    setIsPurchasing(true);
    setPurchaseError('');

    try {
      // First check if the event is FREE or PAID
      const isFreeEvent = Number(event.details.ticketType) === TicketType.FREE;

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

      // Get wallet client
      const provider = await wallets[0].getEthereumProvider();
      const walletClient = createWalletClientInstance(provider);

      try {
        // Ensure we have a valid wallet address (already prepared at the top)
        // Confirm it's a proper Ethereum address format
        if (!walletAddress || walletAddress === '0x0000000000000000000000000000000000000000') {
          throw new Error('Invalid wallet address');
        }

        // Purchase the ticket
        const hash = await walletClient.writeContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'purchaseTicket',
          args: [event.id, ticketCategory],
          value: BigInt(ticketPrice),
          account: walletAddress,
        });

        // Store transaction hash in localStorage as immediate solution
        localStorage.setItem(`event_${event.id}_user_${walletAddress}_ticket_tx`, hash);

        // Create ticket metadata for Pinata
        const ticketMetadata = {
          eventId: event.id,
          eventTitle: event.details.title,
          purchaseDate: new Date().toISOString(),
          userAddress: walletAddress,
          ticketType: selectedTicketType,
          ticketCategory: ticketCategory,
          ticketPrice: ticketPrice.toString(),
          transactionHash: hash,
        };

        // Convert metadata to a file for Pinata upload
        const metadataBlob = new Blob([JSON.stringify(ticketMetadata)], {
          type: 'application/json',
        });

        const metadataFile = new File(
          [metadataBlob],
          `event-${event.id}-user-${walletAddress.slice(0, 8)}-ticket.json`,
        );

        // Upload metadata to Pinata (non-blocking)
        pinata.upload
          .file(metadataFile)
          .then((upload) => {
            const ipfsHash = upload.IpfsHash;
            console.log(`Ticket metadata stored on IPFS with hash: ${ipfsHash}`);

            // Store the IPFS hash for future retrieval
            localStorage.setItem(
              `event_${event.id}_user_${walletAddress}_ticket_metadata`,
              ipfsHash,
            );
          })
          .catch((err) => {
            console.error('Failed to store ticket metadata on IPFS:', err);
          });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
        });

        if (receipt.status === 'success') {
          alert('Ticket purchased successfully!');

          // Set transaction receipt in state
          setTransactionHash(hash);
          // Refresh event details
          await loadEventDetails();
          // Update balance
          await getETNBalance();
        } else {
          throw new Error('Transaction failed');
        }
      } catch (error: unknown) {
        // Type guard to check if error is an object with a message property
        if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string'
        ) {
          // Now TypeScript knows that error.message exists and is a string
          if (
            error.message.includes('rejected') ||
            error.message.includes('denied') ||
            error.message.includes('cancelled')
          ) {
            throw new Error('Transaction was rejected in wallet');
          }
        }
        // Rethrow the original error regardless of type
        throw error;
      }
    } catch (error: any) {
      setPurchaseError(`Failed to purchase ticket: ${error.message || 'Unknown error'}`);
    } finally {
      // Ensure the purchasing state is reset even if there's an error
      setIsPurchasing(false);
    }
  };

  const loadTicketTransactionHash = async () => {
    if (!event || !wallets || !wallets[0]?.address) return;

    try {
      // First check localStorage for the transaction hash (fastest method)
      const storedHash = localStorage.getItem(`event_${event.id}_user_${walletAddress}_ticket_tx`);

      if (storedHash) {
        setTransactionHash(storedHash);
        return;
      }

      // If no direct hash, try to get from IPFS via stored metadata hash
      const metadataHash = localStorage.getItem(
        `event_${event.id}_user_${walletAddress}_ticket_metadata`,
      );

      if (metadataHash) {
        try {
          // Fetch from Pinata using the hash
          const metadataUrl = await pinata.gateways.convert(metadataHash);
          const response = await fetch(metadataUrl);

          if (response.ok) {
            const metadata = await response.json();

            // Set transaction hash from metadata
            if (metadata.transactionHash) {
              setTransactionHash(metadata.transactionHash);

              // Save back to localStorage for future faster retrieval
              localStorage.setItem(
                `event_${event.id}_user_${walletAddress}_ticket_tx`,
                metadata.transactionHash,
              );
            }
          }
        } catch (ipfsError) {
          console.error('Error fetching ticket metadata from IPFS:', ipfsError);
        }
      }
    } catch (error) {
      console.error('Error loading ticket transaction hash:', error);
    }
  };

  useEffect(() => {
    if (event && hasTicket && wallets && wallets[0]?.address) {
      loadTicketTransactionHash();
    }
  }, [event, hasTicket, wallets]);

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
    const isPaidEvent = event && Number(event.details.ticketType) === TicketType.PAID;
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
                  REGULAR - {formatEther(BigInt(event.ticketsData.regularTicketFee))} ETN
                </option>
              )}
              {hasVipOption && (
                <option value="VIP">
                  VIP - {formatEther(BigInt(event.ticketsData.vipTicketFee))} ETN
                </option>
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

  // The TicketOwnedSection component to display the transaction hash
  const TicketOwnedSection = () => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [userTicketType, setUserTicketType] = useState('');
    const [isLoadingTicketType, setIsLoadingTicketType] = useState(true);

    // Fetch the user's actual ticket type when component mounts
    useEffect(() => {
      const fetchUserTicketType = async () => {
        if (!event || !wallets || !wallets[0]?.address) return;

        setIsLoadingTicketType(true);
        try {
          // Get event tickets data
          const eventTicketsData = (await publicClient.readContract({
            address: TICKET_CITY_ADDR,
            abi: TICKET_CITY_ABI,
            functionName: 'eventTickets',
            args: [event.id],
          })) as [boolean, boolean, number, number, string];

          // Format ticket data with explicit types
          const ticketsData = {
            hasRegularTicket: eventTicketsData[0],
            hasVIPTicket: eventTicketsData[1],
            regularTicketFee: eventTicketsData[2],
            vipTicketFee: eventTicketsData[3],
            regularTicketNFT: String(eventTicketsData[3]), // Convert to string
            vipTicketNFT: String(eventTicketsData[4]), // Convert to string
          };

          // Check if user has registered for the event
          const hasRegistered = await publicClient.readContract({
            address: TICKET_CITY_ADDR,
            abi: TICKET_CITY_ABI,
            functionName: 'hasRegistered',
            args: [walletAddress, event.id],
          });

          if (!hasRegistered) {
            setUserTicketType('Not Registered');
            return;
          }

          // For FREE events
          if (Number(event.details.ticketType) === TicketType.FREE) {
            setUserTicketType('FREE');
            return;
          }

          // Properly handle the NFT addresses and ensure they're valid Ethereum addresses
          let vipTicketNFT: `0x${string}` | undefined;
          let regularTicketNFT: `0x${string}` | undefined;

          // Check if vipTicketNFT is a valid value and format it correctly
          if (
            ticketsData.vipTicketNFT &&
            ticketsData.vipTicketNFT !== 'undefined' &&
            ticketsData.vipTicketNFT !== '0'
          ) {
            const addressValue = ticketsData.vipTicketNFT.toString();
            vipTicketNFT = (
              addressValue.startsWith('0x') ? addressValue : `0x${addressValue}`
            ) as `0x${string}`;
          }

          // Check if regularTicketNFT is a valid value and format it correctly
          if (
            ticketsData.regularTicketNFT &&
            ticketsData.regularTicketNFT !== 'undefined' &&
            ticketsData.regularTicketNFT !== '0'
          ) {
            const addressValue = ticketsData.regularTicketNFT.toString();
            regularTicketNFT = (
              addressValue.startsWith('0x') ? addressValue : `0x${addressValue}`
            ) as `0x${string}`;
          }

          // For PAID events - Check VIP first
          if (ticketsData.hasVIPTicket && vipTicketNFT) {
            try {
              const vipBalance = await publicClient.readContract({
                address: vipTicketNFT,
                abi: [
                  {
                    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
                    name: 'balanceOf',
                    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                    stateMutability: 'view',
                    type: 'function',
                  },
                ],
                functionName: 'balanceOf',
                args: [walletAddress],
              });

              if (vipBalance > 0) {
                setUserTicketType('VIP');
                return;
              }
            } catch (error) {
              console.error('Error checking VIP ticket balance:', error);
            }
          }

          // Then check REGULAR
          if (ticketsData.hasRegularTicket && regularTicketNFT) {
            try {
              const regularBalance = await publicClient.readContract({
                address: regularTicketNFT,
                abi: [
                  {
                    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
                    name: 'balanceOf',
                    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                    stateMutability: 'view',
                    type: 'function',
                  },
                ],
                functionName: 'balanceOf',
                args: [walletAddress],
              });

              if (regularBalance > 0) {
                setUserTicketType('REGULAR');
                return;
              }
            } catch (error) {
              console.error('Error checking REGULAR ticket balance:', error);
            }
          }

          // If we got here but user is registered, default to REGULAR for backward compatibility
          setUserTicketType('REGULAR');
        } catch (error) {
          console.error('Error fetching user ticket type:', error);
          // If user is registered but we can't determine type, default to REGULAR
          try {
            const isRegistered = await publicClient.readContract({
              address: TICKET_CITY_ADDR,
              abi: TICKET_CITY_ABI,
              functionName: 'hasRegistered',
              args: [walletAddress, event.id],
            });

            if (isRegistered) {
              setUserTicketType('REGULAR');
            } else {
              setUserTicketType('UNKNOWN');
            }
          } catch (innerError) {
            console.error('Error checking registration status:', innerError);
            setUserTicketType('UNKNOWN');
          }
        } finally {
          setIsLoadingTicketType(false);
        }
      };

      fetchUserTicketType();
    }, [event, wallets]);

    // Function to download ticket as an image
    const downloadTicketAsImage = () => {
      import('html-to-image').then((htmlToImage) => {
        if (ticketRef.current === null) {
          return;
        }

        // Add a small delay to ensure the component is fully rendered
        setTimeout(() => {
          if (ticketRef.current) {
            htmlToImage
              .toPng(ticketRef.current, {
                quality: 2.0,
                backgroundColor: '#0F0B18',
                width: ticketRef.current.offsetWidth,
                height: ticketRef.current.offsetHeight,
                cacheBust: true,
                // Improve image quality
                pixelRatio: 2,
              })
              .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `${event.details.title}-Ticket.png`;
                link.href = dataUrl;
                link.click();
              })
              .catch((error) => {
                console.error('Error generating ticket image:', error);
                alert('Failed to download ticket. Please try again.');
              });
          }
        }, 100); // 100ms delay
      });
    };

    return (
      <div className="max-w-3xl mx-auto rounded-2xl border border-[#8A20FF] p-6 bg-[#6A00F4] shadow-lg overflow-hidden">
        {/* Rest of the component remains the same */}
        {/* Ticket Header */}
        <div className="text-center mb-4 border-b border-dotted border-purple-300 pb-3">
          <div className="flex items-center justify-center mb-2">
            <h2 className="font-poppins text-xl text-white">🎉 You Own a Ticket!</h2>
          </div>
          <p className="text-xs text-purple-200">Powered by Blockchain</p>
        </div>

        {/* Ticket Content */}
        <div ref={ticketRef} className="bg-[#0F0B18] rounded-xl p-6 mb-4">
          <h3 className="font-poppins text-xl text-white mb-4 text-center">
            {event.details.title}
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Date:</span>
              <span className="text-white text-sm">{formatDate(event.details.startDate)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Location:</span>
              <span className="text-white text-sm">
                {event.details.location || 'Virtual Event'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Time:</span>
              <span className="text-white text-sm">{formatTime(event.details.startDate)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Seat No:</span>
              <span className="text-white text-sm">A{event.details.userRegCount}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">
                <span className="text-red-400 mr-1">🎫</span>
                Ticket Type:
              </span>
              <span className="text-white text-sm">
                {isLoadingTicketType ? 'Loading...' : userTicketType}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Price:</span>
              <span className="text-white text-sm">
                {Number(event.details.ticketType) === TicketType.FREE
                  ? 'FREE'
                  : userTicketType === 'VIP' && event.ticketsData?.vipTicketFee
                  ? `${formatEther(BigInt(event.ticketsData.vipTicketFee))} ETN`
                  : userTicketType === 'REGULAR' && event.ticketsData?.regularTicketFee
                  ? `${formatEther(BigInt(event.ticketsData.regularTicketFee))} ETN`
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Transaction ID:</span>
              <span className="text-white text-sm truncate">
                {wallets?.[0]?.address
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : '0x...0000'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Transaction Hash:</span>
              <span className="text-white text-sm truncate">
                {transactionHash
                  ? `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}`
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Entry Status:</span>
              <span className="text-green-400 text-sm">Ready for check-in ✅</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center items-center mb-2">
            <div className="bg-white p-2 rounded-lg w-32 h-32 flex justify-center items-center">
              <div className="text-purple-900 text-center text-xs">
                <div className="grid grid-cols-4 grid-rows-4 gap-1">
                  {Array(16)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 ${Math.random() > 0.5 ? 'bg-purple-900' : 'bg-white'}`}
                      ></div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-white text-center text-sm mb-4">Scan to Verify</p>
        </div>

        {/* Download Button */}
        <div className="flex justify-center">
          <button
            onClick={downloadTicketAsImage}
            className="bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold py-2 px-6 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            Download Ticket
          </button>
        </div>

        {/* Ticket Details */}
        <div className="mt-6 text-sm text-purple-200">
          <p className="mb-2">
            <span className="font-semibold">Ticket NFT Address:</span>{' '}
            {event.details.ticketNFTAddr &&
            event.details.ticketNFTAddr !== '0x0000000000000000000000000000000000000000'
              ? `${event.details.ticketNFTAddr.slice(0, 6)}...${event.details.ticketNFTAddr.slice(
                  -4,
                )}`
              : 'Not available'}
          </p>
          <p>
            Your NFT ticket has been minted to your wallet. Present this ticket at the event
            entrance for verification.
          </p>

          {/* Transaction Hash Details - Only show if available */}
          {transactionHash && (
            <div className="mt-4 p-3 bg-purple-900/30 rounded-lg">
              <p className="mb-1 font-semibold">Transaction Details:</p>
              <p className="break-all text-xs">Hash: {transactionHash}</p>
              <a
                href={`https://blockexplorer.electroneum.com/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-300 hover:text-yellow-400 text-xs inline-block mt-1"
              >
                View on Blockchain Explorer →
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

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
          onClick={() => navigate('/my-events')}
          className="flex items-center gap-2 mb-8 hover:opacity-80"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
          <span className="font-inter text-regular text-white">Back</span>
        </button>

        {/* Event Header */}
        <div className="text-center mb-8">
          <h1 className="font-exo text-xlarge tracking-tightest text-white mb-4">
            {event.details.title || 'Blockchain Summit'} {hasTicket && '🎫'}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-white" />
            <span className="font-inter text-medium text-white">
              {event.details.location || 'Virtual (CrossFi Metaverse)'}
            </span>
          </div>
          <p className="gradient-text font-inter text-medium">
            {new Date() < new Date(Number(event.details.startDate) * 1000)
              ? (() => {
                  const timeRemaining = Number(event.details.startDate) * 1000 - Date.now();
                  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                  const hours = Math.floor(
                    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
                  );
                  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

                  if (days > 0) {
                    return `Event starts in: ${days} day${days !== 1 ? 's' : ''}`;
                  } else if (hours > 0) {
                    return `Event starts in: ${hours} hour${hours !== 1 ? 's' : ''}`;
                  } else if (minutes > 0) {
                    return `Event starts in: ${minutes} minute${minutes !== 1 ? 's' : ''}`;
                  } else {
                    return `Event starts in: ${seconds} second${seconds !== 1 ? 's' : ''}`;
                  }
                })()
              : new Date() < new Date(Number(event.details.endDate) * 1000)
              ? 'Event is live now!'
              : 'Event has ended'}
          </p>
        </div>

        {/* Banner Image */}
        <div className="w-full rounded-lg overflow-hidden mb-8">
          {event.details.imageUri ? (
            <img
              src={event.details.imageUri}
              alt="Event Banner"
              className="w-full h-64 object-cover"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/placeholder-image.jpg';
                target.alt = 'Image not available';
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
              {event.details.organiser
                ? `${event.details.organiser.slice(0, 6)}...${event.details.organiser.slice(-4)}`
                : 'Unknown'}
            </h2>
            <p className="font-inter text-medium text-white mb-4">
              {event.details.desc ||
                'Join top Web3 developers and entrepreneurs as we explore the future of decentralized technology.'}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Date: {formatDate(event.details.startDate)} to {formatDate(event.details.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Time: {formatTime(event.details.startDate)} to {formatTime(event.details.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Ticket NFT:{' '}
                  {event.details.ticketNFTAddr &&
                  event.details.ticketNFTAddr !== '0x0000000000000000000000000000000000000000'
                    ? `${event.details.ticketNFTAddr.slice(
                        0,
                        6,
                      )}...${event.details.ticketNFTAddr.slice(-4)}`
                    : 'Not created yet'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-white" />
                <span className="font-inter text-medium text-white">
                  Capacity: {event.details.expectedAttendees?.toString() || '5000'} Attendees
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
                {(Number(event.details.ticketType) === TicketType.FREE && !ticketCreated) ||
                (Number(event.details.ticketType) === TicketType.PAID &&
                  (!event.ticketsData.hasRegularTicket || !event.ticketsData.hasVIPTicket)) ? (
                  <TicketCreationSection
                    event={adaptEventForTicketCreation(event)}
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

          {/* Always show these buttons for the users if tickets are created */}
          {ticketCreated && (
            <div className="mt-6 space-y-4">
              <button
                onClick={() => {
                  // Get the current URL
                  const eventUrl = window.location.href;

                  // Check if the Web Share API is available (mobile devices mostly)
                  if (navigator.share) {
                    navigator
                      .share({
                        title: `${event.details.title || 'Blockchain Event'}`,
                        text: `Check out this event: ${event.details.title || 'Blockchain Event'}`,
                        url: eventUrl,
                      })
                      .then(() => console.log('Successfully shared'))
                      .catch((error) => console.log('Error sharing:', error));
                  } else {
                    // Fallback for desktop browsers that don't support Web Share API
                    try {
                      // Copy to clipboard
                      navigator.clipboard
                        .writeText(eventUrl)
                        .then(() => {
                          // Create and display a temporary notification
                          const notification = document.createElement('div');
                          notification.textContent = 'Link copied to clipboard!';
                          notification.style.position = 'fixed';
                          notification.style.bottom = '20px';
                          notification.style.left = '50%';
                          notification.style.transform = 'translateX(-50%)';
                          notification.style.backgroundColor = '#6A00F4';
                          notification.style.color = 'white';
                          notification.style.padding = '10px 20px';
                          notification.style.borderRadius = '5px';
                          notification.style.zIndex = '1000';
                          notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

                          document.body.appendChild(notification);

                          // Remove notification after 3 seconds
                          setTimeout(() => {
                            notification.style.opacity = '0';
                            notification.style.transition = 'opacity 0.5s ease-out';
                            setTimeout(() => document.body.removeChild(notification), 500);
                          }, 3000);
                        })
                        .catch((err) => {
                          console.error('Failed to copy link: ', err);
                          alert('Failed to copy link to clipboard. Please try again.');
                        });
                    } catch (err) {
                      console.error('Clipboard API not available:', err);
                      // For older browsers without clipboard API
                      const textArea = document.createElement('textarea');
                      textArea.value = eventUrl;
                      textArea.style.position = 'fixed';
                      textArea.style.left = '-999999px';
                      textArea.style.top = '-999999px';
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();

                      try {
                        const successful = document.execCommand('copy');
                        if (successful) {
                          alert('Link copied to clipboard!');
                        } else {
                          alert('Failed to copy link. Please copy it manually: ' + eventUrl);
                        }
                      } catch (err) {
                        alert('Failed to copy link. Please copy it manually: ' + eventUrl);
                      }

                      document.body.removeChild(textArea);
                    }
                  }
                }}
                className="w-48 h-11 flex justify-center items-center gap-x-1 bg-primary rounded-lg py-3 font-poppins text-[18px] font-medium text-white"
              >
                <Share className="w-5 h-5 text-white" />
                Share Event
              </button>
            </div>
          )}
        </div>

        {/* Footer Information - Hide for organizer */}
        {authenticated && isOrganizer ? null : <EventDetailsFooter />}
      </div>
    </div>
  );
};

export default EventDetails;
