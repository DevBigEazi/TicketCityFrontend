import { ArrowLeft, QrCode } from 'lucide-react';

const AttendanceComponent = () => {
  return (
    <div className="w-full min-h-screen bg-background p-6">
      {/* Header */}
      <header className="flex justify-between items-center pb-4 border-b-[3px] border-borderStroke mb-8">
        <h1 className="font-['Exo_2'] text-[36px] leading-[43.2px] tracking-tightest text-white font-semibold md:text-3xl">
          QR Code Scanner
        </h1>
        <button className="flex items-center gap-2 bg-primary rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
          <ArrowLeft className="w-5 h-5 text-white" />
          <span className="font-poppins font-medium text-base leading-6 tracking-wider text-white">
            Back to Dashboard
          </span>
        </button>
      </header>

      {/* QR Scanner Section */}
      <div className="w-full max-w-[90%] mx-auto mb-8 rounded-2xl shadow-button-inset p-8 flex flex-col items-center">
        <h2 className="font-poppins font-medium text-large leading-[42px] text-white mb-8">
          Scan QR for Attendance
        </h2>
        <div className="mb-8">
          <QrCode className="w-32 h-32 text-white" />
        </div>
        <button className="bg-primary rounded-lg px-6 py-2 font-poppins font-medium text-base text-white hover:opacity-90 transition-opacity">
          Start Scan
        </button>
      </div>

      {/* Manual Entry Section */}
      <div className="w-full max-w-[90%] mx-auto rounded-2xl border border-borderStroke shadow-button-inset p-8">
        <h2 className="font-poppins font-medium text-large leading-[42px] text-white mb-6">
          Manual Attendance Entry
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-8">
          <input
            type="text"
            placeholder="Enter Attendee Code"
            className="w-full sm:w-[30rem] px-4 py-2 rounded-md border border-borderStroke bg-searchBg backdrop-blur-[30px] font-inter font-normal text-base leading-[25px] text-white placeholder:text-white/60"
          />
          <button className="w-full sm:w-auto bg-primary rounded-lg px-6 py-2 font-poppins font-medium text-base text-white hover:opacity-90 transition-opacity">
            Submit
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-poppins font-medium text-medium leading-[27px] tracking-wider text-white">
            Scan History
          </h3>
          <p className="font-inter font-normal text-medium leading-[25px] text-white">
            No scans yet...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceComponent;
