import React from 'react';

export interface NavLink {
  icon: React.ReactNode;
  label: string;
  path: string;
}

export type ViewMode = 'grid' | 'list';

export type EventFilter = 'Regular' | 'All' | 'Free' | 'Paid' | 'VIP' | 'Virtual' | 'In-Person';

export interface EventTicketsData {
  hasRegularTicket: boolean;
  hasVIPTicket: boolean;
  regularTicketFee: bigint;
  vipTicketFee: bigint;
  ticketURI: string;
  regularTicketNFT?: string; // Optional for backward compatibility
  vipTicketNFT?: string; // Optional for backward compatibility
}

export interface EventData {
  id: number;
  title: string;
  desc: string;
  organiser: `0x${string}`; // Address format
  location: string;
  startDate: bigint;
  endDate: bigint;
  ticketType: number; // Using enum values
  ticketNFTAddr: `0x${string}`; // Address format
  userRegCount: number;
  verifiedAttendeesCount: number;
  expectedAttendees: number;
  imageUri: string;
  ticketsData?: EventTicketsData; // Optional because it's added after fetching
}

// Enums for ticket types to match the contract
export enum EventType {
  FREE = 0,
  PAID = 1,
}

export enum PaidTicketCategory {
  NONE = 0,
  REGULAR = 1,
  VIP = 2,
}

// Props types for components in EventDetails
export interface ErrorStateProps {
  error: string;
  navigate: (to: number) => void;
}

export interface NoEventStateProps {
  navigate: (to: number) => void;
}

export interface TicketTypeSelectorProps {
  event: EventData;
  selectedTicketType: string;
  setSelectedTicketType: (type: string) => void;
  authenticated: boolean;
  isPurchasing: boolean;
}

export interface TicketCreationSectionProps {
  event: EventData;
  fetchEventDetails: (showLoading?: boolean) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// This is your existing Event interface for the UI components
export interface Event {
  id: string;
  type: string;
  title: string;
  description: string;
  location: string;
  date: string;
  endDate: string;
  price: {
    regular: number;
    vip: number;
  };
  image: string;
  organiser: string;
  attendees: {
    registered: number;
    expected: number;
    verified: number;
  };
  remainingTickets: number;
  hasEnded: boolean;
  isVerified: boolean;
  hasTicketCreated: boolean;
  hasRegularTicket: boolean;
  hasVIPTicket: boolean;
  rawData: unknown;
}

// Helper type for converting between contract data and UI data
export interface EventConversionOptions {
  includeRawData?: boolean;
}

// Helper function to convert EventData (contract) to Event (UI)
// export function convertEventDataToEvent(
//   eventData: EventData,
//   options: EventConversionOptions = {},
// ): Event {
//   const { includeRawData = true } = options;

//   return {
//     id: eventData.id.toString(),
//     type: eventData.ticketType === EventType.FREE ? 'Free' : 'Paid',
//     title: eventData.title,
//     description: eventData.desc,
//     location: eventData.location,
//     date: new Date(Number(eventData.startDate) * 1000).toISOString(),
//     endDate: new Date(Number(eventData.endDate) * 1000).toISOString(),
//     price: {
//       regular: eventData.ticketsData
//         ? Number(formatEther(eventData.ticketsData.regularTicketFee))
//         : 0,
//       vip: eventData.ticketsData ? Number(formatEther(eventData.ticketsData.vipTicketFee)) : 0,
//     },
//     image: eventData.imageUri,
//     organiser: eventData.organiser,
//     attendees: {
//       registered: eventData.userRegCount,
//       expected: eventData.expectedAttendees,
//       verified: eventData.verifiedAttendeesCount,
//     },
//     remainingTickets: eventData.expectedAttendees - eventData.userRegCount,
//     hasEnded: Date.now() > Number(eventData.endDate) * 1000,
//     isVerified: true, // Assuming events from contract are verified
//     hasTicketCreated: Boolean(
//       eventData.ticketNFTAddr &&
//         eventData.ticketNFTAddr !== '0x0000000000000000000000000000000000000000',
//     ),
//     hasRegularTicket: Boolean(eventData.ticketsData?.hasRegularTicket),
//     hasVIPTicket: Boolean(eventData.ticketsData?.hasVIPTicket),
//     rawData: includeRawData ? eventData : undefined,
//   };
// }

export interface FooterSection {
  title: string;
  links: string[];
}

// Wallet and blockchain related types
export interface Wallet {
  address: string;
  getEthereumProvider: () => Promise<any>;
  // Add other wallet properties as needed
}

// Helper function type definition
export type FormatEther = (wei: bigint) => string;

// Add this at the top of the file
function formatEther(wei: bigint): string {
  // Simple implementation that converts wei to ether
  return (Number(wei) / 1e18).toString();
}
