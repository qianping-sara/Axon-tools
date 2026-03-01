"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export function ToolCard({ title, description, href, icon: Icon }: ToolCardProps) {
  return (
    <Link href={href} className="block group">
      <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-sm bg-card">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-medium group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
