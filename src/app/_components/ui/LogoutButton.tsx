"use client";

export function LogoutButton() {
  const handleLogout = async () => {
    // Redirect to NextAuth signout endpoint
    window.location.href = "/api/auth/signout";
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
    >
      Logout
    </button>
  );
}
