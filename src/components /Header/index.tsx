import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Bell, Plus, ChevronDown, AlertCircle } from 'lucide-react';
import { usePrivy, useWallets, useUser, useLogout } from '@privy-io/react-auth';
import { Link } from 'react-router-dom';
import { parseChainId, SUPPORTED_NETWORKS, truncateAddress } from '../../utils/utils';
import { createPublicClientInstance, checkRPCConnection } from '../../config/client';

const Header: React.FC = () => {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { refreshUser } = useUser();
  const { logout } = useLogout({
    onSuccess: () => console.log('User logged out'),
  });

  // UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Network state
  const [networkState, setNetworkState] = useState({
    currentNetwork: null as number | null,
    isNetworkSwitching: false,
    rpcStatus: { isConnected: true, checking: false },
  });

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the first wallet if available
  const currentWallet = wallets?.[0];
  const currentAddress = currentWallet?.address;

  // Network status checks
  const isNetworkSupported = SUPPORTED_NETWORKS.some((n) => n.id === networkState.currentNetwork);

  const shouldShowNetworkWarning =
    authenticated && currentWallet && !isNetworkSupported && networkState.currentNetwork !== null;

  // Get current network name
  const getCurrentNetworkName = useCallback(() => {
    const network = SUPPORTED_NETWORKS.find((n) => n.id === networkState.currentNetwork);
    return network ? network.name : 'Unsupported Network';
  }, [networkState.currentNetwork]);

  // Check current chain ID and RPC connection status
  const checkNetwork = useCallback(async () => {
    if (!authenticated || !currentWallet) return;

    try {
      // Get and parse chain ID
      const chainId = currentWallet.chainId;
      const numericChainId = parseChainId(chainId);

      if (numericChainId === null) {
        console.error('Unable to parse chain ID:', chainId);
      } else {
        setNetworkState((prev) => ({ ...prev, currentNetwork: numericChainId }));
      }

      // Check RPC connection only if we're on a supported network
      const isSupported = SUPPORTED_NETWORKS.some((network) => network.id === numericChainId);

      if (isSupported) {
        setNetworkState((prev) => ({
          ...prev,
          rpcStatus: { ...prev.rpcStatus, checking: true },
        }));

        const publicClient = createPublicClientInstance();
        const isConnected = await checkRPCConnection(publicClient);

        setNetworkState((prev) => ({
          ...prev,
          rpcStatus: { isConnected, checking: false },
        }));

        if (!isConnected) {
          console.warn('RPC connection is not available. Some functionality may be limited.');
        }
      }
    } catch (error) {
      console.error('Error checking network status:', error);
      setNetworkState((prev) => ({
        ...prev,
        rpcStatus: { isConnected: false, checking: false },
      }));
    }
  }, [authenticated, currentWallet]);

  // Handle network switching - Improved for immediate feedback
  const switchNetwork = async (chainId: number) => {
    if (!currentWallet || networkState.isNetworkSwitching) return;

    try {
      // Set switching state immediately
      setNetworkState((prev) => ({
        ...prev,
        isNetworkSwitching: true,
        // Update the current network immediately for UI feedback
        currentNetwork: chainId,
      }));

      // Call the switchChain method
      await currentWallet.switchChain(chainId);

      // Immediately check RPC connection after switch
      const publicClient = createPublicClientInstance();
      const isConnected = await checkRPCConnection(publicClient);

      setNetworkState((prev) => ({
        ...prev,
        isNetworkSwitching: false,
        rpcStatus: { isConnected, checking: false },
      }));

      // Close the dropdown after successful switch
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Error switching network:', error);

      // Revert to previous network state on error
      checkNetwork();

      // Show a brief alert about the failure
      if (window.innerWidth < 640) {
        alert(`Network switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      setNetworkState((prev) => ({
        ...prev,
        isNetworkSwitching: false,
      }));
    }
  };

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      await login();
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

  // ===== Effects =====

  // Initial network check and periodic update (less frequent)
  useEffect(() => {
    checkNetwork();

    // Set up periodic RPC check every 60 seconds (reduced from 30)
    const intervalId = setInterval(checkNetwork, 60000);
    return () => clearInterval(intervalId);
  }, [checkNetwork]);

  // Refresh user data when wallet changes
  useEffect(() => {
    if (authenticated && currentAddress) {
      refreshUser().catch((error) => console.error('Error refreshing user data:', error));
    }
  }, [authenticated, currentAddress, refreshUser]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }

      const target = event.target as HTMLElement;
      if (mobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.menu-toggle')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // ===== Network Button Component =====
  const NetworkButton = ({ isMobile = false }) => {
    const buttonClasses = `${isMobile ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'} rounded-full ${
      shouldShowNetworkWarning
        ? 'bg-red-600'
        : !networkState.rpcStatus.isConnected && isNetworkSupported
        ? 'bg-yellow-600'
        : 'bg-searchBg'
    } shadow-button-inset text-white font-inter flex items-center gap-1`;

    return (
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={buttonClasses}
        disabled={networkState.isNetworkSwitching}
      >
        <span>
          {networkState.isNetworkSwitching
            ? 'Switching...'
            : networkState.rpcStatus.checking
            ? 'Checking...'
            : shouldShowNetworkWarning
            ? 'Wrong Network'
            : getCurrentNetworkName()}
        </span>
        {!networkState.rpcStatus.isConnected &&
          !networkState.rpcStatus.checking &&
          isNetworkSupported && (
            <AlertCircle className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-yellow-300 mr-1`} />
          )}
        <ChevronDown className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>
    );
  };

  // Network dropdown content - unified for both mobile and desktop
  const NetworkDropdown = () => (
    <div className="absolute right-0 w-48 bg-[#1A003B] border border-borderStroke rounded shadow-lg z-30">
      <div className="px-3 py-2 border-b border-borderStroke">
        <p className="text-white text-xs opacity-70">Connected Account</p>
        <p className="text-white text-xs truncate">{truncateAddress(currentAddress)}</p>
      </div>

      <div className="px-3 py-2 border-b border-borderStroke">
        <p className="text-white text-xs opacity-70 mb-1">Switch Network</p>
        {SUPPORTED_NETWORKS.map((network) => (
          <button
            key={network.id}
            onClick={() => switchNetwork(network.id)}
            className="w-full text-left mb-1 px-2 py-1 text-xs text-white hover:bg-searchBg rounded flex items-center gap-2"
            disabled={networkState.isNetworkSwitching || network.id === networkState.currentNetwork}
          >
            <img src={network.icon} alt={network.name} className="h-4" />
            <span>{network.name}</span>
            {network.id === networkState.currentNetwork && (
              <>
                <span className="ml-auto text-green-400 text-xs">Active</span>
                {!networkState.rpcStatus.isConnected && (
                  <AlertCircle className="w-3 h-3 text-yellow-300 ml-1" />
                )}
              </>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleLogout}
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

          {/* Connection Button - Right aligned */}
          <div className="relative" ref={dropdownRef}>
            {!authenticated ? (
              <button
                onClick={handleConnect}
                className="px-3 py-1 rounded-full bg-searchBg shadow-button-inset text-white font-inter text-xs"
              >
                Connect
              </button>
            ) : (
              <>
                <NetworkButton isMobile={true} />
                {dropdownOpen && <NetworkDropdown />}
              </>
            )}
          </div>
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
            <div className="relative" ref={dropdownRef}>
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
      </div>
    </header>
  );
};

export default Header;
