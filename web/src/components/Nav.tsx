import Link from "next/link";
import { Mark, Wordmark } from "./Logo";
import { currentUser } from "@/lib/auth";

export async function Nav() {
  const user = await currentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark size={28} />
          <Wordmark className="text-[22px]" />
        </Link>
        <nav className="flex items-center gap-1 md:gap-2 text-[15px]">
          <Link href="/docs/ios" className="hidden sm:inline-flex h-10 items-center rounded-full px-3.5 text-mist hover:text-paper">
            iPhone
          </Link>
          <Link href="/docs/cli" className="hidden sm:inline-flex h-10 items-center rounded-full px-3.5 text-mist hover:text-paper">
            Shell
          </Link>
          <Link href="/docs/windows" className="hidden sm:inline-flex h-10 items-center rounded-full px-3.5 text-mist hover:text-paper">
            Windows
          </Link>
          <Link href="/docs/mac" className="hidden md:inline-flex h-10 items-center rounded-full px-3.5 text-mist hover:text-paper">
            Mac
          </Link>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary h-10 ml-2">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-10 items-center rounded-full px-3.5 text-mist hover:text-paper">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary h-10 ml-1">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line mt-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-2.5 text-fog">
          <Mark size={22} mono />
          <span className="text-sm">cpxo. Copy here, paste anywhere.</span>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-fog">
          <Link href="/docs/ios" className="hover:text-paper">iPhone setup</Link>
          <Link href="/docs/cli" className="hover:text-paper">Shell CLI</Link>
          <Link href="/docs/windows" className="hover:text-paper">Windows app</Link>
          <Link href="/docs/mac" className="hover:text-paper">Mac app</Link>
          <Link href="/docs/mcp" className="hover:text-paper">MCP</Link>
          <a href="https://github.com/noneym/cpxo.dev" className="hover:text-paper">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
