"use client";

import { MessageSquareText, BarChart3 } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { PageHeader } from "@/components/page-header";

const tools = [
  {
    title: "CompanyResearch Chat Export",
    description:
      "Export CompanyResearch chat messages by session ID. Query database and download as CSV or PDF.",
    href: "/tools/chat-export",
    icon: MessageSquareText,
  },
  {
    title: "SmartProposal Chat Export",
    description:
      "Export SmartProposal chat with session info. View metadata and download conversations as CSV or PDF.",
    href: "/tools/smart-proposal-export",
    icon: MessageSquareText,
  },
  {
    title: "Smart Proposal Dev Dashboard",
    description:
      "View conversation totals, proposal type breakdown, and unique user count for a selected time period.",
    href: "/tools/smart-proposal-dashboard",
    icon: BarChart3,
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      <div className="flex-1 w-[80%] max-w-6xl mx-auto py-10">
        <div className="mb-8">
          <PageHeader
            title="Internal Tools"
            description="A collection of utilities for data operations and workflow automation"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <ToolCard
              key={tool.href}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              icon={tool.icon}
            />
          ))}
        </div>
      </div>

      <footer className="border-t border-border bg-background">
        <div className="w-[80%] max-w-6xl mx-auto py-4">
          <p className="text-xs text-muted-foreground">
            Axon-Forge v1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
