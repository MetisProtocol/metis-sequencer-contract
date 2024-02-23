export const parseDuration = (durationString: string) => {
  const regex = /(-?\d*\.?\d+(?:e[-+]?\d+)?)\s*([a-zA-Z]+)/g;
  let totalSeconds = 0;

  let match;
  while ((match = regex.exec(durationString)) !== null) {
    let value = parseFloat(match[1]);
    let unit = match[2];

    switch (unit.toLowerCase()) {
      case "s":
        totalSeconds += value;
        break;
      case "m":
        totalSeconds += value * 60;
        break;
      case "h":
        totalSeconds += value * 60 * 60;
        break;
      case "d":
        totalSeconds += value * 24 * 60 * 60;
        break;
      case "w":
        totalSeconds += value * 7 * 24 * 60 * 60;
        break;
      default:
        throw new Error("Unsupported unit: " + unit);
    }
  }

  return totalSeconds;
};
