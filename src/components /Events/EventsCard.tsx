import React from 'react';
import { Calendar, MapPin, Ticket, Users, CheckCircle, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UIEvent, Event } from '../../types';

interface EventCardProps {
  event: Event | UIEvent;
  viewMode?: 'grid' | 'list';
  hasTicket?: boolean;
  ticketType?: string;
  isDashboard?: boolean; // Flag to determine if we're in dashboard or listing view
  isVerified?: boolean; // Flag to determine if the ticket is verified
  onCheckIn?: (eventId: string) => void; // Optional check-in callback
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  viewMode = 'grid',
  hasTicket = false,
  //ticketType = 'Unknown',
  isDashboard = false,
  isVerified,
  onCheckIn,
}) => {
  // Guard against undefined or null event
  if (!event) {
    console.error('EventCard received undefined or null event');
    return (
      <div className="rounded-lg overflow-hidden shadow-button-inset backdrop-blur-lg p-4 text-textGray">
        Event data unavailable
      </div>
    );
  }

  // Helper function to determine if this is a UIEvent
  const isUIEvent = (event: Event | UIEvent): event is UIEvent => {
    return 'type' in event && 'image' in event && 'price' in event;
  };

  // Extract data based on event type
  let id: string | number = '';
  let title = 'Untitled Event';
  let location = 'TBD';
  let date = 'TBD';
  let price = { regular: 0, vip: 0 };
  let image = '/placeholder-event.jpg';
  let type = 'Unknown';
  let rawData: { startDate?: string | bigint; endDate?: string | bigint; [key: string]: any } = {};
  let eventVerificationStatus = false;
  let attendees = { registered: 0, expected: 0, verified: 0 };

  if (isUIEvent(event)) {
    // UIEvent extraction
    id = event.id;
    title = event.title;
    location = event.location;
    date = event.date;
    price = event.price;
    image = event.image;
    type = event.type;
    rawData = event.rawData;
    eventVerificationStatus = event.isVerified;
    attendees = event.attendees;
  } else {
    // Event extraction (contract data)
    id = event.id;
    title = event.details.title;
    location = event.details.location;
    // Format date from bigint
    const startDate = new Date(Number(event.details.startDate) * 1000);
    date = startDate.toLocaleDateString();
    // Extract price info from ticketsData
    if (event.ticketsData) {
      price = {
        regular: event.ticketsData.hasRegularTicket
          ? Number(event.ticketsData.regularTicketFee)
          : 0,
        vip: event.ticketsData.hasVIPTicket ? Number(event.ticketsData.vipTicketFee) : 0,
      };
    }
    // Set image from imageUri
    image = event.details.imageUri || '/placeholder-event.jpg';
    // Determine type based on ticketType
    type = event.details.ticketType === 0 ? 'Free' : 'Paid';
    // Set raw data for date calculations
    rawData = {
      startDate: event.details.startDate,
      endDate: event.details.endDate,
    };
    // Calculate attendees
    attendees = {
      registered: event.details.userRegCount,
      expected: Number(event.details.expectedAttendees),
      verified: event.details.verifiedAttendeesCount,
    };
  }

  // Check if event has started but not ended
  const isEventLive = () => {
    if (!rawData || !rawData.startDate || !rawData.endDate) return false;

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const startTime = Number(rawData.startDate);
    const endTime = Number(rawData.endDate);

    return now >= startTime && now < endTime;
  };

  // Calculate if the event has not started yet
  const hasNotStarted = (): boolean => {
    if (!rawData || !rawData.startDate) return false;

    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(rawData.startDate);

    return now < startTime;
  };

  // Determine if the event is currently live
  const isLive = isEventLive();

  // Ensure price values are numbers and handle potential undefined
  const regularPrice = typeof price?.regular === 'number' ? price.regular : 0;
  const vipPrice = typeof price?.vip === 'number' ? price.vip : 0;

  // Handle image loading errors - fixed type issue
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-event.jpg';
  };

  const isGrid = viewMode === 'grid';

  // Get type-specific colors
  const getTypeColor = () => {
    switch (type) {
      case 'Free':
        return 'text-green-800';
      case 'Paid':
        return 'text-blue-800';
      case 'VIP':
        return 'bg-purple-100 text-purple-800';
      case 'Regular':
        return 'bg-orange-100 text-orange-800';
      case 'Virtual':
        return 'bg-indigo-100 text-indigo-800';
      case 'In-Person':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-white text-primary';
    }
  };

  // Use the isVerified prop from component props if provided, otherwise use the event's status
  const ticketIsVerified = typeof isVerified !== 'undefined' ? isVerified : eventVerificationStatus;

  // Show the right badge based on verification status only (ticket label removed)
  const getTicketBadge = () => {
    if (!hasTicket || !isDashboard) {
      return null;
    }

    if (ticketIsVerified) {
      return (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Checked In
        </div>
      );
    }

    return (
      <div className="absolute top-4 right-4 bg-[#FF8A00] text-white px-2 py-1 rounded-md text-xs font-medium flex items-center">
        <Ticket className="w-3 h-3 mr-1" />
      </div>
    );
  };

  // Live indicator component - separate from other components to ensure consistent rendering
  const LiveIndicator = () => (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        backgroundColor: '#FF0000',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 0 8px rgba(255, 0, 0, 0.7)',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'white',
          marginRight: '6px',
          boxShadow: '0 0 5px #FFF',
          animation: 'pulse 1.5s infinite',
        }}
      >
        <style>{`
    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.2;
      }
      100% {
        opacity: 1;
      }
    }
  `}</style>
      </div>
      LIVE
    </div>
  );

  // Handle check-in button click
  const handleCheckInClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onCheckIn) {
      onCheckIn(id.toString());
    }
  };

  // For non-dashboard view
  if (!isDashboard) {
    return (
      <Link
        to={`/event/${id}`}
        className={`
          ${
            isGrid
              ? 'flex flex-col rounded-lg overflow-hidden'
              : 'flex gap-6 rounded-lg overflow-hidden'
          }
          ${isGrid ? 'shadow-button-inset' : ''}
          ${isGrid ? 'backdrop-blur-lg' : ''}
          relative
        `}
      >
        {/* Live indicator for non-dashboard view - placed directly within Link */}
        {isLive && <LiveIndicator />}

        {/* Image Section */}
        <div
          className={`
            relative 
            ${isGrid ? 'w-full aspect-video' : 'w-64 h-48'}
            rounded-lg
            overflow-hidden
          `}
        >
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />

          {/* Type badge */}
          <div
            className={`absolute top-4 left-4 rounded-xl px-3 py-1 bg-[#FFF8F8] ${getTypeColor()}`}
          >
            <span className="text-sm font-inter font-medium">{type}</span>
          </div>
        </div>

        {/* Content Section */}
        <div className={isGrid ? 'p-4 border-t border-borderStroke' : 'flex-1 py-4'}>
          <h3 className="font-poppins font-semibold text-lg text-white mb-3">{title}</h3>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-inter text-sm text-textGray">{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-inter text-sm text-textGray">{location}</span>
            </div>
          </div>

          {/* Public listing UI */}
          <div className={`${isGrid ? 'space-y-3' : 'flex items-center justify-between'}`}>
            <div className="font-inter font-semibold text-primary">
              {regularPrice === 0 ? (
                'Free Ticket'
              ) : (
                <>
                  REGULAR: {regularPrice} ETN <span className="text-white">||</span>
                  {vipPrice > 0 && <span className="ml-2 text-primary">VIP: {vipPrice} ETN</span>}
                </>
              )}
            </div>

            <button
              className={`${
                isGrid
                  ? 'w-full bg-primary rounded-3xl px-4 py-2 text-white font-inter font-normal text-sm'
                  : 'bg-primary rounded-xl px-4 py-2 text-white font-normal font-inter text-sm'
              }`}
            >
              View Details
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // For dashboard view
  return (
    <div
      className={`
        border border-borderStroke rounded-xl shadow-button-inset 
        overflow-hidden bg-cardBg bg-opacity-40 
        backdrop-blur-sm hover:bg-opacity-60 relative
        ${isGrid ? 'flex flex-col' : 'flex flex-row'}
      `}
    >
      {/* Ticket Badge (only shown in dashboard mode) */}
      {getTicketBadge()}

      {/* Live indicator for dashboard view */}
      {isLive && <LiveIndicator />}

      {/* Image Section */}
      <div
        className={`
          relative 
          ${isGrid ? 'h-40 w-full' : 'w-32 h-32'}
          overflow-hidden
        `}
      >
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{title}</h3>

        <div className="space-y-2 mb-2">
          {/* <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm text-textGray truncate">{date}</span>
          </div>
          {viewMode !== 'grid' ? (
            <div className="flex items-center bg-black gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              dvevrvrvrv dwvrvr
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm text-textGray truncate">{location}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm text-textGray truncate">{location}</span>
            </div>
          )} */}
        </div>

        {/* Dashboard-specific UI */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-textGray">
              <Ticket className="w-4 h-4 mr-2 flex-shrink-0 text-primary" />
              <span>{type === 'Free' ? 'Free' : `${regularPrice} ETN`}</span>
            </div>

            {attendees && (
              <div className="flex items-center text-sm text-textGray">
                <Users className="w-4 h-4 mr-1 flex-shrink-0 text-primary" />
                <span>
                  {attendees.registered}/{attendees.expected}
                </span>
              </div>
            )}
          </div>

          {/* Ticket Status and Action Buttons */}
          <div className="mt-3 pt-3 border-t border-borderStroke">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-textGray">Ticket Status:</div>
              <div
                className={`text-xs font-medium ${
                  ticketIsVerified ? 'text-green-400' : 'text-blue-400'
                }`}
              >
                {ticketIsVerified ? 'Checked In' : 'Not Checked In'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* Check-in button - disabled if verified or event hasn't started yet */}
              <button
                onClick={handleCheckInClick}
                disabled={ticketIsVerified || hasNotStarted()}
                className={`
                  flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                  ${
                    ticketIsVerified
                      ? 'bg-green-500 bg-opacity-20 text-green-500 cursor-not-allowed'
                      : hasNotStarted()
                      ? 'bg-gray-500 bg-opacity-20 text-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 text-white'
                  }
                `}
              >
                {ticketIsVerified ? (
                  <>
                    <Check className="w-3 h-3" />
                    Verified
                  </>
                ) : (
                  'Check In'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
