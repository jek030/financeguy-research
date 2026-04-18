import { NextResponse } from "next/server";

const CNN_FEAR_GREED_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";

interface CnnFearGreedHistoricalPoint {
  x: number;
  y: number;
  rating?: string;
}

interface CnnFearGreedResponse {
  fear_and_greed?: {
    score?: number;
    rating?: string;
    timestamp?: string;
    previous_close?: number;
    previous_1_week?: number;
    previous_1_month?: number;
    previous_1_year?: number;
  };
  fear_and_greed_historical?: {
    data?: CnnFearGreedHistoricalPoint[];
  };
}

function normalizeDate(value: string | number | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const response = await fetch(CNN_FEAR_GREED_URL, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        Origin: "https://www.cnn.com",
        Referer: "https://www.cnn.com/markets/fear-and-greed",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      // CNN updates during market hours; 5m cache keeps this fresh without overfetching.
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`CNN fear-greed request failed (${response.status}): ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as CnnFearGreedResponse;
    const latest = payload.fear_and_greed;
    if (!latest || typeof latest.score !== "number") {
      throw new Error("CNN fear-greed payload missing latest score");
    }

    const historyRaw = payload.fear_and_greed_historical?.data ?? [];
    const history = historyRaw
      .filter((point) => typeof point?.y === "number")
      .map((point) => ({
        date: normalizeDate(point.x),
        score: point.y,
        rating: point.rating ?? null
      }))
      .sort((a, b) => (a.date > b.date ? -1 : 1));

    const latestDate = normalizeDate(latest.timestamp);

    return NextResponse.json({
      latest: {
        date: latestDate,
        score: latest.score,
        rating: latest.rating ?? null,
        previous_close: latest.previous_close ?? null,
        previous_1_week: latest.previous_1_week ?? null,
        previous_1_month: latest.previous_1_month ?? null,
        previous_1_year: latest.previous_1_year ?? null
      },
      history
    });
  } catch (error) {
    console.error("[sentiment] fear-greed live fetch failed", error);
    return NextResponse.json({ error: "Failed to fetch fear and greed data" }, { status: 500 });
  }
}
