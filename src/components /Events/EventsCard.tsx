import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Event } from '../../types';

interface EventCardProps {
  event: Event;
  viewMode?: 'grid' | 'list';
}

const EventCard: React.FC<EventCardProps> = ({ event, viewMode = 'grid' }) => {
  // Guard against undefined or null event
  if (!event) {
    console.error('EventCard received undefined or null event');
    return (
      <div className="rounded-lg overflow-hidden shadow-button-inset backdrop-blur-lg p-4 text-textGray">
        Event data unavailable
      </div>
    );
  }

  // Safely extract properties with defaults to prevent runtime errors
  const {
    id = '',
    title = 'Untitled Event',
    description = 'No description available',
    location = 'TBD',
    date = 'TBD',
    price = { regular: 0, vip: 0 },
    image = '/placeholder-event.jpg',
    type = 'Unknown',
  } = event;

  // Ensure price values are numbers and handle potential undefined
  const regularPrice = typeof price?.regular === 'number' ? price.regular : 0;
  const vipPrice = typeof price?.vip === 'number' ? price.vip : 0;

  // Handle image loading errors
  const handleImageError = (e) => {
    e.target.src = '/placeholder-event.jpg';
  };

  const isGrid = viewMode === 'grid';

  // Check if event has started but not ended
  const isEventLive = () => {
    if (!event.rawData) return false;

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const startTime = Number(event.rawData.startDate);
    const endTime = Number(event.rawData.endDate);

    return now >= startTime && now < endTime;
  };

  // Get type-specific colors
  const getTypeColor = () => {
    switch (type) {
      case 'Free':
        return 'bg-green-100 text-green-800';
      case 'Paid':
        return 'bg-blue-100 text-blue-800';
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
    `}
    >
      {/* Image Section */}
      <div
        className={`
          relative 
          ${isGrid ? 'w-full aspect-video' : 'w-64 h-48'}
          rounded-lg overflow-hidden
        `}
      >
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
        {/* Type label with dynamic color */}
        <div className={`absolute top-4 left-4 rounded-full px-3 py-1 ${getTypeColor()}`}>
          <span className="text-sm font-inter font-medium">{type}</span>
        </div>

        {/* Live indicator */}
        {isEventLive() && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 rounded-full px-3 py-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-inter text-white font-medium">LIVE</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div
        className={`
        ${isGrid ? 'p-4 border-t border-borderStroke' : 'flex-1 py-4'}
      `}
      >
        <h3 className="font-poppins font-semibold text-lg text-white mb-3">{title}</h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-inter text-sm text-textGray">{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-inter text-sm text-textGray">{date}</span>
          </div>
        </div>

        <div
          className={`
          ${isGrid ? 'space-y-3' : 'flex items-center justify-between'}
        `}
        >
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
                ? 'w-full bg-primary rounded-lg px-4 py-2 text-white font-inter text-sm'
                : 'bg-primary rounded-lg px-4 py-2 text-white font-inter text-sm'
            }`}
          >
            View Details
          </button>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
