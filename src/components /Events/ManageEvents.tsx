import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Eye, Upload, RefreshCw } from 'lucide-react';

const ManageEventsComponent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  console.log(id);

  return (
    <div className="w-full min-h-screen bg-background border  p-6 px-4 sm:px-6 md:px-[7rem]">
      {/* Header */}
      <div className="border px-3 sm:px-5 py-3 border-borderStroke shadow-button-no-inset rounded-xl">
        <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <h1 className="text-white  text-xl sm:text-2xl sm:font-semibold font-exo">
              Manage Event: Blockchain Summit
            </h1>
            <button
              onClick={() => navigate('/my-events')}
              className="flex items-center gap-2 bg-primary rounded-xl px-4 py-2 font-poppins text-white hover:opacity-90 transition-opacity"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-poppins font-medium sm:text-base">
                Back to Dashboard
              </span>
            </button>
          </div>
        </div>

        {/* Event Banner */}
        <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset overflow-hidden">
          <div className="relative">
            <img src={"/placeholder-event.jpg"} alt="Event Banner" className="w-full h-32 sm:h-48 object-cover" />
            <button className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-primary rounded-lg px-2 sm:px-4 py-1 sm:py-2 text-white font-poppins flex items-center gap-1 sm:gap-2 text-xs sm:text-base">
              <Upload size={14} className="sm:w-4 sm:h-4" />
              Upload New Image
            </button>
          </div>
        </div>

        {/* Event Details */}
        <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset p-4 sm:p-6">
          <h2 className="text-white text-lg sm:text-xl font-poppins mb-3 sm:mb-4">Event Details</h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-32 text-sm sm:text-base">Location:</span>
              <span className="text-white text-sm sm:text-base">Virtual</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-32 text-sm sm:text-base">Date:</span>
              <span className="text-white text-sm sm:text-base">July 30, 2025</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-32 text-sm sm:text-base">Tickets Sold:</span>
              <span className="text-white text-sm sm:text-base">150/200</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-32 text-sm sm:text-base">Ticket Pricing:</span>
              <span className="text-white text-sm sm:text-base">Automated based on demand</span>
            </div>
          </div>
          <button className="mt-3 sm:mt-4 bg-primary/20 text-primary rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 font-poppins flex items-center gap-1 sm:gap-2 text-sm sm:text-base hover:bg-primary/30 transition-colors">
            <Edit size={14} className="sm:w-4 sm:h-4" />
            Edit Event Details
          </button>
        </div>

        {/* Ticket Sales */}
        <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset p-4 sm:p-6">
          <h2 className="text-white text-lg sm:text-xl font-poppins mb-3 sm:mb-4">Ticket Sales</h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-32 text-sm sm:text-base">Total Revenue:</span>
              <span className="text-white text-sm sm:text-base">3,500 ETN</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-32 text-sm sm:text-base">Pending Release:</span>
              <span className="text-white text-sm sm:text-base">1,200 ETN</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-32 text-sm sm:text-base">Refunds Issued:</span>
              <span className="text-white text-sm sm:text-base">300 ETN</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-32 text-sm sm:text-base">Ticket Pricing:</span>
              <span className="text-white text-sm sm:text-base">Automated based on demand</span>
            </div>
          </div>
          <button className="mt-3 sm:mt-4 bg-primary/20 text-primary rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 font-poppins flex items-center gap-1 sm:gap-2 text-sm sm:text-base hover:bg-primary/30 transition-colors">
            <Eye size={14} className="sm:w-4 sm:h-4" />
            View Sales Report
          </button>
        </div>

        {/* Security Settings */}
        <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset p-4 sm:p-6">
          <h2 className="text-white text-lg sm:text-xl font-poppins mb-3 sm:mb-4">
            Security Settings
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-full md:w-64 text-sm sm:text-base">
                Event Verification:
              </span>
              <span className="text-white text-sm sm:text-base">Enabled</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-full md:w-64 text-sm sm:text-base">
                Attendance Tracking:
              </span>
              <span className="text-white text-sm sm:text-base">
                QR Code & Wallet Authentication
              </span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-full md:w-64 text-sm sm:text-base">
                Minimum Attendance Requirement:
              </span>
              <span className="text-white text-sm sm:text-base">60%</span>
            </div>
          </div>
          <button className="mt-3 sm:mt-4 bg-primary rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 font-poppins text-white flex items-center gap-1 sm:gap-2 text-sm sm:text-base hover:opacity-90 transition-opacity">
            <Edit size={14} className="sm:w-4 sm:h-4" />
            Update Security Settings
          </button>
        </div>

        {/* Revenue Management */}
        <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset p-4 sm:p-6">
          <h2 className="text-white text-lg sm:text-xl font-poppins mb-3 sm:mb-4">
            Revenue Management
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-white text-sm sm:text-base">Funds Held in Smart Contract</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-white text-sm sm:text-base">
                Manual or automated release options available post-event.
              </span>
            </div>
          </div>
          <button className="mt-3 sm:mt-4 bg-primary rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 font-poppins text-white flex items-center gap-1 sm:gap-2 text-sm sm:text-base hover:opacity-90 transition-opacity">
            <RefreshCw size={14} className="sm:w-4 sm:h-4" />
            Release Funds
          </button>
        </div>

        {/* Payment & Refund Policies */}
        <div className="mb-8 rounded-2xl border border-borderStroke shadow-button-inset p-4 sm:p-6">
          <h2 className="text-white text-lg sm:text-xl font-poppins mb-3 sm:mb-4">
            Payment & Refund Policies
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-full md:w-40 text-sm sm:text-base">
                Payments Accepted:
              </span>
              <span className="text-white text-sm sm:text-base">ETN, Stablecoins (Future)</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-full md:w-40 text-sm sm:text-base">
                Platform Fee:
              </span>
              <span className="text-white text-sm sm:text-base">30 ETN for paid events</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center">
              <span className="text-textGray w-full md:w-40 text-sm sm:text-base">
                Refund Policy:
              </span>
              <span className="text-white text-sm sm:text-base">
                Full refund + 2 ETN gas fee if event is canceled (Future)
              </span>
            </div>
          </div>
        </div>

        {/* Future Implementations */}
        <div className="rounded-2xl border border-borderStroke shadow-button-inset p-4 sm:p-6">
          <h2 className="text-white text-lg sm:text-xl font-poppins mb-3 sm:mb-4">
            Future Implementations
          </h2>
          <ul className="space-y-2 sm:space-y-3 list-disc list-inside text-white text-sm sm:text-base">
            <li>Event discovery tools with referral programs & discounts</li>
            <li>Automated ticket pricing based on demand</li>
            <li>Stablecoin payment integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ManageEventsComponent;
