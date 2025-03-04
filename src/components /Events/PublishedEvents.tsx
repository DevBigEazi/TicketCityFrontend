import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PublishedEventsProps {
  onBack: () => void;
  eventData: {
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
    capacity: string;
    image: string;
    ticket?: {
      type: string;
      price: string;
    };
  };
}

const PublishedEventsComponent: React.FC<PublishedEventsProps> = ({ onBack, eventData }) => {
  return (
    <div className="min-h-screen bg-background p-8">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#3A3A3A] bg-background hover:opacity-80 shadow-[inset_1px_1px_10px_0px_#FFFFFF40]"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
        <span className="font-inter text-regular text-white">Back</span>
      </button>

      <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-bold mb-2">Event Successfully Published! 🎉</h1>
          <p className="text-gray-400">Your event is now live and available for ticket sales.</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-white text-xl font-bold">Event Overview</h2>
            <button className="px-4 py-2 border border-[#3A3A3A] rounded-lg text-white">
              Manage Event
            </button>
          </div>

          <div className="rounded-lg overflow-hidden mb-6">
            <img 
              src={eventData.image}
              alt="Event Banner"
              className="w-full h-64 object-cover"
            />
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-white text-xl mb-2">Event Name: {eventData.title}</h3>
              <p className="text-gray-400">Description: {eventData.date} - {eventData.time}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-gray-400">Location: {eventData.location}</p>
              </div>
              <div>
                <p className="text-gray-400">Date: {eventData.date}</p>
              </div>
              <div>
                <p className="text-gray-400">Time: {eventData.time}</p>
              </div>
              <div>
                <p className="text-gray-400">Attendees Capacity: {eventData.capacity}</p>
              </div>
              {eventData.ticket && (
                <div>
                  <p className="text-gray-400">
                    Ticket Price: {eventData.ticket.type === 'FREE' ? 'FREE' : `${eventData.ticket.price} ETN`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-6">
            <button className="px-6 py-2 bg-primary text-white rounded-lg flex items-center gap-2">
              Share Event
            </button>
          </div>

          <div className="text-center space-y-4 pt-8">
            <h3 className="text-white font-bold">Share Event QR Code</h3>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg w-32 h-32">
                {/* QR Code placeholder */}
                <div className="w-full h-full bg-gray-200"></div>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-400">🎫 NFT Ticket Status: Minted</p>
            <p className="text-xs text-gray-400 mt-2">
              This event uses blockchain-based ticketing for security and transparency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishedEventsComponent;