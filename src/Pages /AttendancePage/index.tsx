import React from 'react';
import Layout from '../../components /Layout';
import AttendanceComponent from '../../components /Events/Attendance';


const AttendancePage: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <AttendanceComponent />  
      </div>
    </Layout>
  );
};

export default AttendancePage;