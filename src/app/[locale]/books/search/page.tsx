import { redirect } from "@/i18n/routing";

// Book search moved to /search (Books tab)
export default async function BooksSearchRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  redirect({ href: q ? `/search?q=${encodeURIComponent(q)}` : "/search", locale });
}
