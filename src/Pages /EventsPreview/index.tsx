import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { EventPreviewComponent, EventFormData } from '../../components /Events/EventsPreview';
const EventsPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [eventData, setEventData] = useState<EventFormData | null>(null);

  useEffect(() => {
    try {
      // First priority: use location state if it exists (from form submission)
      const stateData = location.state as EventFormData | null;

      if (stateData && stateData.title) {
        // We have complete data from the form including the image
        setEventData(stateData);
        return;
      }

      // Second priority: check localStorage
      const storedData = localStorage.getItem('eventFormData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);

        // If we have location state with an image, merge it with localStorage data
        if (stateData?.image) {
          setEventData({
            ...parsedData,
            image: stateData.image,
          });
          return;
        }

        // If we don't have an image, redirect to the form
        navigate('/create-event');
      } else {
        navigate('/create-event');
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      navigate('/create-event');
    }
  }, [navigate, location]);

  const handlePublish = (publishData: any) => {
    try {
      // Store the complete data
      localStorage.setItem('publishedEventData', JSON.stringify(publishData));
      // Clear the event form data
      localStorage.setItem('clearEventForm', 'true');
      // Navigate to published events page
      navigate('/published-events');
    } catch (error) {
      console.error('Error publishing event:', error);
    }
  };

  if (!eventData) {
    return null;
  }

  return (
    <div className="">
      <EventPreviewComponent
        eventData={eventData}
        onBack={() => navigate('/create-event')}
        onPublish={handlePublish}
        onEdit={() => navigate('/create-event', { state: eventData })}
      />
    </div>
  );
};

export default EventsPreview;
