// Profile image
export const permanentUserIdentity =
  'https://gateway.pinata.cloud/ipfs/QmTXNQNNhFkkpCaCbHDfzbUCjXQjQnhX7QFoX1YVRQCSC8';

// To handle masked email
export const maskEmail = (email: string) => {
  if (!email || typeof email !== 'string') return 'Invalid email';

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return 'Invalid email';

  const maskedLocal =
    localPart.length > 3 ? localPart.slice(0, 4) + '*'.repeat(5) : localPart + '*';

  return `${maskedLocal}@${domain}`;
};

// truncate addr
export const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Helper function to format Unix timestamp to readable date
export const formatDate = (timestamp: any) => {
  if (!timestamp) return 'TBD';

  const eventDate = new Date(Number(timestamp) * 1000);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset hours to compare just the dates
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  // Format the time portion
  const timeString = eventDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Check if event is today or tomorrow
  if (eventDay.getTime() === todayDay.getTime()) {
    return `Today | ${timeString}`;
  } else if (eventDay.getTime() === tomorrowDay.getTime()) {
    return `Tomorrow | ${timeString}`;
  } else {
    // For other dates, use the standard format
    return `${eventDate.toLocaleDateString()} | ${timeString}`;
  }
};

export const formatDateMyEvent = (timestamp: number | string | undefined): string => {
  if (!timestamp) return 'TBD';

  const eventDate = new Date(Number(timestamp) * 1000);

  // Get today and tomorrow dates for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if date is today or tomorrow
  let dateText;
  if (eventDate.toDateString() === today.toDateString()) {
    dateText = 'Today';
  } else if (eventDate.toDateString() === tomorrow.toDateString()) {
    dateText = 'Tomorrow';
  } else {
    dateText = eventDate.toLocaleDateString();
  }

  return (
    dateText +
    ' | ' +
    eventDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
};

// Format distance for display
export const formatDistance = (distance: number | null): string => {
  if (distance === null) return 'N/A';
  if (distance >= 10000) return 'Virtual';

  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)} km`;
  } else {
    return `${distance.toFixed(0)} km`;
  }
};
