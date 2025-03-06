import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Compass,
  PlusCircle,
  Ticket,
  Wallet,
  Shield,
  Users,
  Settings,
  ChevronDown,
  QrCode,
  CalendarCheck
} from 'lucide-react';
import { useUser } from '@privy-io/react-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavLink } from '../../types';
import { maskEmail } from '../../utils/maskedEmail';

const navLinks = [
    { icon: <LayoutDashboard />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Compass />, label: 'Explore Events', path: '/explore' },
    { icon: <PlusCircle />, label: 'Create Event', path: '/create-event' },
    { icon: <CalendarCheck />, label: 'My Events', path: '/my-events' },
    { icon: <Wallet />, label: 'My Wallet', path: '/wallet' },
    { icon: <Shield />, label: 'Ticket Verification', path: '/verify' },
    { icon: <QrCode />, label: 'Attendance Scan', path: '/attendance-scan' }, // Added new link
    { icon: <Users />, label: 'Organizers Hub', path: '/organizers' },
    { icon: <Settings />, label: 'Manage Events', path: '/manage-event/:id' },
    { icon: <Settings />, label: 'Settings', path: '/settings' },
  ];

const Sidebar: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);

  // Update activePath when location changes
  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  const externalWallet = user?.wallet?.address?.toString() || '';
  const userEmail = user?.email?.toString() || '';
  const userNameFromGoogle = user?.google?.name?.toString() || '';

  // Only mask email if it exists
  const userEmailMasked = userEmail ? maskEmail(userEmail) : '';

  const truncateAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Change the logic to check if any user information exists before trying to display it
  const displayName =
    userNameFromGoogle ||
    (externalWallet ? truncateAddress(externalWallet) : '') ||
    userEmailMasked ||
    'No User';

  const handleNavigation = (path: string) => {
    setActivePath(path);
    navigate(path);
  };

  return (
    <aside className="w-64 h-full bg-background border-r border-borderStroke flex flex-col">
      {/* Logo */}
      <div className="p-6">
        {/* Replace with proper import or public path */}
        <img
          src="/logo.png"
          alt="TicketCity"
          className="h-16"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = '/placeholder-logo.svg';
          }}
        />
      </div>

      {/* User Profile */}
      <div className="px-6 py-4 flex items-center gap-2 border-b border-borderStroke">
        <img
          src="https://gateway.pinata.cloud/ipfs/QmTXNQNNhFkkpCaCbHDfzbUCjXQjQnhX7QFoX1YVRQCSC8"
          alt="TicketCity"
          className="h-8"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = '/placeholder-logo.svg';
          }}
        />
        <span className="text-white font-inter text-sm flex-1">{displayName}</span>
        <ChevronDown className="w-4 h-4 text-textGray" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 pt-6">
        {navLinks.map((link) => {
          const isActive = activePath === link.path;
          return (
            <button
              key={link.path}
              onClick={() => handleNavigation(link.path)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-lg transition-all duration-200 ${
                isActive
                  ? 'text-primary bg-primary/10 border-l-4 border-primary'
                  : 'text-textGray hover:text-white hover:bg-primary/5 border-l-4 border-transparent'
              }`}
            >
              <span className={`w-6 h-6 ${isActive ? 'text-primary' : ''}`}>{link.icon}</span>
              <span className={`font-inter font-normal ${isActive ? 'font-medium' : ''}`}>
                {link.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
