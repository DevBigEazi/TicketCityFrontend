import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublishedEventsComponent from '../../components /Events/PublishedEvents';

interface EventData {
  title: string;
  date: string;
  time: string;
  location: string; 
  description: string;
  capacity: string;
  image: string;
  blockchain: string;
  smartContract: string;
  ticket?: {
    type: string;
    price: string;
  };
}

const PublishedEvents: React.FC = () => {
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventData | null>(null);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem('publishedEventData');
      if (storedData) {
        setEventData(JSON.parse(storedData));
      } else {
        // If no published event data, redirect to explore
        navigate('/explore');
      }
    } catch (error) {
      console.error('Error loading published event data:', error);
      navigate('/explore');
    }
  }, [navigate]);

  if (!eventData) {
    return null;
  }

  return (
    <div className="">
      <PublishedEventsComponent 
        eventData={eventData}
        onBack={() => navigate('/explore')}
      />
    </div>
  );
};

export default PublishedEvents;