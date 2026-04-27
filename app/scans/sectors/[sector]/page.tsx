import { redirect } from "next/navigation";

export default async function ScansSectorRedirectPage({
  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/screener/sectors/${resolvedParams.sector}`);
}