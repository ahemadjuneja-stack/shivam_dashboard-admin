export function getTextColorForBackground(hexColor: string): string {
  if (!hexColor) return '#ffffff';
  
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return '#ffffff';

  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  // Calculate perceived brightness
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 128 ? '#000000' : '#ffffff';
}

/**
 * Strictly formats a timestamp into 12-hour AM/PM format (e.g. "02:30 PM", "11:15 AM")
 */
export function formatOrderTime12Hour(timestamp: number | string | Date | undefined): string {
  if (!timestamp) return '--:-- --';
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp) 
    : typeof timestamp === 'string' && !isNaN(Number(timestamp))
    ? new Date(Number(timestamp))
    : new Date(timestamp);

  if (isNaN(date.getTime())) {
    return '--:-- --';
  }

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${strHours}:${strMinutes} ${ampm}`;
}

/**
 * Formats a date into DD-MM-YYYY format (e.g. "19-09-2026")
 */
export function formatOrderDate(timestamp: number | string | Date | undefined): string {
  if (!timestamp) return '';
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp) 
    : typeof timestamp === 'string' && !isNaN(Number(timestamp))
    ? new Date(Number(timestamp))
    : new Date(timestamp);

  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

