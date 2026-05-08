interface WeatherData {
  temperature: number;
  windspeed: number;
  description: string;
  icon: string;
}

export async function getWeather(
  latitude: number,
  longitude: number,
  units: "metric" | "imperial" = "metric"
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=${units === "imperial" ? "fahrenheit" : "celsius"}&wind_speed_unit=${units === "imperial" ? "mph" : "kmh"}`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current;
    return {
      temperature: current.temperature_2m,
      windspeed: current.wind_speed_10m,
      description: weatherCodeToText(current.weather_code),
      icon: weatherCodeToIcon(current.weather_code),
    };
  } catch {
    return null;
  }
}

export function weatherCodeToText(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] ?? "Unknown";
}

export function weatherCodeToIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "🌨️";
  if (code <= 82) return "🌧️";
  return "⛈️";
}
