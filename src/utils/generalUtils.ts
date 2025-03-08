// To handle masked email
export const maskEmail = (email: string) => {
  if (!email || typeof email !== 'string') return 'Invalid email';

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return 'Invalid email';

  const maskedLocal =
    localPart.length > 3 ? localPart.slice(0, 4) + '*'.repeat(5) : localPart + '*';

  return `${maskedLocal}@${domain}`;
};

export const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const permanentUserIdentity =
  'https://gateway.pinata.cloud/ipfs/QmTXNQNNhFkkpCaCbHDfzbUCjXQjQnhX7QFoX1YVRQCSC8';
