import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { TopNav } from "~/app/_components/layout/TopNav";
import { SideNav } from "~/app/_components/layout/SideNav";
import { IconSidebar } from "~/app/_components/layout/IconSidebar";
import { HomeContent } from "~/app/_components/home/HomeContent";

export default async function Home() {
  const session = await auth();

  // If not authenticated, redirect to login
  if (!session) {
    redirect("/login");
  }

  const userInitial = session.user?.name?.[0]?.toUpperCase() ?? "U";

  // Show home content when authenticated
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <TopNav session={session} />

      <div className="flex flex-1 overflow-hidden">
        <SideNav />

        <main className="flex-1 overflow-y-auto">
          <HomeContent />
        </main>
      </div>
    </div>
  );
}
