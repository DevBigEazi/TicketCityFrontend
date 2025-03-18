import React, { useEffect, useState, useRef } from 'react';
import { Search, Bell, Plus, ChevronDown, AlertCircle } from 'lucide-react';
import { usePrivy, useWallets, useUser, useLogout } from '@privy-io/react-auth';
import { Link } from 'react-router-dom';
import { SUPPORTED_NETWORKS, truncateAddress } from '../../utils/utils';
import { useNetwork } from '../../contexts/NetworkContext';

const Header: React.FC = () => {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { refreshUser } = useUser();
  const { logout } = useLogout({
    onSuccess: () => console.log('User logged out'),
  });

  // network context
  const network = useNetwork();

  // UI state
  const [searchVisible, setSearchVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the first wallet if available
  const currentWallet = wallets?.[0];
  const currentAddress = currentWallet?.address;

  // Network status checks
  const isNetworkSupported = SUPPORTED_NETWORKS.some((n) => n.id === network.chainId);

  const shouldShowNetworkWarning =
    authenticated && currentWallet && !isNetworkSupported && network.chainId !== null;

  // Handle network switching
  const switchNetwork = async (chainId: number) => {
    if (!currentWallet || isNetworkSwitching) return;

    try {
      setIsNetworkSwitching(true);

      await currentWallet.switchChain(chainId);
      await network.refreshData();

      setDropdownOpen(false);
    } catch (error) {
      console.error('Error switching network:', error);
    } finally {
      setIsNetworkSwitching(false);
    }
  };

  // Handle wallet connection
  const handleConnect = async () => {
    try {
       login();
      await refreshUser();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchend', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
    };
  }, []);

  // Refresh user data when wallet changes
  useEffect(() => {
    if (authenticated && currentAddress) {
      refreshUser().catch((error) => console.error('Error refreshing user data:', error));
    }
  }, [authenticated, currentAddress, refreshUser]);

  // UI Components
  const NetworkButton = () => {
    const buttonClasses = `
      px-2 py-1 text-xs rounded-md sm:px-4 sm:py-2 sm:text-sm sm:rounded-full
      ${
        shouldShowNetworkWarning
          ? 'bg-red-600'
          : !network.isConnected && isNetworkSupported
          ? 'bg-yellow-600'
          : 'bg-searchBg'
      } 
      shadow-button-inset text-white font-inter flex items-center gap-1
    `;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}
        className={buttonClasses}
        disabled={isNetworkSwitching}
      >
        <span className="max-w-16 truncate sm:max-w-none">
          {isNetworkSwitching
            ? 'Switching...'
            : shouldShowNetworkWarning
            ? 'Wrong Network'
            : network.networkName || 'Unsupported Network'}
        </span>
        {!network.isConnected && isNetworkSupported && (
          <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-300" />
        )}
        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
      </button>
    );
  };

  const NetworkDropdown = () => (
    <div
      className="absolute right-0 mt-2 w-48 bg-[#1A003B] border border-borderStroke rounded shadow-lg z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-borderStroke">
        <p className="text-white text-xs opacity-70">Connected Account</p>
        <p className="text-white text-xs truncate">{truncateAddress(currentAddress || '')}</p>
      </div>

      <div className="px-3 py-2 border-b border-borderStroke">
        <p className="text-white text-xs opacity-70 mb-1">Switch Network</p>
        {SUPPORTED_NETWORKS.map((networkOption) => (
          <button
            key={networkOption.id}
            onClick={(e) => {
              e.stopPropagation();
              switchNetwork(networkOption.id);
            }}
            className="w-full text-left mb-1 px-2 py-1 text-xs text-white hover:bg-searchBg rounded flex items-center gap-2"
            disabled={isNetworkSwitching || networkOption.id === network.chainId}
          >
            <img src={networkOption.icon} alt={networkOption.name} className="h-4" />
            <span>{networkOption.name}</span>
            {networkOption.id === network.chainId && (
              <>
                <span className="ml-auto text-green-400 text-xs">Active</span>
                {!network.isConnected && <AlertCircle className="w-3 h-3 text-yellow-300 ml-1" />}
              </>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleLogout();
        }}
        className="w-full text-left px-3 py-2 text-white text-xs hover:bg-red-700"
      >
        Disconnect Wallet
      </button>
    </div>
  );

  return (
    <header className="bg-background border-b border-borderStroke p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Desktop Search Bar */}
        <div className="hidden sm:flex flex-1 max-w-md">
          <div className="flex w-full">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name, location or category"
                className="w-full bg-searchBg border border-borderStroke rounded-l-lg px-4 py-2 text-white font-inter text-sm focus:outline-none"
              />
            </div>
            <button className="bg-button-gradient px-3 py-2 rounded-r-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex sm:hidden items-center justify-between w-full">
          {/* Left section for mobile */}
          <div className="w-8"></div>

          {/* Mobile Search Toggle - Centered */}
          <div className="flex-1 flex justify-center">
            <button
              className="flex items-center justify-center"
              onClick={() => setSearchVisible(!searchVisible)}
            >
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Right section for mobile */}
          {authenticated && (
            <div className="relative z-40" ref={dropdownRef}>
              <NetworkButton />
              {dropdownOpen && <NetworkDropdown />}
            </div>
          )}
        </div>

        {/* Mobile Search Bar (shown conditionally) */}
        {searchVisible && (
          <div className="absolute top-16 left-0 right-0 px-3 py-2 bg-background border-b border-borderStroke sm:hidden z-10">
            <div className="flex w-full">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-searchBg border border-borderStroke rounded-l-lg px-3 py-2 text-white font-inter text-xs focus:outline-none"
                  autoFocus
                />
              </div>
              <button className="bg-button-gradient px-2 py-2 rounded-r-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Right Section for Desktop */}
        <div className="hidden sm:flex items-center gap-4">
          {!authenticated ? (
            <button
              onClick={handleConnect}
              className="px-4 py-2 rounded-full bg-searchBg shadow-button-inset text-white font-inter text-sm"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="relative z-40" ref={dropdownRef}>
              <NetworkButton />
              {dropdownOpen && <NetworkDropdown />}
            </div>
          )}

          {/* Notification Icon */}
          <div className="hidden sm:block relative">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-button-inset flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Create Button */}
          <Link to={'/create-event'} className="hidden sm:block">
            <button className="bg-button-gradient px-4 py-2 rounded-full flex items-center gap-2 text-white font-inter text-sm">
              <Plus className="w-4 h-4" />
              <span>Create</span>
            </button>
          </Link>
        </div>

        {/* Mobile Connect Button (when not authenticated) */}
        {!authenticated && (
          <div className="sm:hidden">
            <button
              onClick={handleConnect}
              className="px-2 py-1 rounded-md bg-searchBg shadow-button-inset text-white font-inter text-xs"
            >
              Connect
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
