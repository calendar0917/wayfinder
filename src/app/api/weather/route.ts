import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");
  const units = (searchParams.get("units") as "metric" | "imperial") || "metric";

  if (!location) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    if (!geoRes.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }
    const geoData = await geoRes.json();
    const place = geoData.results?.[0];
    if (!place) {
      return NextResponse.json({ error: `Location "${location}" not found` }, { status: 404 });
    }

    const weather = await getWeather(place.latitude, place.longitude, units);
    if (!weather) {
      return NextResponse.json({ error: "Weather data unavailable" }, { status: 502 });
    }

    return NextResponse.json({
      ...weather,
      location: place.name,
      units,
    });
  } catch {
    return NextResponse.json({ error: "Weather lookup failed" }, { status: 500 });
  }
}
