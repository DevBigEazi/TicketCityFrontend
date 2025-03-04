import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface EventFormData {
  title: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  description: string;
  capacity: number;
  image: File | null;
  eventType: "FREE" | "PAID";
  ticketType: "NONE" | "REGULAR" | "VIP";
}

const initialFormState: EventFormData = {
  title: "",
  startDateTime: "",
  endDateTime: "",
  location: "",
  description: "",
  capacity: 0,
  image: null,
  eventType: "FREE",
  ticketType: "NONE",
};

const CreateEventFormComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const existingData = location.state as EventFormData | null;

  const [formData, setFormData] = useState<EventFormData>(
    existingData || { ...initialFormState }
  );

  // Reset form when navigating back from successful event creation
  useEffect(() => {
    // Check if we're coming back to the form without any state
    // This indicates we need to reset the form (e.g., after successful creation)
    if (location.state === null && location.key !== "default") {
      setFormData({ ...initialFormState });
    }
  }, [location]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, files } = e.target as HTMLInputElement;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "image"
          ? files && files.length > 0
            ? files[0]
            : null
          : name === "capacity"
          ? Number(value)
          : value,
    }));

    // Auto-set ticketType based on eventType
    if (name === "eventType") {
      setFormData((prev) => ({
        ...prev,
        ticketType: value === "PAID" ? "REGULAR" : "NONE",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/event-preview", { state: formData });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
        <h1 className="text-white text-2xl font-bold mb-8 text-center">
          Create New Event
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
            placeholder="Event Title"
          />

          <div>
            <label className="block text-white mb-2">Start Date & Time</label>
            <input
              type="datetime-local"
              name="startDateTime"
              value={formData.startDateTime}
              onChange={handleChange}
              required
              className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
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
              className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
            />
          </div>

          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
            placeholder="Location"
          />

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white min-h-[100px]"
            placeholder="Description"
          />

          <input
            type="file"
            name="image"
            onChange={handleChange}
            accept="image/*"
            className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
            required={!formData.image}
          />
          {formData.image && (
            <p className="text-white text-sm">
              Image selected: {formData.image.name}
            </p>
          )}

          <input
            type="number"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            required
            min="1"
            className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white"
            placeholder="Capacity"
          />

          <div>
            <label className="block text-white mb-2">Event Type</label>
            <select
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
              className="w-full bg-searchBg border border-borderStroke rounded-lg p-3 text-white">
              <option value="FREE">FREE</option>
              <option value="PAID">PAID</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEventFormComponent;
