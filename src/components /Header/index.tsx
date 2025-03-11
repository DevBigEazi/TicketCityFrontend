import React, { useEffect, useState } from 'react';
import { Search, Bell, Plus, X } from 'lucide-react';
import { usePrivy, useWallets, useUser } from '@privy-io/react-auth';
import { Link } from 'react-router-dom';
import { useLogout } from '@privy-io/react-auth';
import { truncateAddress } from '../../utils/generalUtils';

const Header: React.FC = () => {
  const { login } = usePrivy();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { user, refreshUser } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  const { logout } = useLogout({
    onSuccess: () => {
      console.log('User logged out');
      // Any logic you'd like to execute after a user successfully logs out
    },
  });

  // Get the first wallet address if available
  const currentAddress = wallets?.[0]?.address;
  const displayAddress = authenticated ? truncateAddress(currentAddress) : 'Connect Wallet';

  // Helper function to truncate address with custom length
  const truncateAddressShort = (address?: string, chars = 2) => {
    if (!address) return '';
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
  };

  // Refresh user data when wallet changes
  useEffect(() => {
    const handleUserRefresh = async () => {
      if (authenticated && currentAddress) {
        await refreshUser();
        console.log('User data refreshed:', user);
      }
    };

    handleUserRefresh();
  }, [authenticated, currentAddress, refreshUser]);

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      login();
      await refreshUser();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (mobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.menu-toggle')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

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
          {/* Empty div for spacing */}
          <div className="w-8"></div>

          {/* Mobile Search Toggle (Center) */}
          <button
            className="flex items-center justify-center"
            onClick={() => setSearchVisible(!searchVisible)}
          >
            <Search className="w-5 h-5 text-white" />
          </button>

          {/* LogOut/Menu (Right) */}
          <div className="flex items-center gap-3">
            {/* Connect Wallet Button - Only show when not authenticated */}
            {!authenticated ? (
              <button
                onClick={handleConnect}
                className="px-3 py-1 rounded-full bg-searchBg shadow-button-inset text-white font-inter text-xs"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={logout}
                className="px-3 py-1 rounded-full bg-searchBg shadow-button-inset text-white font-inter text-xs"
              >
                {truncateAddressShort(currentAddress, 2)}
              </button>
            )}

            {/* LogOut Button */}
            <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : ''}
            </button>
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
          {/* Connect Wallet Button - Only show when not authenticated */}
          {!authenticated && (
            <button
              onClick={handleConnect}
              className="px-4 py-2 rounded-full bg-searchBg shadow-button-inset text-white font-inter text-sm"
            >
              Connect Wallet
            </button>
          )}

          {/* Log out - Only show when authenticated */}
          {authenticated && (
            <button
              onClick={logout}
              className="px-4 py-2 rounded-full bg-searchBg shadow-button-inset text-white font-inter text-sm"
            >
              {displayAddress} | Logout
            </button>
          )}

          {/* Notification Icon */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-button-inset flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Create Button */}
          <Link to={'/create-event'}>
            <button className="bg-button-gradient px-4 py-2 rounded-full flex items-center gap-2 text-white font-inter text-sm">
              <Plus className="w-4 h-4" />
              <span>Create</span>
            </button>
          </Link>
        </div>

        {/* Mobile Menu (conditionally shown) */}
        {mobileMenuOpen && (
          <div className="mobile-menu absolute top-16 right-0 w-48 bg-background border border-borderStroke rounded-bl-lg shadow-lg z-20">
            <div className="p-3 flex flex-col gap-3">
              <Link to={'/create-event'}>
                <button className="w-full bg-button-gradient px-3 py-2 rounded-full flex items-center justify-center gap-1 text-white font-inter text-xs">
                  <Plus className="w-3 h-3" />
                  <span>Create Event</span>
                </button>
              </Link>

              {authenticated && (
                <div className="flex flex-col gap-2">
                  <div className="text-white text-xs text-center py-1 px-2 bg-opacity-50 bg-searchBg rounded">
                    {displayAddress}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
