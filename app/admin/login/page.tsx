import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm, LoginHeader } from "@/components/admin/LoginForm";
import { isLoggedIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "登录后台" };

export default async function LoginPage() {
  if (await isLoggedIn()) redirect("/admin");

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center">
      <div className="glass-strong glass-sheen animate-fade-up rounded-4xl p-7 sm:p-9">
        <LoginHeader />
        <LoginForm />
        <Link
          href="/"
          className="text-muted hover:text-brand-500 mt-6 flex items-center justify-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          返回博客首页
        </Link>
      </div>
    </div>
  );
}
