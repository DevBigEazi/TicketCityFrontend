import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ExploreEvents from './Pages /EventsExpore';
import EventDetails from './Pages /EventDetails';
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

  if (!ready) return <h2>Wallet getting ready...</h2>;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ExploreEvents />} />
        <Route path="/explore" element={<ExploreEvents />} />
        {/* Remove the old /event/:id route */}
        {/* Updated route to use organizer address instead of userAddress */}
        <Route path="/:organiserAddress/event/:eventId" element={<FreeEventDetails />} />
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
