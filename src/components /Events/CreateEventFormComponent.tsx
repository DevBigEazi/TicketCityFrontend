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

interface CreateEventFormComponentProps {
  onContinue?: (formData: EventFormData) => Promise<void>;
}

const initialFormState: EventFormData = {
  title: '',
  startDateTime: '',
  endDateTime: '',
  location: '',
  description: '',
  capacity: 0, // This will stay at 0 but won't be displayed
  image: null,
  eventType: 'FREE',
  ticketType: 'NONE',
};

const CreateEventFormComponent = ({ onContinue }: CreateEventFormComponentProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const existingData = location.state as EventFormData | null;

  const [formData, setFormData] = useState<EventFormData>(existingData || { ...initialFormState });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Reset form when navigating back from successful event creation
  useEffect(() => {
    // Check if we're coming back to the form without any state
    // This indicates we need to reset the form (e.g., after successful creation)
    if (location.state === null && location.key !== 'default') {
      setFormData({ ...initialFormState });
      setErrors({});
      setFormSubmitted(false);
    }
  }, [location]);

  // Clear errors when form data changes, but only after first submission attempt
  useEffect(() => {
    if (formSubmitted && Object.keys(errors).length > 0) {
      // Re-validate the form when data changes after submission attempt
      validateForm();
    }
  }, [formData, formSubmitted]);

  // Function to validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title) newErrors.title = 'Event name is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.startDateTime) newErrors.startDateTime = 'Start date and time is required';
    if (!formData.endDateTime) newErrors.endDateTime = 'End date and time is required';
    if (!formData.capacity || formData.capacity <= 0)
      newErrors.capacity = 'Valid capacity is required';
    if (!formData.image) newErrors.image = 'Event banner is required';

    // Check if end date is after start date
    if (formData.startDateTime && formData.endDateTime) {
      const start = new Date(formData.startDateTime);
      const end = new Date(formData.endDateTime);
      if (end <= start) {
        newErrors.endDateTime = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
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

  // Validate and show errors only on submission
  const validateAndShowErrors = () => {
    setFormSubmitted(true);
    const isValid = validateForm();

    if (!isValid) {
      // Find and scroll to the first error field
      setTimeout(() => {
        const firstErrorField = document.querySelector('.border-red-500');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }

    return isValid;
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();

    // Run validation on all fields and show errors
    if (!validateAndShowErrors()) {
      return;
    }

    try {
      // If onContinue prop is provided, use it
      if (onContinue) {
        onContinue(formData);
      } else {
        // Save form data and navigate to preview
        if (formData.image) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result;
            const dataToStore = {
              ...formData,
              image: base64String,
            };
            localStorage.setItem('eventFormData', JSON.stringify(dataToStore));
            // Navigate directly to preview with state
            navigate('/event-preview', { state: dataToStore });
          };
          reader.readAsDataURL(formData.image);
        } else {
          localStorage.setItem('eventFormData', JSON.stringify(formData));
          // Navigate directly to preview with state
          navigate('/event-preview', { state: formData });
        }
      }
    } catch (error) {
      console.error('Error preparing for preview:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-button-inset p-8">
        <h1 className="text-white text-2xl font-bold mb-8 text-center">Create New Event</h1>
        <form onSubmit={handlePreview} className="space-y-6">
          <div>
            <label className="block text-white mb-2">Event Name</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full bg-transparent border ${
                formSubmitted && errors.title ? 'border-red-500' : 'border-primary'
              } rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder="Event Title"
            />
            {formSubmitted && errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-white mb-2">Event Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`w-full bg-transparent border ${
                formSubmitted && errors.description ? 'border-red-500' : 'border-primary'
              } rounded-lg p-3 text-white min-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder="Description"
            />
            {formSubmitted && errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-white mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={`w-full bg-transparent border ${
                formSubmitted && errors.location ? 'border-red-500' : 'border-primary'
              } rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder="Event Location"
            />
            {formSubmitted && errors.location && (
              <p className="text-red-500 text-sm mt-1">{errors.location}</p>
            )}
          </div>

          <div>
            <label className="block text-white mb-2">Start Date & Time</label>
            <input
              type="datetime-local"
              name="startDateTime"
              value={formData.startDateTime}
              onChange={handleChange}
              className={`w-full bg-transparent border ${
                formSubmitted && errors.startDateTime ? 'border-red-500' : 'border-primary'
              } rounded-lg p-3 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:bg-primary [&::-webkit-calendar-picker-indicator]:rounded-sm [&::-webkit-calendar-picker-indicator]:p-1 focus:outline-none focus:ring-1 focus:ring-primary`}
            />
            {formSubmitted && errors.startDateTime && (
              <p className="text-red-500 text-sm mt-1">{errors.startDateTime}</p>
            )}
          </div>

          <div>
            <label className="block text-white mb-2">End Date & Time</label>
            <input
              type="datetime-local"
              name="endDateTime"
              value={formData.endDateTime}
              onChange={handleChange}
              className={`w-full bg-transparent border ${
                formSubmitted && errors.endDateTime ? 'border-red-500' : 'border-primary'
              } rounded-lg p-3 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:bg-primary [&::-webkit-calendar-picker-indicator]:rounded-sm [&::-webkit-calendar-picker-indicator]:p-1 focus:outline-none focus:ring-1 focus:ring-primary`}
            />
            {formSubmitted && errors.endDateTime && (
              <p className="text-red-500 text-sm mt-1">{errors.endDateTime}</p>
            )}
          </div>

          <div>
            <label className="block text-white mb-2">Attendees Capacity</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity === 0 ? '' : formData.capacity}
              onChange={handleChange}
              min="1"
              className={`w-full bg-transparent border ${
                formSubmitted && errors.capacity ? 'border-red-500' : 'border-primary'
              } rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder="Enter capacity"
            />
            {formSubmitted && errors.capacity && (
              <p className="text-red-500 text-sm mt-1">{errors.capacity}</p>
            )}
          </div>

          <div>
            <label className="block text-white mb-2">Event Banner</label>
            <input
              type="file"
              name="image"
              onChange={handleChange}
              accept="image/*"
              className={`w-full bg-transparent border ${
                formSubmitted && errors.image ? 'border-red-500' : 'border-primary'
              } rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-primary`}
            />
            {formData.image && (
              <p className="text-white text-sm">Image selected: {formData.image.name}</p>
            )}
            {formSubmitted && errors.image && (
              <p className="text-red-500 text-sm mt-1">{errors.image}</p>
            )}
          </div>

          <div>
            <label className="block text-white mb-2">Event Type</label>
            <select
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
              className="w-full bg-transparent border border-primary rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="FREE" className="bg-black">
                FREE
              </option>
              <option value="PAID" className="bg-black">
                PAID
              </option>
            </select>
          </div>

          {/* Error summary if there are validation errors */}
          {formSubmitted && Object.keys(errors).length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 mb-4">
              <p className="text-white font-medium">Please correct the following errors:</p>
              <ul className="text-red-400 mt-1 list-disc pl-5">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            className="flex justify-center items-center w-28 h-11 py-4 rounded-lg font-medium text-lg transition-all bg-primary text-white hover:opacity-90"
          >
            Preview
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEventFormComponent;
