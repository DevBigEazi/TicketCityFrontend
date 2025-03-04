import React from 'react';
import Layout from '../../components /Layout';
import MyEventsComponent from '../../components /Events/MyEvents';

const MyEventsPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <MyEventsComponent />
      </div>
    </Layout>
  );
};

export default MyEventsPage;
