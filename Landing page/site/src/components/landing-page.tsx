"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Copy,
  Mail,
  Package,
  Shield,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";

import { AuroraBackground } from "@/components/aurora-background";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { releases, type ReleaseTag } from "@/lib/releases";
import { cn } from "@/lib/utils";

const filters: Array<{ id: "all" | ReleaseTag; label: string }> = [
  { id: "all", label: "All" },
  { id: "feature", label: "Features" },
  { id: "fix", label: "Fixes" },
  { id: "docs", label: "Docs & UX" },
];

const tagStyles: Record<ReleaseTag, string> = {
  feature: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  fix: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  docs: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
};

export function LandingPage() {
  const [filter, setFilter] = useState<"all" | ReleaseTag>("all");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return releases;
    return releases.filter((r) => r.tags.includes(filter));
  }, [filter]);

  const copyInstall = async () => {
    await navigator.clipboard.writeText("npm install n8n-nodes-prodex@0.4.0");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <AuroraBackground />
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-size-[72px_72px] mask-[radial-gradient(ellipse_70%_50%_at_50%_0%,#000_20%,transparent_75%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_80%_at_50%_100%,#05080d,transparent_70%)]"
        aria-hidden
      />

      <a
        href="https://n8n.proday.in"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-white/50 uppercase backdrop-blur-xl transition hover:border-teal-400/40 hover:text-white"
      >
        <span className="size-1.5 rounded-full bg-teal-400 shadow-[0_0_12px_#2ee8a6]" />
        n8n.proday.in
      </a>

      <header className="sticky top-0 z-40 border-b border-transparent bg-transparent backdrop-blur-xl transition data-scrolled:border-white/10 data-scrolled:bg-black/35">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="#" className="group flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-500/10 shadow-[0_0_40px_rgba(46,232,166,0.15)] transition group-hover:rotate-[-3deg] group-hover:scale-105">
              <Terminal className="size-5 text-teal-300" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">
                ProDex
              </p>
              <p className="text-xs text-muted-foreground">for self-hosted n8n</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["#releases", "Releases"],
              ["#services", "Services"],
              ["#install", "Install"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              >
                {label}
              </a>
            ))}
            <a
              href="mailto:collegeitpro@gmail.com"
              className={buttonVariants({
                size: "sm",
                className: "ml-2 bg-teal-400 text-black hover:bg-teal-300",
              })}
            >
              Contact
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-10 sm:px-6 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl text-center"
          >
            <Badge
              variant="outline"
              className="mb-6 border-teal-400/30 bg-teal-500/10 text-teal-200"
            >
              <span className="mr-2 inline-block size-1.5 animate-pulse rounded-full bg-teal-400" />
              Live · v0.4.0
            </Badge>

            <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-7xl">
              Run{" "}
              <span className="bg-linear-to-r from-teal-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                Codex
              </span>{" "}
              inside n8n
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Track every release of <strong className="text-foreground">n8n-nodes-prodex</strong>{" "}
              — features, fixes, and setup notes — plus book custom workflow builds and 1:1 n8n
              training from Nils.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://www.npmjs.com/package/n8n-nodes-prodex"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  size: "lg",
                  className: "bg-teal-400 text-black hover:bg-teal-300",
                })}
              >
                <Package className="size-4" />
                Install from npm
              </a>
              <a
                href="#services"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "border-white/15 bg-white/5",
                })}
              >
                Book n8n help
              </a>
            </div>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, label: "Latest", value: "v0.4.0", meta: "ProDex rebrand" },
              { icon: Shield, label: "Device login", value: "Operational", meta: "auth.json on server" },
              { icon: Sparkles, label: "AI Agent", value: "Chat Model", meta: "prodexChatModel node" },
              { icon: BookOpen, label: "Skills", value: "v0.3.0+", meta: "SKILL.md prompts" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
              >
                <Card className="border-white/10 bg-white/3 backdrop-blur-md transition hover:-translate-y-1 hover:border-teal-400/25 hover:shadow-[0_0_40px_rgba(46,232,166,0.08)]">
                  <CardHeader className="pb-2">
                    <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300">
                      <stat.icon className="size-4" />
                    </div>
                    <CardDescription className="text-[10px] tracking-[0.16em] uppercase">
                      {stat.label}
                    </CardDescription>
                    <CardTitle className="text-lg">{stat.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{stat.meta}</CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="releases" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
                Release tracker
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Filter by type. Pin versions in production — Codex backends can change without notice.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                    filter === f.id
                      ? "border-teal-400/40 bg-teal-500/10 text-teal-100"
                      : "border-white/10 bg-white/3 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filtered.map((release, index) => (
              <motion.article
                key={release.version}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="grid gap-4 border-b border-white/8 pb-8 md:grid-cols-[140px_1fr]"
              >
                <div className="md:text-right">
                  <p className="font-[family-name:var(--font-display)] text-xl font-bold">
                    {release.version}
                  </p>
                  <p className="text-xs text-muted-foreground">{release.date}</p>
                </div>
                <Card className="border-white/10 bg-white/3 backdrop-blur-md">
                  <CardContent className="pt-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {release.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className={tagStyles[tag]}>
                          {tag === "docs" ? "UX" : tag}
                        </Badge>
                      ))}
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {release.items.map((item) => (
                        <li key={item} className="relative pl-4 before:absolute before:left-0 before:top-2 before:size-1.5 before:rounded-full before:bg-linear-to-br before:from-teal-300 before:to-violet-400">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="services" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Need more than the node?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built by <strong className="text-foreground">Nils</strong>. Production n8n
              systems — not demos. Custom workflows and hands-on training on your stack.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {[
              {
                title: "Custom n8n workflows",
                body: "From Codex-powered dev automation to full business stacks — architected and deployed on your self-hosted n8n.",
                items: [
                  "AI agent + tool orchestration",
                  "Self-hosted Docker / VPS setup",
                  "Community nodes & custom integrations",
                  "Webhook, CRM, and ops automation",
                ],
                cta: "Request a workflow build",
                href: "mailto:collegeitpro@gmail.com?subject=Custom%20n8n%20workflow%20inquiry",
                primary: true,
              },
              {
                title: "1:1 n8n training & consultation",
                body: "Live screen-share sessions — onboarding to ProDex or scaling agency-grade automation.",
                items: [
                  "Device login & ProDex setup walkthrough",
                  "AI Agent + chat model wiring",
                  "Skills, prompts, and sandbox best practices",
                  "Debugging failed runs & auth issues",
                ],
                cta: "Book a consultation",
                href: "mailto:collegeitpro@gmail.com?subject=1:1%20n8n%20consultation",
                primary: false,
              },
            ].map((service) => (
              <Card
                key={service.title}
                className="group border-white/10 bg-white/3 backdrop-blur-md transition hover:-translate-y-1 hover:border-violet-400/20 hover:shadow-[0_0_60px_rgba(139,92,246,0.08)]"
              >
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                    <Workflow className="size-5" />
                  </div>
                  <CardTitle className="text-2xl">{service.title}</CardTitle>
                  <CardDescription className="text-base">{service.body}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                    {service.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-teal-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={service.href}
                    className={buttonVariants({
                      variant: service.primary ? "default" : "outline",
                      className: service.primary
                        ? "bg-teal-400 text-black hover:bg-teal-300"
                        : "border-white/15",
                    })}
                  >
                    {service.cta}
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="install" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Card className="overflow-hidden border-white/10 bg-linear-to-br from-white/6 to-white/2 backdrop-blur-md">
            <CardHeader className="text-center">
              <CardTitle className="font-[family-name:var(--font-display)] text-3xl">
                Quick install
              </CardTitle>
              <CardDescription className="mx-auto max-w-xl text-base">
                Self-hosted n8n → Settings → Community Nodes → Install{" "}
                <strong>n8n-nodes-prodex</strong> → restart n8n.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 pb-8">
              <div className="flex w-full max-w-lg items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-sm text-teal-300">
                <code>npm install n8n-nodes-prodex@0.4.0</code>
                <Button size="sm" variant="outline" onClick={copyInstall} className="shrink-0 border-white/15">
                  <Copy className="size-3.5" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <details className="w-full max-w-lg rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm">
                <summary className="cursor-pointer py-2 font-medium">First-time setup checklist</summary>
                <p className="pb-3 text-muted-foreground">
                  Manual Trigger → ProDex Setup → Start Device Login → browser auth → Wait for
                  Login Complete → add ProDex node to your workflow.
                </p>
              </details>
            </CardContent>
          </Card>

          <Card className="mt-6 flex flex-col items-start justify-between gap-4 border-white/10 bg-white/3 p-6 backdrop-blur-md sm:flex-row sm:items-center">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">
                Ready to automate with ProDex?
              </h3>
              <p className="text-sm text-muted-foreground">
                Setup help, custom workflows, or training sessions.
              </p>
            </div>
            <a
              href="mailto:collegeitpro@gmail.com"
              className={buttonVariants({
                className: "bg-teal-400 text-black hover:bg-teal-300",
              })}
            >
              <Mail className="size-4" />
              collegeitpro@gmail.com
            </a>
          </Card>
        </section>
      </main>

      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-[family-name:var(--font-display)] font-bold">ProDex for n8n</p>
            <p className="text-sm text-muted-foreground">Maintainer: Nils</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <a href="mailto:collegeitpro@gmail.com" className="hover:text-foreground">
              Email
            </a>
            <a href="https://n8n.proday.in" className="hover:text-foreground">
              n8n.proday.in
            </a>
            <a
              href="https://www.npmjs.com/package/n8n-nodes-prodex"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              npm
            </a>
          </div>
        </div>
        <Separator className="opacity-20" />
        <p className="py-4 text-center text-xs text-muted-foreground/60">
          OpenAI Codex via ChatGPT subscription · not API-key billing
        </p>
      </footer>
    </div>
  );
}
