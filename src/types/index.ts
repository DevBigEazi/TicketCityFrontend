import React from 'react';

// Basic navigation and UI types
export interface NavLink {
  icon: React.ReactNode;
  label: string;
  path: string;
}

export type ViewMode = 'grid' | 'list';

export type EventFilter =
  | 'All'
  | 'Free'
  | 'Paid'
  | 'Regular'
  | 'VIP'
  | 'Virtual'
  | 'In-Person'
  | 'Nearby';

// Enum definitions for ticket types to match the contract
export enum TicketType {
  FREE = 0,
  PAID = 1,
}

export enum PaidTicketCategory {
  NONE = 0,
  REGULAR = 1,
  VIP = 2,
}

// Core data structures that match contract data
export interface EventTicketsData {
  hasRegularTicket: boolean;
  hasVIPTicket: boolean;
  regularTicketFee: bigint;
  vipTicketFee: bigint;
  ticketURI: string;
  regularTicketNFT?: string; // Optional for backward compatibility
  vipTicketNFT?: string; // Optional for backward compatibility
}

export interface EventDetails {
  title: string;
  desc: string;
  imageUri: string;
  location: string;
  startDate: bigint; // Use bigint for uint256 values
  endDate: bigint;
  expectedAttendees: bigint;
  ticketType: number; // Using number instead of typeof TicketType for contract compatibility
  paidTicketCategory?: number; // Made optional for compatibility
  userRegCount: number;
  verifiedAttendeesCount: number;
  ticketFee?: bigint; // Made optional for compatibility
  ticketNFTAddr: `0x${string}` | string;
  organiser: `0x${string}` | string;
}

// Complete Event interface for use with contract data
export interface Event {
  id: number;
  details: EventDetails;
  ticketsData: EventTicketsData;
}

// Interface specifically for the TicketCreationSection component
export interface TicketCreationEvent {
  id: number | string;
  ticketType: number;
  ticketNFTAddr: `0x${string}` | string;
  ticketsData: {
    hasRegularTicket: boolean;
    hasVIPTicket: boolean;
    regularTicketFee: bigint | string;
    vipTicketFee: bigint | string;
  };
}

// UI variant of Event with formatted data for display
export interface UIEvent {
  startTimestamp: number;
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
  rawData: {
    startDate?: string | bigint;
    endDate?: string | bigint;
    [key: string]: any;
  };
  hasNotStarted?: boolean;
  coordinates: { lat: number; lng: number } | null;
  distance: number | null;
  locationInfo?: string; // Optional property for formatted location display
}

export interface EventCardProps {
  event: Event | UIEvent;
  viewMode?: 'grid' | 'list';
  hasTicket?: boolean;
  ticketType?: string;
  isDashboard?: boolean; // Flag to determine if we're in dashboard or listing view
  isVerified?: boolean; // Flag to determine if the ticket is verified
  onCheckIn?: (eventId: string) => void; // Optional check-in callback
  locationInfo?: string; // Add this property for location display
}

// Props types for components
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
  event: TicketCreationEvent;
  fetchEventDetails: (showLoading?: boolean) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export interface FooterSection {
  title: string;
  links: string[];
}

// Interface for network definition
export interface SupportedNetwork {
  id: number;
  name: string;
  icon: string;
  rpcUrls: readonly string[];
  isTestnet: boolean;
}

// API data type - matches your current EventData
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

// Interface for event objects in state
export interface EventObjects {
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
  hasEnded: boolean;
  hasNotStarted: boolean;
  isLive: boolean;
  isVerified: boolean;
  hasTicket: boolean;
  ticketType: string;
  startTimestamp: number;
  endTimestamp: number;
  rawData: EventDataStructure;
  remainingTickets: number;
  hasTicketCreated: boolean;
  hasRegularTicket: boolean;
  hasVIPTicket: boolean;
  coordinates: { lat: number; lng: number } | null;
  distance: number | null;
}

// Interfaces for the event data structure
export interface EventDataStructure {
  title: string;
  desc: string;
  location: string;
  startDate: bigint;
  endDate: bigint;
  ticketType: number;
  imageUri: string;
  organiser: string;
  userRegCount: bigint;
  expectedAttendees: bigint;
  verifiedAttendeesCount: bigint;
}

export interface EventTickets {
  regularTicketFee: bigint;
  vipTicketFee: bigint;
}

export interface TicketDetails {
  eventIds: bigint[];
  ticketTypes: string[];
}

export interface TicketsMap {
  [key: string]: string;
}

export interface NetworkState {
  isTestnet: boolean;
  chainId: number | null;
  isConnected: boolean;
}

// Helper type for converting between contract data and UI data
export interface EventConversionOptions {
  includeRawData?: boolean;
}

// Helper functions
export function adaptEventForTicketCreation(event: Event): TicketCreationEvent {
  // Safely handle the ticketType property
  let ticketTypeValue: number;

  if (typeof event.details.ticketType === 'number') {
    // If it's already a number, use it directly
    ticketTypeValue = event.details.ticketType;
  } else if (event.details.ticketType === TicketType.FREE) {
    // If it matches the FREE enum value
    ticketTypeValue = TicketType.FREE;
  } else {
    // Default to PAID
    ticketTypeValue = TicketType.PAID;
  }

  return {
    id: event.id,
    ticketType: ticketTypeValue,
    ticketNFTAddr: event.details.ticketNFTAddr,
    ticketsData: {
      hasRegularTicket: event.ticketsData.hasRegularTicket,
      hasVIPTicket: event.ticketsData.hasVIPTicket,
      regularTicketFee: event.ticketsData.regularTicketFee,
      vipTicketFee: event.ticketsData.vipTicketFee,
    },
  };
}

// Also fix the convertContractEventToTicketCreationEvent function
export function convertContractEventToTicketCreationEvent(event: Event): TicketCreationEvent {
  // Safely handle the ticketType property
  let ticketTypeValue: number;

  if (typeof event.details.ticketType === 'number') {
    // If it's already a number, use it directly
    ticketTypeValue = event.details.ticketType;
  } else if (event.details.ticketType === TicketType.FREE) {
    // If it matches the FREE enum value
    ticketTypeValue = TicketType.FREE;
  } else {
    // Default to PAID
    ticketTypeValue = TicketType.PAID;
  }

  return {
    id: event.id,
    ticketType: ticketTypeValue,
    ticketNFTAddr: event.details.ticketNFTAddr,
    ticketsData: {
      hasRegularTicket: event.ticketsData.hasRegularTicket,
      hasVIPTicket: event.ticketsData.hasVIPTicket,
      regularTicketFee: event.ticketsData.regularTicketFee,
      vipTicketFee: event.ticketsData.vipTicketFee,
    },
  };
}
