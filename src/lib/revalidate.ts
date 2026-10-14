import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

/**
 * Revalidate an app path for every locale.
 *
 * All pages live under `/[locale]` and next-intl prefixes every URL with the
 * locale, so `revalidatePath("/library")` would never match `/en/library`.
 *
 * @param path - Path without the locale prefix, e.g. "/library" or `/books/${id}`
 */
export function revalidateLocalized(...paths: string[]) {
  for (const path of paths) {
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}${path}`);
    }
  }
}
