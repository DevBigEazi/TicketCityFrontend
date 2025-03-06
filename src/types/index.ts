// types/index.ts

export interface NavLink {
  icon: React.ReactNode;
  label: string;
  path: string;
}

export type ViewMode = 'grid' | 'list';

export type EventFilter = 'Regular' | 'All' | 'Free' | 'Paid' | 'VIP' | 'Virtual' | 'In-Person';

// export interface Event {
//   id: string;
//   type: string;
//   title: string;
//   location: string;
//   date: string;
//   price: {
//     regular: number;
//     vip: number;
//   };
//   image: string;
//   organiser: string; // Added organiser field for routing
// }

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
  hasTicketCreated: boolean;
  hasRegularTicket: boolean;
  hasVIPTicket: boolean;
  rawData: any;
}

export interface FooterSection {
  title: string;
  links: string[];
}
