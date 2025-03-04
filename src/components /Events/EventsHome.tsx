import React, { useState } from 'react';

import EventCard from './EventsCard';
import { Event, ViewMode } from '../../types';
import { EventImg1 } from '../../assets';

const EventsDashboardHome: React.FC = () => {
  const [viewMode] = useState<ViewMode>('grid');
  //   const [activeFilter, setActiveFilter] = useState<EventFilter>('All');

  // Mock events data - in real app, this would come from an API
  const events: Event[] = [
    {
      id: '1',
      type: 'Live',
      title: 'Blockchain Summit',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '2',
      type: 'Live',
      title: 'Blockchain Summit',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '3',
      type: 'Live',
      title: 'Blockchain Summit',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '4',
      type: 'Live',
      title: 'Blockchain Summit',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '5',
      type: 'Live',
      title: 'Blockchain Summit',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '6',
      type: 'Live',
      title: 'Blockchain Summit',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '7',
      type: 'Live',
      title: 'Blockchain Summit',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '8',
      type: 'Live',
      title: 'Blockchain Summit',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '9',
      type: 'Live',
      title: 'NFT Expo',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025 | 3:00 PM',
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
    {
      id: '10',
      type: 'Live',
      title: 'Metaverse Fashion Show',
      location: 'Virtual (CrossFi Metaverse)',
      date: 'December 15, 2023 | 3:00 PM', // Past event
      price: { regular: 50, vip: 100 },
      image: EventImg1,
    },
  ];

  // Separate events into upcoming and past
  const currentDate = new Date();
  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.date.split('|')[0].trim());
    return eventDate >= currentDate;
  });

  const pastEvents = events.filter((event) => {
    const eventDate = new Date(event.date.split('|')[0].trim());
    return eventDate < currentDate;
  });

  return (
    <div className="p-6">
      {/* Wallet and Ticket Overview Section */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Wallet Info Card */}
        <div className="  shadow-button-inset border border-borderStroke  rounded-xl p-6 flex-1 backdrop-blur-sm">
          <h3 className="text-white text-xl font-semibold mb-4">Wallet Address</h3>
          <p className="text-emerald-400 text-lg mb-6">0xA3B...4F1</p>

          <h3 className="text-white text-xl font-semibold mb-2">ETN Balance</h3>
          <p className="text-amber-400 text-3xl font-bold">1200 ETN</p>
        </div>

        {/* Ticket Overview Card */}
        <div className="shadow-button-inset border border-borderStroke  rounded-xl p-6 flex-1 backdrop-blur-sm">
          <h3 className="text-white text-xl font-semibold mb-4">Ticket Overview</h3>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-rose-400">🎟</span>
              <span className="text-white">Total Tickets:</span>
              <span className="text-rose-400 font-semibold">5</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✅</span>
              <span className="text-white">Checked-in Events:</span>
              <span className="text-emerald-400 font-semibold">3</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400">⌛</span>
              <span className="text-white">Pending Check-in:</span>
              <span className="text-amber-400 font-semibold">2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            Upcoming <span className="text-primary">Events</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} viewMode={viewMode} />
          ))}
        </div>
      </div>

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <div>
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-bold text-white">
              Past <span className="text-primary">Events</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} viewMode={viewMode} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsDashboardHome;
