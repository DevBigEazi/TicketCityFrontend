import React from 'react';
import { useEffect, useState, useRef } from 'react';
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
import { pinata } from '../../utils/pinata';

import {
  EventData,
  EventTicketsData,
  EventType,
  PaidTicketCategory,
  ErrorStateProps,
  NoEventStateProps,
} from '../../types';

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
const ErrorState: React.FC<ErrorStateProps> = ({ error, navigate }) => (
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
const NoEventState: React.FC<NoEventStateProps> = ({ navigate }) => (
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

const EventDetails: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { refreshUser } = useUser();
  const [balance, setBalance] = useState<string>('Loading...');

  // Local state for event data
  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState<boolean>(false);
  const [hasTicket, setHasTicket] = useState<boolean>(false);
  const [ticketCreated, setTicketCreated] = useState<boolean>(false);

  const [attendanceRate, setAttendanceRate] = useState<string>('Loading...');
  const [selectedTicketType, setSelectedTicketType] = useState<string>('REGULAR');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [transactionHash, setTransactionHash] = useState<string>('');

  // Add new state for tracking last update time
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  console.log(lastUpdated);

  const publicClient = createPublicClientInstance();

  const getETNBalance = async () => {
    if (!wallets || !wallets[0]?.address) return;

    try {
      const walletAddress = wallets[0].address as `0x${string}`; // Explicitly cast to required format

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
    setError(null);

    try {
      const eventIdNumber = parseInt(eventId);

      // Get event data from contract directly
      const eventData = (await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'getEvent',
        args: [eventIdNumber],
      })) as any; // Using any temporarily but will format correctly

      // Get ticket information
      const eventTicketsData = (await publicClient.readContract({
        address: TICKET_CITY_ADDR,
        abi: TICKET_CITY_ABI,
        functionName: 'eventTickets',
        args: [eventIdNumber],
      })) as any; // Using any temporarily but will format correctly

      // Format the ticket data properly
      const formattedTicketsData: EventTicketsData = {
        hasRegularTicket: eventTicketsData[0],
        hasVIPTicket: eventTicketsData[1],
        regularTicketFee: eventTicketsData[2],
        vipTicketFee: eventTicketsData[3],
        ticketURI: eventTicketsData[4],
        regularTicketNFT: eventTicketsData[3],
        vipTicketNFT: eventTicketsData[4],
      };

      // Set event data
      const formattedEvent: EventData = {
        id: eventIdNumber,
        title: eventData[0] || '',
        desc: eventData[1] || '',
        organiser: eventData[2] as `0x${string}`,
        location: eventData[3] || '',
        startDate: eventData[4],
        endDate: eventData[5],
        ticketType: Number(eventData[6]),
        ticketNFTAddr: eventData[7] as `0x${string}`,
        userRegCount: Number(eventData[8]),
        verifiedAttendeesCount: Number(eventData[9]),
        expectedAttendees: Number(eventData[10]),
        imageUri: eventData[11] || '',
        ticketsData: formattedTicketsData,
      };

      setEvent(formattedEvent);

      // Check if tickets have been created
      const hasTicketCreated =
        (Number(formattedEvent.ticketType) === EventType.FREE ||
          Number(formattedEvent.ticketType) === EventType.PAID) &&
        (formattedTicketsData.hasRegularTicket || formattedTicketsData.hasVIPTicket) &&
        formattedEvent.ticketNFTAddr !== '0x0000000000000000000000000000000000000000';

      setTicketCreated(hasTicketCreated);

      // Set appropriate initial ticket type based on what's available
      // Determine if tickets have been created - different logic for FREE vs PAID events
      if (Number(formattedEvent.ticketType) === EventType.FREE) {
        // For FREE events, we only need the NFT contract address to be set
        setTicketCreated(
          formattedEvent.ticketNFTAddr !== '0x0000000000000000000000000000000000000000',
        );
      } else if (Number(formattedEvent.ticketType) === EventType.PAID) {
        // For PAID events, we need ticket types and NFT contract
        setTicketCreated(
          (formattedTicketsData.hasRegularTicket || formattedTicketsData.hasVIPTicket) &&
            formattedEvent.ticketNFTAddr !== '0x0000000000000000000000000000000000000000',
        );
      } else {
        setTicketCreated(false);
      }

      // If user is authenticated, check for user-specific information
      if (authenticated && wallets && wallets[0]?.address) {
        // Check if this user is the organizer of the event
        const walletAddress = wallets[0].address as `0x${string}`;
        const isUserOrganizer =
          walletAddress &&
          formattedEvent.organiser &&
          formattedEvent.organiser.toLowerCase() === walletAddress.toLowerCase();

        setIsOrganizer(isUserOrganizer);

        // Check if user has registered for event
        const hasRegistered = (await publicClient.readContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'hasRegistered',
          args: [walletAddress, eventIdNumber],
        })) as boolean;

        setHasTicket(hasRegistered);
      }

      // Calculate attendance rate
      if (formattedEvent.userRegCount > 0) {
        const rate =
          (Number(formattedEvent.verifiedAttendeesCount) * 100) /
          Number(formattedEvent.userRegCount);
        setAttendanceRate(`${rate.toFixed(1)}%`);
      } else {
        setAttendanceRate('0%');
      }

      // Update the last updated timestamp
      setLastUpdated(new Date());
    } catch (error: any) {
      setError(`Failed to fetch event details: ${error.message || 'Unknown error'}`);
      setEvent(null); // Reset event state on error
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get user's ticket category
  // const getUserTicketCategory = async (
  //   eventId: number,
  //   userAddress: `0x${string}`,
  // ): Promise<string | null> => {
  //   if (!eventId || !userAddress) return null;

  //   try {
  //     // First check if the user has a VIP ticket
  //     const tickets = (await publicClient.readContract({
  //       address: TICKET_CITY_ADDR,
  //       abi: TICKET_CITY_ABI,
  //       functionName: 'eventTickets',
  //       args: [eventId],
  //     })) as any[];

  //     let ticketType = null;

  //     // If user has a VIP ticket
  //     if (tickets[1] && tickets[4]) {
  //       // hasVIPTicket and ticketNFT exists
  //       try {
  //         const vipBalance = (await publicClient.readContract({
  //           address: tickets[4] as `0x${string}`, // VIP ticket NFT address
  //           abi: [
  //             {
  //               inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
  //               name: 'balanceOf',
  //               outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  //               stateMutability: 'view',
  //               type: 'function',
  //             },
  //           ],
  //           functionName: 'balanceOf',
  //           args: [userAddress],
  //         })) as bigint;

  //         if (vipBalance > 0n) {
  //           return 'VIP';
  //         }
  //       } catch (error) {
  //         console.error('Error checking VIP ticket balance:', error);
  //       }
  //     }

  //     // If user has a REGULAR ticket
  //     if (tickets[0] && tickets[3]) {
  //       // hasRegularTicket and ticketNFT exists
  //       try {
  //         const regularBalance = (await publicClient.readContract({
  //           address: tickets[3] as `0x${string}`, // Regular ticket NFT address
  //           functionName: 'balanceOf',
  //           abi: [
  //             {
  //               inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
  //               name: 'balanceOf',
  //               outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  //               stateMutability: 'view',
  //               type: 'function',
  //             },
  //           ],
  //           args: [userAddress],
  //         })) as bigint;

  //         if (regularBalance > 0n) {
  //           return 'REGULAR';
  //         }
  //       } catch (error) {
  //         console.error('Error checking REGULAR ticket balance:', error);
  //       }
  //     }

  //     // Get event details to check if it's a FREE event
  //     const eventData = (await publicClient.readContract({
  //       address: TICKET_CITY_ADDR,
  //       abi: TICKET_CITY_ABI,
  //       functionName: 'getEvent',
  //       args: [eventId],
  //     })) as any[];

  //     // If it's a FREE event
  //     if (Number(eventData[6]) === 0) {
  //       // FREE ticket type
  //       return 'FREE';
  //     }

  //     // If we still don't know the type but user has registered
  //     const hasRegistered = (await publicClient.readContract({
  //       address: TICKET_CITY_ADDR,
  //       abi: TICKET_CITY_ABI,
  //       functionName: 'hasRegistered',
  //       args: [userAddress, eventId],
  //     })) as boolean;

  //     if (hasRegistered) {
  //       // The user has a ticket, but we couldn't determine the type
  //       return 'UNKNOWN';
  //     }

  //     return null;
  //   } catch (error) {
  //     console.error('Error getting user ticket category:', error);
  //     return null;
  //   }
  // };

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
  const formatDate = (timestamp: bigint | undefined): string => {
    if (!timestamp) return 'TBD';
    return new Date(Number(timestamp) * 1000).toDateString();
  };

  // Format time from timestamp
  const formatTime = (timestamp: bigint | undefined): string => {
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
      let ticketCategory: PaidTicketCategory;
      let ticketPrice: bigint;

      if (isFreeEvent) {
        // For FREE events, always use NONE (0) category
        ticketCategory = PaidTicketCategory.NONE;
        ticketPrice = 0n;
      } else {
        // For PAID events, use the selected ticket type
        if (selectedTicketType === 'REGULAR' && event.ticketsData?.hasRegularTicket) {
          ticketCategory = PaidTicketCategory.REGULAR;
          ticketPrice = event.ticketsData.regularTicketFee;
        } else if (selectedTicketType === 'VIP' && event.ticketsData?.hasVIPTicket) {
          ticketCategory = PaidTicketCategory.VIP;
          ticketPrice = event.ticketsData.vipTicketFee;
        } else {
          throw new Error('Selected ticket type is not available for this event');
        }
      }

      // Get wallet client
      const provider = await wallets[0].getEthereumProvider();
      const walletClient = createWalletClientInstance(provider);
      const walletAddress = wallets[0].address as `0x${string}`;

      try {
        // Purchase the ticket
        const hash = await walletClient.writeContract({
          address: TICKET_CITY_ADDR,
          abi: TICKET_CITY_ABI,
          functionName: 'purchaseTicket',
          args: [event.id, ticketCategory],
          value: ticketPrice,
          account: walletAddress,
        });

        // Set transaction hash in state
        setTransactionHash(hash);

        // Store transaction hash in localStorage as immediate solution
        localStorage.setItem(`event_${event.id}_user_${walletAddress}_ticket_tx`, hash);

        // Create ticket metadata for Pinata
        const ticketMetadata = {
          eventId: event.id,
          eventTitle: event.title,
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
          `event-${event.id}-user-${walletAddress.slice(0, 6)}-ticket.json`,
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
          // Refresh event details
          await loadEventDetails();
          // Update balance
          await getETNBalance();
        } else {
          throw new Error('Transaction failed');
        }
      } catch (txError: any) {
        // Check if user rejected the transaction in their wallet
        if (
          txError.message?.includes('rejected') ||
          txError.message?.includes('denied') ||
          txError.message?.includes('cancelled')
        ) {
          throw new Error('Transaction was rejected in wallet');
        } else {
          throw txError; // rethrow other errors
        }
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
      const walletAddress = wallets[0].address as `0x${string}`;

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

  // TicketTypeSelector Component
  const TicketTypeSelector: React.FC = () => {
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
                  REGULAR - {formatEther(event.ticketsData?.regularTicketFee || 0n)} ETN
                </option>
              )}
              {hasVipOption && (
                <option value="VIP">
                  VIP - {formatEther(event.ticketsData?.vipTicketFee || 0n)} ETN
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
  const WalletInfo: React.FC = () => (
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
  const TicketOwnedSection: React.FC = () => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [userTicketType, setUserTicketType] = useState<string>('');
    const [isLoadingTicketType, setIsLoadingTicketType] = useState<boolean>(true);

    // Fetch the user's actual ticket type when component mounts
    useEffect(() => {
      const fetchUserTicketType = async () => {
        if (!event || !wallets || !wallets[0]?.address) return;

        setIsLoadingTicketType(true);
        try {
          const walletAddress = wallets[0].address as `0x${string}`;

          // Get event tickets data
          const eventTicketsData = (await publicClient.readContract({
            address: TICKET_CITY_ADDR,
            abi: TICKET_CITY_ABI,
            functionName: 'eventTickets',
            args: [event.id],
          })) as any[];

          // Format ticket data
          const ticketsData = {
            hasRegularTicket: eventTicketsData[0],
            hasVIPTicket: eventTicketsData[1],
            regularTicketFee: eventTicketsData[2],
            vipTicketFee: eventTicketsData[3],
            regularTicketNFT: eventTicketsData[3] as `0x${string}`, // Regular ticket NFT address
            vipTicketNFT: eventTicketsData[4] as `0x${string}`, // VIP ticket NFT address
          };

          // Check if user has registered for the event
          const hasRegistered = (await publicClient.readContract({
            address: TICKET_CITY_ADDR,
            abi: TICKET_CITY_ABI,
            functionName: 'hasRegistered',
            args: [walletAddress, event.id],
          })) as boolean;

          if (!hasRegistered) {
            setUserTicketType('Not Registered');
            return;
          }

          // For FREE events
          if (Number(event.ticketType) === EventType.FREE) {
            setUserTicketType('FREE');
            return;
          }

          // For PAID events - Check VIP first
          if (ticketsData.hasVIPTicket && ticketsData.vipTicketNFT) {
            try {
              const vipBalance = (await publicClient.readContract({
                address: ticketsData.vipTicketNFT,
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
              })) as bigint;

              if (vipBalance > 0n) {
                setUserTicketType('VIP');
                return;
              }
            } catch (error) {
              console.error('Error checking VIP ticket balance:', error);
            }
          }

          // Then check REGULAR
          if (ticketsData.hasRegularTicket && ticketsData.regularTicketNFT) {
            try {
              const regularBalance = (await publicClient.readContract({
                address: ticketsData.regularTicketNFT,
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
              })) as bigint;

              if (regularBalance > 0n) {
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
          if (wallets && wallets[0]?.address) {
            const walletAddress = wallets[0].address as `0x${string}`;
            try {
              const hasRegistered = (await publicClient.readContract({
                address: TICKET_CITY_ADDR,
                abi: TICKET_CITY_ABI,
                functionName: 'hasRegistered',
                args: [walletAddress, event.id],
              })) as boolean;

              if (hasRegistered) {
                setUserTicketType('REGULAR');
              } else {
                setUserTicketType('UNKNOWN');
              }
            } catch {
              setUserTicketType('UNKNOWN');
            }
          } else {
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
          htmlToImage
            .toPng(ticketRef.current!, {
              quality: 2.0,
              backgroundColor: '#0F0B18',
              width: ticketRef.current!.offsetWidth,
              height: ticketRef.current!.offsetHeight,
              cacheBust: true,
              // Improve image quality
              pixelRatio: 2,
            })
            .then((dataUrl) => {
              const link = document.createElement('a');
              link.download = `${event.title}-Ticket.png`;
              link.href = dataUrl;
              link.click();
            })
            .catch((error) => {
              console.error('Error generating ticket image:', error);
              alert('Failed to download ticket. Please try again.');
            });
        }, 100); // 100ms delay
      });
    };

    return (
      <div className="max-w-3xl mx-auto rounded-2xl border border-[#8A20FF] p-6 bg-[#6A00F4] shadow-lg overflow-hidden">
        {/* Ticket Header */}
        <div className="text-center mb-4 border-b border-dotted border-purple-300 pb-3">
          <div className="flex items-center justify-center mb-2">
            <h2 className="font-poppins text-xl text-white">🎉 You Own a Ticket!</h2>
          </div>
          <p className="text-xs text-purple-200">Powered by Blockchain</p>
        </div>

        {/* Ticket Content */}
        <div ref={ticketRef} className="bg-[#0F0B18] rounded-xl p-6 mb-4">
          <h3 className="font-poppins text-xl text-white mb-4 text-center">{event.title}</h3>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Date:</span>
              <span className="text-white text-sm">{formatDate(event.startDate)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Location:</span>
              <span className="text-white text-sm">{event.location || 'Virtual Event'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Time:</span>
              <span className="text-white text-sm">{formatTime(event.startDate)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Seat No:</span>
              <span className="text-white text-sm">A{event.userRegCount}</span>
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
                {event.ticketType === EventType.FREE
                  ? 'FREE'
                  : userTicketType === 'VIP' && event.ticketsData?.vipTicketFee
                    ? `${formatEther(event.ticketsData.vipTicketFee)} ETN`
                    : userTicketType === 'REGULAR' && event.ticketsData?.regularTicketFee
                      ? `${formatEther(event.ticketsData.regularTicketFee)} ETN`
                      : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">Transaction ID:</span>
              <span className="text-white text-sm truncate">
                {wallets?.[0]?.address
                  ? `${wallets[0].address.slice(0, 6)}...${wallets[0].address.slice(-4)}`
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
            {event.ticketNFTAddr &&
            event.ticketNFTAddr !== '0x0000000000000000000000000000000000000000'
              ? `${event.ticketNFTAddr.slice(0, 6)}...${event.ticketNFTAddr.slice(-4)}`
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
                href={`https://sepolia.basescan.org/tx/${transactionHash}`}
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
  const PurchaseTicketSection: React.FC = () => (
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
  const NoTicketsSection: React.FC = () => (
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
              ? (() => {
                  const timeRemaining = Number(event.startDate) * 1000 - Date.now();
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
                  (!event.ticketsData?.hasRegularTicket || !event.ticketsData?.hasVIPTicket)) ? (
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
