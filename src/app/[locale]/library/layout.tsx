// Auth is enforced by the proxy (src/proxy.ts) for every /library route
export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Library</h1>
      {children}
    </div>
  );
}
