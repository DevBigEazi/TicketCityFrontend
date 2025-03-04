import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar, Ticket } from 'lucide-react';
import { EventImg1 } from '../../assets';

const MyEventsComponent: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');

  // Sample event data
  const events = [
    {
      id: 1,
      title: 'Blockchain Summit',
      image: EventImg1,
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025',
      time: '3:00 PM',
      ticketsSold: 150,
      ticketsTotal: 200,
    },
    {
      id: 2,
      title: 'Blockchain Summit',
      image: EventImg1,
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025',
      time: '3:00 PM',
      ticketsSold: 150,
      ticketsTotal: 200,
    },
    {
      id: 3,
      title: 'Blockchain Summit',
      image: EventImg1,
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025',
      time: '3:00 PM',
      ticketsSold: 150,
      ticketsTotal: 200,
    },
    {
      id: 4,
      title: 'Blockchain Summit',
      image: EventImg1,
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025',
      time: '3:00 PM',
      ticketsSold: 150,
      ticketsTotal: 200,
    },
    {
      id: 5,
      title: 'Blockchain Summit',
      image: EventImg1,
      location: 'Virtual (CrossFi Metaverse)',
      date: 'August 10, 2025',
      time: '3:00 PM',
      ticketsSold: 150,
      ticketsTotal: 200,
    },
  ];

  return (
    <div className="w-full min-h-screen bg-background p-6">
      {/* Welcome Header */}
      <div className="mb-8 rounded-2xl  border border-borderStroke shadow-button-inset p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <h1 className="text-white text-2xl md:text-3xl font-poppins">
            Welcome, <span className="text-[#8B5CF6]">Lily</span>
          </h1>
          <div className="flex mt-4 md:mt-0 gap-4">
            <div className="flex items-center bg-[#201c2b] px-4 py-2 rounded-lg">
              <span className="font-poppins text-white mr-2">ETN Balance: ••••</span>
            </div>
            <button className="bg-transparent border border-primary text-primary rounded-lg px-4 py-2 font-poppins hover:bg-primary/10 transition-colors">
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl hover:scale-105 hover:shadow-button-inset  border border-borderStroke shadow-light-inset-shadow p-6">
          <h3 className="text-white text-lg font-poppins mb-2">Total Revenue</h3>
          <p className="text-primary text-2xl font-bold">3,500 ETN</p>
        </div>
        <div className="rounded-2xl hover:scale-105 hover:shadow-button-inset  border border-borderStroke shadow-light-inset-shadow p-6">
          <h3 className="text-white text-lg font-poppins mb-2">Revenue Pending</h3>
          <p className="text-primary text-2xl font-bold">1,200 ETN</p>
        </div>
        <div className="rounded-2xl hover:scale-105 hover:shadow-button-inset  border border-borderStroke shadow-light-inset-shadow p-6">
          <h3 className="text-white text-lg font-poppins mb-2">Refunds Issued</h3>
          <p className="text-primary text-2xl font-bold">300 ETN</p>
        </div>
      </div>

      {/* My Events Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-2xl font-poppins">
            My <span className="text-[#8B5CF6]">Events</span>
          </h2>
          <button
            onClick={() => navigate('/create-event')}
            className="bg-primary rounded-lg px-4 py-2 font-poppins text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={24} />
            Create New Event
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['upcoming', 'ongoing', 'past'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-poppins ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : ' text-textGray border border-borderStroke hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-borderStroke shadow-button-inset overflow-hidden"
            >
              <img src={event.image} alt={event.title} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="text-white text-xl font-poppins mb-3">{event.title}</h3>
                <div className="flex items-center text-textGray mb-2">
                  <MapPin size={16} className="mr-2" />
                  <span className="text-sm">{event.location}</span>
                </div>
                <div className="flex items-center text-textGray mb-2">
                  <Calendar size={16} className="mr-2" />
                  <span className="text-sm">
                    {event.date} | {event.time}
                  </span>
                </div>
                <div className="flex items-center text-textGray mb-4">
                  <Ticket size={16} className="mr-2" />
                  <span className="text-sm">
                    Tickets Sold: {event.ticketsSold}/{event.ticketsTotal}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/manage-event/${event.id}`)}
                  className="w-full bg-primary rounded-2xl py-1 text-center text-white font-inter font-normal hover:opacity-90 transition-opacity"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scan QR Section */}
      <div className="mb-8">
        <h2 className="text-white text-2xl font-poppins mb-6">Scan QR for Attendance</h2>
        <div
          onClick={() => navigate('/attendance-scan')}
          className="rounded-2xl  border border-borderStroke shadow-button-inset p-8 flex items-center justify-center cursor-pointer hover:bg-[#1c1827] transition-colors"
        >
          <p className="text-textGray">[QR Scanner Here]</p>
        </div>
      </div>
    </div>
  );
};

export default MyEventsComponent;
