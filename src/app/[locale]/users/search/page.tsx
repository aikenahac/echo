import { redirect } from "@/i18n/routing";

// Reader search moved to /search (Readers tab)
export default async function UsersSearchRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  const query = q ? `&q=${encodeURIComponent(q)}` : "";
  redirect({ href: `/search?tab=readers${query}`, locale });
}
