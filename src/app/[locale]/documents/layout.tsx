import { Link } from "@/i18n/routing";
import { EchoMark } from "@/components/echo/icons";
import { Footer } from "@/components/footer";

// Legal pages: paper, Archivo headings and a readable measure
export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center px-5 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <EchoMark height={26} />
          <span className="font-disp text-[22px] leading-none">Echo</span>
        </Link>
      </header>
      <div className="legal mx-auto w-full max-w-[760px] px-5 pt-6 pb-16 md:px-10 md:pt-10">
        {children}
      </div>
      <Footer />
    </>
  );
}
