import React, { useState, useEffect } from "react";
import { Search, Bell, Plus } from "lucide-react";
import { usePrivy, useWallets, useUser } from "@privy-io/react-auth";
import { Link } from "react-router-dom";
import { useLogout } from "@privy-io/react-auth";

const Header: React.FC = () => {
  const { login } = usePrivy();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { user, refreshUser } = useUser();

  const { logout } = useLogout({
    onSuccess: () => {
      console.log("User logged out");
      // Any logic you'd like to execute after a user successfully logs out
    },
  });

  // Function to truncate address
  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  console.log(user);

  // Get the first wallet address if available
  const currentAddress = wallets?.[0]?.address;
  const displayAddress = authenticated
    ? truncateAddress(currentAddress)
    : "Connect Wallet";

  // Refresh user data when wallet changes
  useEffect(() => {
    const handleUserRefresh = async () => {
      if (authenticated && currentAddress) {
        await refreshUser();
        console.log("User data refreshed:", user);
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
      console.error("Error connecting wallet:", error);
    }
  };

  return (
    <header className="bg-background border-b border-borderStroke p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="flex">
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

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Connect Wallet Button */}
          <button
            onClick={handleConnect}
            className="px-4 py-2 rounded-full bg-searchBg shadow-button-inset text-white font-inter text-sm">
            {authenticated ? displayAddress : "Connect Wallet"}
          </button>

          {/* Log out */}
          <button
            onClick={logout}
            className="px-4 py-2 rounded-full bg-searchBg shadow-button-inset text-white font-inter text-sm">
            {"Log out"}
          </button>

          {/* Notification Icon */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-button-inset flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Create Button */}
          <Link to={"/create-event"}>
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
