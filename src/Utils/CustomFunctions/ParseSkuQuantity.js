export const parseSkuQuantity = (text) => {
  if (!text) return "";
  
  const cleanText = text.toLowerCase().trim();
  
  // Extract number and unit
  // Matches "1kg", "1 kg", "500g", "1.5L", etc.
  const match = cleanText.match(/^(\d+(\.\d+)?)\s*([a-z]+)$/);
  
  if (!match) {
    // If it's just a number, return it
    if (/^\d+(\.\d+)?$/.test(cleanText)) {
      return cleanText;
    }
    // Fallback: remove spaces and special characters but keep alphanumeric
    return cleanText.replace(/[^a-z0-9]/g, '');
  }

  const value = parseFloat(match[1]);
  const unit = match[3];

  switch (unit) {
    case 'kg':
    case 'k.g':
    case 'kilo':
    case 'kilogram':
    case 'l':
    case 'liter':
    case 'litre':
      return Math.round(value * 1000).toString();
    case 'g':
    case 'gm':
    case 'gram':
    case 'grams':
    case 'ml':
      return Math.round(value).toString();
    case 'pcs':
    case 'pc':
    case 'piece':
    case 'pieces':
    case 'pkt':
    case 'packet':
      return Math.round(value).toString();
    default:
      return Math.round(value).toString();
  }
};
