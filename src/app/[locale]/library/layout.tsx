// Auth is enforced by the proxy (src/proxy.ts) for every /library route
export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
