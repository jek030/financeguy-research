import { redirect } from "next/navigation";

export default async function ScansIndustryRedirectPage({
  params,
}: {
  params: Promise<{ sector: string; industry: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/screener/sectors/${resolvedParams.sector}/industry/${resolvedParams.industry}`);
}