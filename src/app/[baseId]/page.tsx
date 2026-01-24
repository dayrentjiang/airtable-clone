import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { BaseTopNav } from "~/app/_components/base/BaseTopNav";
import { BaseContent } from "~/app/_components/base/BaseContent";

interface BasePageProps {
  params: Promise<{ baseId: string }>;
}

export default async function BasePage({ params }: BasePageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { baseId } = await params;

  // Fetch the base data with tables
  const base = await api.base.getById({ id: baseId });

  if (!base) {
    redirect("/");
  }

  const userInitial = session.user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Table bar */}
      <BaseContent
        baseId={baseId}
        tables={base.tables}
        userInitial={userInitial}
      />
    </div>
  );
}
