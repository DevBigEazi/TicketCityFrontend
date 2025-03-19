import React from 'react';
import Layout from '../../components /Layout';
import Hero from '../../components /Hero';
import EventsSection from '../../components /Events/EventsSection';

const ExploreEvents: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <Hero />
        <EventsSection />
      </div>
    </Layout>
  );
};

export default ExploreEvents;
