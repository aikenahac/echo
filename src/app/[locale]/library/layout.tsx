import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Library</h1>
      {children}
    </div>
  );
}
