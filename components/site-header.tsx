"use client";

import Link from "next/link";
import { Hammer } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-[80%] max-w-6xl mx-auto flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/20">
            <Hammer className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight leading-none">
              Axon-Forge
            </span>
            <span className="text-[11px] text-muted-foreground tracking-wide">
              INTERNAL TOOLS
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-6">
          <Link 
            href="/" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Internal Tools
          </Link>
          <span className="text-xs text-muted-foreground hidden sm:block">v1.0</span>
        </nav>
      </div>
    </header>
  );
}
