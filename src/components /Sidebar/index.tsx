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
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useUser, usePrivy, useWallets, useLogout } from '@privy-io/react-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { maskEmail, permanentUserIdentity, truncateAddress } from '../../utils/utils';
import { images } from '../../constant';
import { useNetwork } from '../../contexts/NetworkContext';

const navLinks = [
  { icon: <LayoutDashboard />, label: 'Dashboard', path: '/dashboard' },
  { icon: <Compass />, label: 'Explore Events', path: '/explore' },
  { icon: <PlusCircle />, label: 'Create Event', path: '/create-event' },
  { icon: <CalendarCheck />, label: 'My Events', path: '/my-events' },
  { icon: <Wallet />, label: 'My Wallet', path: '/my-wallet' },
  { icon: <Building2 />, label: 'Hub', path: '/organizers' },
  { icon: <Settings />, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
  onNavigate?: (path: string) => void;
  currentPath?: string;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const { user } = useUser();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { logout } = useLogout({
    onSuccess: () => console.log('User logged out'),
  });

  const navigate = useNavigate();
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // network information from context
  const { currentWalletAddress, tokenBalance, networkName, isConnected, refreshData } =
    useNetwork();

  // Update activePath when location changes
  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  // Listen for wallet changes
  useEffect(() => {
    // This will ensure sidebar updates when wallets change
    if (authenticated && wallets) {
      refreshData();
    }
  }, [authenticated, wallets, refreshData]);

  // Get user information
  const externalWallet = user?.wallet?.address?.toString() || '';
  const userEmail = user?.email?.toString() || '';
  const userNameFromGoogle = user?.google?.name?.toString() || '';

  // Determine what name to display
  const userEmailMasked = userEmail ? maskEmail(userEmail) : '';

  // If the currentWalletAddress from the network context is available, prioritize it
  // This ensures we're showing the currently active wallet address from connected Connector
  const displayName = authenticated
    ? userNameFromGoogle ||
      (currentWalletAddress
        ? truncateAddress(currentWalletAddress)
        : externalWallet
        ? truncateAddress(externalWallet)
        : '') ||
      userEmailMasked ||
      'No User Info'
    : 'No User';

  const handleNavigation = (path: string) => {
    setActivePath(path);
    navigate(path);
  };

  // Handle copy address functionality
  const copyAddressToClipboard = () => {
    if (currentWalletAddress) {
      navigator.clipboard.writeText(currentWalletAddress);
      setCopied(true);

      // Reset copied state after 3 seconds
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
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

      {/* User Profile with Wallet Info */}
      <div className="px-6 py-4 border-b border-borderStroke">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setWalletExpanded(!walletExpanded)}
        >
          <img
            src={permanentUserIdentity}
            alt="User"
            className="h-10 w-10 rounded-full"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = '/placeholder-logo.svg';
            }}
          />
          <span className="text-white font-inter text-sm flex-1">{displayName}</span>
          <ChevronDown
            className={`w-4 h-4 text-textGray transition-transform ${
              walletExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Expandable Wallet Information */}
        {walletExpanded && authenticated && (
          <div className="mt-3 pt-3 border-t border-borderStroke/50 space-y-3">
            {/* Address with copy button */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-textGray text-xs">Address</span>
                <span className="text-white text-sm font-mono">
                  {currentWalletAddress ? truncateAddress(currentWalletAddress) : 'Not connected'}
                </span>
              </div>
              <button
                onClick={copyAddressToClipboard}
                className="p-1 text-textGray hover:text-white transition-colors"
                aria-label="Copy address to clipboard"
                disabled={!currentWalletAddress}
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Network */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-textGray text-xs">Network</span>
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm">{networkName || 'Unknown'}</span>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-textGray text-xs">Balance</span>
                <span className="text-white text-sm">{tokenBalance || '0.0000'} ETN</span>
              </div>
            </div>
            {/* Disconnect Button */}
            <div className="flex justify-between items-center">
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-white text-xs hover:bg-red-700"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
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
