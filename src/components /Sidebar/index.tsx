import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Compass,
  PlusCircle,
  Wallet,
  Settings,
  ChevronDown,
  CalendarCheck,
  Building2,
} from 'lucide-react';
import { useUser } from '@privy-io/react-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { maskEmail, permanentUserIdentity, truncateAddress } from '../../utils/utils';
import { images } from '../../constant';

const navLinks = [
  { icon: <LayoutDashboard />, label: 'Dashboard', path: '/dashboard' },
  { icon: <Compass />, label: 'Explore Events', path: '/explore' },
  { icon: <PlusCircle />, label: 'Create Event', path: '/create-event' },
  { icon: <CalendarCheck />, label: 'My Events', path: '/my-events' },
  { icon: <Wallet />, label: 'My Wallet', path: '/my-wallet' },
  //   { icon: <Shield />, label: 'Ticket Verification', path: '/verify' },
  { icon: <Building2 />, label: 'Hub', path: '/organizers' },
  { icon: <Settings />, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
  onNavigate: (path: string) => void;
  currentPath: string;
}

const Sidebar: React.FC<SidebarProps> = () => {
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

  // if any user information exists before trying to display it
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
        <img
          src={images.TicketCityLogo}
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
          src={permanentUserIdentity}
          alt="TicketCity"
          className="h-10 w-10 rounded-full"
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
