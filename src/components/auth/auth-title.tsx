/** Title + optional sub at the top of an auth form. */
export function AuthTitle({
  title,
  sub,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <h1 className="font-disp text-[44px] leading-none tracking-[-0.4px]">
        {title}
      </h1>
      {sub ? (
        <p className="mt-3 text-[15px] leading-5 text-ink-2">{sub}</p>
      ) : null}
    </div>
  );
}
