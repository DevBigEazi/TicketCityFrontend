import React from 'react';
import { formatEther as viemFormatEther } from 'viem'; // Import formatEther from viem

export interface NavLink {
  icon: React.ReactNode;
  label: string;
  path: string;
}

export type ViewMode = 'grid' | 'list';

export type EventFilter = 'Regular' | 'All' | 'Free' | 'Paid' | 'VIP' | 'Virtual' | 'In-Person';

// Interface for TicketCreationSection component
export interface TicketCreationEvent {
  id: number | string; // Accept both number and string to handle different sources
  ticketType: number;
  ticketNFTAddr: `0x${string}` | string; // Accept both Ethereum address format and regular string
  ticketsData?: {
    hasRegularTicket: boolean;
    hasVIPTicket: boolean;
    regularTicketFee: bigint | string; // Accept both bigint and string to handle different sources
    vipTicketFee: bigint | string; // Accept both bigint and string to handle different sources
  };
}

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
  event: TicketCreationEvent;
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
  // Accept either a structured object or the original EventData
  rawData: {
    startDate?: string | bigint;
    endDate?: string | bigint;
    [key: string]: any;
  };
  // Optional property that might be needed for hasNotStarted check
  hasNotStarted?: boolean;
}

// Helper type for converting between contract data and UI data
export interface EventConversionOptions {
  includeRawData?: boolean;
}

// Helper function to convert EventData (contract) to Event (UI)
export function convertEventDataToEvent(
  eventData: EventData,
  options: EventConversionOptions = {},
): Event {
  const { includeRawData = true } = options;

  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(eventData.startDate);
  const endTime = Number(eventData.endDate);
  console.log(endTime);

  // Format rawData to match expected structure
  const formattedRawData = {
    startDate: eventData.startDate.toString(),
    endDate: eventData.endDate.toString(),
    // Include other properties from eventData that might be needed
    organiser: eventData.organiser,
    ticketType: eventData.ticketType,
    ticketNFTAddr: eventData.ticketNFTAddr,
    // Add more as needed
  };

  return {
    id: eventData.id.toString(),
    type: eventData.ticketType === EventType.FREE ? 'Free' : 'Paid',
    title: eventData.title,
    description: eventData.desc,
    location: eventData.location,
    date: new Date(Number(eventData.startDate) * 1000).toISOString(),
    endDate: new Date(Number(eventData.endDate) * 1000).toISOString(),
    price: {
      regular: eventData.ticketsData
        ? Number(viemFormatEther(eventData.ticketsData.regularTicketFee))
        : 0,
      vip: eventData.ticketsData ? Number(viemFormatEther(eventData.ticketsData.vipTicketFee)) : 0,
    },
    image: eventData.imageUri,
    organiser: eventData.organiser,
    attendees: {
      registered: eventData.userRegCount,
      expected: eventData.expectedAttendees,
      verified: eventData.verifiedAttendeesCount,
    },
    remainingTickets: eventData.expectedAttendees - eventData.userRegCount,
    hasEnded: Date.now() > Number(eventData.endDate) * 1000,
    hasNotStarted: now < startTime,
    isVerified: true, // Assuming events from contract are verified
    hasTicketCreated: Boolean(
      eventData.ticketNFTAddr &&
        eventData.ticketNFTAddr !== '0x0000000000000000000000000000000000000000',
    ),
    hasRegularTicket: Boolean(eventData.ticketsData?.hasRegularTicket),
    hasVIPTicket: Boolean(eventData.ticketsData?.hasVIPTicket),
    rawData: includeRawData ? formattedRawData : {},
  };
}

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

// A simple formatEther implementation for use outside of viem context
// Note: This is only a fallback - use the viem imported function when possible
export function formatEther(wei: bigint): string {
  return (Number(wei) / 1e18).toString();
}

// Helper function to adapt EventData for TicketCreationSection
export function adaptEventForTicketCreation(eventData: EventData): TicketCreationEvent {
  return {
    id: eventData.id,
    ticketType: eventData.ticketType,
    ticketNFTAddr: eventData.ticketNFTAddr,
    ticketsData: eventData.ticketsData
      ? {
          hasRegularTicket: eventData.ticketsData.hasRegularTicket,
          hasVIPTicket: eventData.ticketsData.hasVIPTicket,
          regularTicketFee: eventData.ticketsData.regularTicketFee,
          vipTicketFee: eventData.ticketsData.vipTicketFee,
        }
      : undefined,
  };
}
