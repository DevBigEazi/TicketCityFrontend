import React from 'react';
import Layout from '../../components /Layout';
import EventsDashboardHome from '../../components /Events/Dashboard';

const EventsDashboardPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <EventsDashboardHome />
      </div>
    </Layout>
  );
};

export default EventsDashboardPage;
