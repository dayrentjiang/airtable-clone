import { LoginForm } from "~/app/_components/login/LoginForm";
import { PromoSection } from "~/app/_components/login/PromoSection";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left section - Login Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <LoginForm />
      </div>

      {/* Right section - Promo */}
      <PromoSection />
    </div>
  );
}
