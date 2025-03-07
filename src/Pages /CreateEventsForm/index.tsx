import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components /Layout';
import CreateEventFormComponent from '../../components /Events/CreateEventFormComponent';

// Define the form data interface to match what's in CreateEventFormComponent
interface EventFormData {
  title: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  description: string;
  capacity: number;
  image: File | null;
  eventType: 'FREE' | 'PAID';
  ticketType: 'NONE' | 'REGULAR' | 'VIP';
}

const CreateEventForm: React.FC = () => {
  const navigate = useNavigate();

  const handleContinue = async (formData: EventFormData) => {
    // Convert image file to base64 before storing
    if (formData.image) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        const dataToStore = {
          ...formData,
          image: base64String,
        };
        localStorage.setItem('eventFormData', JSON.stringify(dataToStore));
        navigate('/event-preview');
      };
      reader.readAsDataURL(formData.image);
    } else {
      localStorage.setItem('eventFormData', JSON.stringify(formData));
      navigate('/event-preview');
    }
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <CreateEventFormComponent onContinue={handleContinue} />
      </div>
    </Layout>
  );
};

export default CreateEventForm;
