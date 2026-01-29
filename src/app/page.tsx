import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { HomeLayout } from "~/app/_components/layout/HomeLayout";
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
    <HomeLayout session={session}>
      <HomeContent />
    </HomeLayout>
  );
}
