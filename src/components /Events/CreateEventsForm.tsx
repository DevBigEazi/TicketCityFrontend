import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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

const initialFormState: EventFormData = {
  title: '',
  startDateTime: '',
  endDateTime: '',
  location: '',
  description: '',
  capacity: 0,
  image: null,
  eventType: 'FREE',
  ticketType: 'NONE',
};

// Props interface to handle callback functions
interface CreateEventFormComponentProps {
  onContinue?: (formData: EventFormData) => Promise<void> | void;
}

const CreateEventFormComponent: React.FC<CreateEventFormComponentProps> = ({ onContinue }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const existingData = location.state as EventFormData | null;

  const [formData, setFormData] = useState<EventFormData>(() => {
    // Check if we have existing data from location state first
    if (existingData) {
      return existingData;
    }

    // Check for stored form data
    const storedDataString = localStorage.getItem('eventFormData');
    if (storedDataString) {
      try {
        const storedData = JSON.parse(storedDataString);
        // Only use stored data if we should NOT clear the form
        if (localStorage.getItem('clearEventForm') !== 'true') {
          return storedData;
        }
      } catch (e) {
        console.error('Error parsing stored form data:', e);
      }
    }

    // Clear the flag if it was set
    localStorage.removeItem('clearEventForm');

    // Return initial state if nothing else worked
    return { ...initialFormState };
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    // Only save if we're not trying to clear the form
    if (formData && localStorage.getItem('clearEventForm') !== 'true') {
      // We need to handle the File object specially since it can't be serialized
      const storableData = {
        ...formData,
        // Don't include image in what we store in localStorage
        image: null,
      };
      localStorage.setItem('eventFormData', JSON.stringify(storableData));
    }
  }, [formData]);

  // Handle form clearing when needed
  useEffect(() => {
    if (localStorage.getItem('clearEventForm') === 'true') {
      localStorage.removeItem('clearEventForm');
      localStorage.removeItem('eventFormData');
      localStorage.removeItem('hasEventImage');

      // Only reset if we're not coming from the preview with edited data
      if (!existingData) {
        setFormData({ ...initialFormState });
      }
    }
  }, [existingData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, files } = e.target as HTMLInputElement;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'image'
          ? files && files.length > 0
            ? files[0]
            : null
          : name === 'capacity'
            ? Number(value)
            : value,
    }));

    // Auto-set ticketType based on eventType
    if (name === 'eventType') {
      setFormData((prev) => ({
        ...prev,
        ticketType: value === 'PAID' ? 'REGULAR' : 'NONE',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that we have an image
    if (!formData.image) {
      alert('Please select an image for your event');
      return;
    }

    if (onContinue) {
      await onContinue(formData);
    } else {
      // Navigate to preview with the form data
      navigate('/event-preview', { state: formData });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-button-inset p-8">
        <h1 className="text-white text-2xl font-bold mb-8 text-center">Create New Event</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white mb-2">Event Name</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full bg-transparent border border-borderStroke rounded-lg p-3 text-white"
              placeholder="Event Title"
            />
          </div>

          <div>
            <label className="block text-white mb-2">Event Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full bg-transparent border border-borderStroke rounded-lg p-3 text-white min-h-[100px]"
              placeholder="Description"
            />
          </div>

          <div>
            <label className="block text-white mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full bg-transparent border border-borderStroke rounded-lg p-3 text-white"
              placeholder="Location"
            />
          </div>

          <div>
            <label className="block text-white mb-2">Start Date & Time</label>
            <input
              type="datetime-local"
              name="startDateTime"
              value={formData.startDateTime}
              onChange={handleChange}
              required
              className="w-full bg-transparent border border-borderStroke rounded-lg p-3 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-100 [&::-webkit-calendar-picker-indicator]:saturate-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:sepia [&::-webkit-calendar-picker-indicator]:hue-rotate-[1000deg]"
            />
          </div>

          <div>
            <label className="block text-white mb-2">End Date & Time</label>
            <input
              type="datetime-local"
              name="endDateTime"
              value={formData.endDateTime}
              onChange={handleChange}
              required
              className="w-full bg-transparent border border-borderStroke rounded-lg p-3 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-100 [&::-webkit-calendar-picker-indicator]:saturate-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:sepia [&::-webkit-calendar-picker-indicator]:hue-rotate-[1000deg]"
            />
          </div>

          <div>
            <label className="block text-white mb-2">Attendees Capacity</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              required
              min="1"
              className="w-full bg-transparent border border-borderStroke rounded-lg p-3 text-white"
              placeholder="Capacity"
            />
          </div>

          <div>
            <label className="block text-white mb-2">Event Banner</label>
            <input
              type="file"
              name="image"
              onChange={handleChange}
              accept="image/*"
              className="w-full bg-transparent border border-borderStroke rounded-lg p-3 text-white"
              required={!formData.image}
            />
            {formData.image && (
              <p className="text-white text-sm">Image selected: {formData.image.name}</p>
            )}
          </div>

          <div>
            <label className="block text-white mb-2">Event Type</label>
            <select
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
              className="w-full bg-transparent border border-borderStroke rounded-lg p-3 text-white"
            >
              <option value="FREE" className="bg-black">
                FREE
              </option>
              <option value="PAID" className="bg-black">
                PAID
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEventFormComponent;
