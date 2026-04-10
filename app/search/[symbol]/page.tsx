import type { Metadata } from "next";
import SearchPageClient from "@/app/search/[symbol]/SearchPageClient";
import { fetchServerCompanyOutlook, fetchServerQuote } from "@/lib/server/fmp";

type PageParams = {
  symbol: string;
};

function formatTitle(symbol: string, price?: number, changesPercentage?: number): string {
  if (price === undefined || changesPercentage === undefined) {
    return `${symbol} - Finance Guy`;
  }

  const formattedPrice = `$${price.toFixed(2)}`;
  const formattedChange = `${changesPercentage >= 0 ? "+" : ""}${changesPercentage.toFixed(2)}%`;
  return `${symbol} ${formattedPrice} (${formattedChange}) - Finance Guy`;
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const resolvedParams = await params;
  const symbol = resolvedParams.symbol.toUpperCase();
  const quote = await fetchServerQuote(symbol);

  return {
    title: formatTitle(symbol, quote?.price, quote?.changesPercentage),
  };
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = await params;
  const symbol = resolvedParams.symbol.toUpperCase();

  const [initialQuote, initialOutlook] = await Promise.all([
    fetchServerQuote(symbol),
    fetchServerCompanyOutlook(symbol),
  ]);

  return (
    <SearchPageClient
      symbol={symbol}
      initialQuote={initialQuote}
      initialOutlook={initialOutlook}
    />
  );
}