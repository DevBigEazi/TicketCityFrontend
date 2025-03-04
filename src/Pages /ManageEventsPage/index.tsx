import React from 'react';

import ManageEventsComponent from '../../components /Events/ManageEvents';

const ManageEventsPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <ManageEventsComponent />
    </div>
  );
};

export default ManageEventsPage;
