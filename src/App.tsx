import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ExploreEvents from './Pages /EventsExpore';
import CreateEventForm from './Pages /CreateEventsForm';
import EventPreview from './Pages /EventsPreview';
import PublishedEvents from './Pages /PublishedEvents';
import AttendancePage from './Pages /AttendancePage';
import MyEventsPage from './Pages /MyEvents';
import ManageEventsPage from './Pages /ManageEventsPage';
import EventsDashboardPage from './Pages /EventsDashboardPage';
import './App.css';
import { usePrivy } from '@privy-io/react-auth';
import FreeEventDetails from './Pages /EventDetails';

const App: React.FC = () => {
  const { ready } = usePrivy();

  if (!ready)
    return (
      <div className="min-h-screen bg-background flex justify-center items-center p-8">
        <div className="max-w-[80%] mx-auto border border-[#3A3A3A] rounded-lg shadow-[1px_1px_10px_0px_#FFFFFF40] p-8">
          <h1 className="text-white text-2xl font-bold mb-4 text-center">
            Wallet getting ready...
          </h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ExploreEvents />} />
        <Route path="/explore" element={<ExploreEvents />} />
        <Route path="/event/:eventId" element={<FreeEventDetails />} />
        <Route path="/create-event" element={<CreateEventForm />} />
        <Route path="/event-preview" element={<EventPreview />} />
        <Route path="/published-events" element={<PublishedEvents />} />
        <Route path="/attendance-scan" element={<AttendancePage />} />
        <Route path="/my-events" element={<MyEventsPage />} />
        <Route path="/manage-event/:id" element={<ManageEventsPage />} />
        <Route path="/dashboard" element={<EventsDashboardPage />} />
      </Routes>
    </Router>
  );
};

export default App;
