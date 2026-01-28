import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { BaseContent } from "~/app/_components/base/BaseContent";

interface BasePageProps {
  params: Promise<{ baseId: string }>;
  searchParams: Promise<{ table?: string; view?: string }>;
}

export default async function BasePage({
  params,
  searchParams,
}: BasePageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { baseId } = await params;
  const { table, view } = await searchParams;

  const userInitial = session.user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Base content with dynamic table fetching */}
      <BaseContent
        baseId={baseId}
        userInitial={userInitial}
        initialTableId={table}
        initialViewId={view}
      />
    </div>
  );
}
