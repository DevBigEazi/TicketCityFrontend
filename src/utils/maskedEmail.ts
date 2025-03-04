// To handle masked email
export const maskEmail = (email: string) => {
  if (!email || typeof email !== "string") return "Invalid email";

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "Invalid email";

  const maskedLocal =
    localPart.length > 3
      ? localPart.slice(0, 4) + "*".repeat(5)
      : localPart + "*";

  return `${maskedLocal}@${domain}`;
};
