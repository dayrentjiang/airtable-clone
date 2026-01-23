import { LogoutButton } from "../_components/ui/LogoutButton";

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-gray-600">Your workspace content goes here...</p>
      </main>
    </div>
  );
}
