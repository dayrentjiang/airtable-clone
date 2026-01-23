import { LogoutButton } from "../_components/ui/LogoutButton";

export default function WorkspacePage() {
  return (
    <div>
      <header>
        <div>
          <h1>Workspace</h1>
          <LogoutButton />
        </div>
      </header>
      <main>
        <p>Your workspace content goes here...</p>
      </main>
    </div>
  );
}
