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
