export function truncateFileName(name: string, maxLength = 80): {
  display: string;
  full: string;
  isTruncated: boolean;
} {
  const full = name ?? "";
  if (full.length <= maxLength) {
    return { display: full, full, isTruncated: false };
  }
  return {
    display: `${full.slice(0, maxLength)}...`,
    full,
    isTruncated: true,
  };
}
