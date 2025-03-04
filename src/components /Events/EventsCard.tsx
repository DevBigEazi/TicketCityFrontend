import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Event } from '../../types';

interface EventCardProps {
  event: Event;
  viewMode?: 'grid' | 'list';
}

const EventCard: React.FC<EventCardProps> = ({ event, viewMode = 'grid' }) => {
  const isGrid = viewMode === 'grid';

  return (
    <Link
      to={`/${event.organiser}/event/${event.id}`}
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
        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute top-4 left-4 bg-white rounded-full px-3 py-1">
          <span className="text-sm font-inter">{event.type}</span>
        </div>
      </div>

      {/* Content Section */}
      <div
        className={`
        ${isGrid ? 'p-4 border-t border-borderStroke' : 'flex-1 py-4'}
      `}
      >
        <h3 className="font-poppins font-semibold text-lg text-white mb-3">{event.title}</h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-textGray" />
            <span className="font-inter text-sm text-textGray">{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-textGray" />
            <span className="font-inter text-sm text-textGray">{event.date}</span>
          </div>
        </div>

        <div
          className={`
          ${isGrid ? 'space-y-3' : 'flex items-center justify-between'}
        `}
        >
          <div className="font-inter font-semibold text-primary">
            {event.price.regular} ETN
            <span className="ml-2 text-textGray">(VIP: {event.price.vip} ETN)</span>
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
