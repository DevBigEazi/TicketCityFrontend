import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EventPreviewComponent, EventFormData } from '../../components /Events/EventsPreview';

// Adapt to match your actual EventData interface structure
interface EventData {
  title: string;
  startDateTime: string; // Changed from date
  endDateTime: string; // Added to match EventFormData
  location: string;
  description: string;
  capacity: number; // Changed from string to number
  image: File | null; // Changed from string to File | null
  eventType: 'PAID' | 'FREE'; // Changed from blockchain
  ticketType: string; // Added to match EventFormData
}

const EventsPreview: React.FC = () => {
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventData | null>(null);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem('eventFormData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);

        // If image is stored as a path, you'll need to handle that differently
        // This is a placeholder for image conversion if needed
        let imageFile: File | null = null;
        if (parsedData.image && typeof parsedData.image === 'string') {
          // You might need to fetch the image or handle it differently
          console.warn('Image is stored as a string path, not as a File object');
          // imageFile would remain null here
        } else {
          imageFile = parsedData.image;
        }

        // Create a properly formatted event data object
        const formattedEventData: EventData = {
          title: parsedData.title,
          startDateTime: parsedData.startDateTime || parsedData.date, // Use either format
          endDateTime: parsedData.endDateTime || parsedData.endDate, // Use either format
          location: parsedData.location,
          description: parsedData.description,
          capacity:
            typeof parsedData.capacity === 'string'
              ? parseInt(parsedData.capacity, 10)
              : parsedData.capacity,
          image: imageFile,
          eventType: parsedData.eventType || 'PAID', // Default to PAID if not specified
          ticketType: parsedData.ticketType || 'REGULAR', // Default to REGULAR if not specified
        };

        setEventData(formattedEventData);
      } else {
        navigate('/create-event');
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      navigate('/create-event');
    }
  }, [navigate]);

  const handlePublish = (publishData: any) => {
    try {
      // Store the complete data
      localStorage.setItem('publishedEventData', JSON.stringify(publishData));
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
        eventData={eventData as EventFormData}
        onBack={() => navigate('/create-event')}
        onPublish={handlePublish}
        onEdit={() => navigate('/create-event')}
      />
    </div>
  );
};

export default EventsPreview;
