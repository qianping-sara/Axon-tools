"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
}

const components: Components = {
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-b-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-medium text-foreground border-r border-border last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-muted-foreground border-r border-border last:border-r-0">
      {children}
    </td>
  ),
  pre: ({ children }) => (
    <pre className="my-2 p-3 bg-muted border border-border rounded-md overflow-x-auto text-xs">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    return isInline ? (
      <code className="px-1.5 py-0.5 bg-muted text-xs rounded font-mono">
        {children}
      </code>
    ) : (
      <code className="text-xs font-mono">{children}</code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-2 pl-4 py-1 border-l-2 border-primary bg-muted/30 rounded-r text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="my-2 pl-5 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 pl-5 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold text-foreground mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-foreground mt-3 mb-1">{children}</h3>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-border" />,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="text-sm text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
