export const formatRelativeTime = (
  dateString: string | null | undefined
): string => {
  if (!dateString) return "";

  // Force UTC interpretation if no timezone is provided
  let normalizedDate = dateString;
  if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
    normalizedDate = dateString + 'Z';
  }

  const date = new Date(normalizedDate);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now"; // Kurang dari 1 menit
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`; // Kurang dari 1 jam
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`; //kurang dari 1 hari
  } else if (diffInSeconds >= 86400 && diffInSeconds < 172800) {
    return "Yesterday"; // kemarin
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""} ago`; //kurang dari 1 minggu
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
