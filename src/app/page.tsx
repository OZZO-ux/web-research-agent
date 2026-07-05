"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Globe,
  FileText,
  Brain,
  Loader2,
  ExternalLink,
  Trash2,
  Clock,
  BarChart3,
  History,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Source {
  url: string;
  title: string;
  snippet: string;
  host: string;
  date: string;
  favicon: string;
}

interface ResearchResult {
  success: boolean;
  report: string;
  sources: Source[];
  stats: {
    searchResults: number;
    pagesRead: number;
    totalChars: number;
  };
}

interface HistoryItem {
  id: string;
  query: string;
  report: string;
  sources: Source[];
  createdAt: string;
}

type Phase = "idle" | "searching" | "reading" | "synthesizing" | "done" | "error";

/* ------------------------------------------------------------------ */
/*  Phase indicator                                                    */
/* ------------------------------------------------------------------ */

function PhaseIndicator({ phase }: { phase: Phase }) {
  const steps: { key: Phase; label: string; icon: React.ReactNode }[] = [
    { key: "searching", label: "Searching the web", icon: <Globe className="h-4 w-4" /> },
    { key: "reading", label: "Reading sources", icon: <FileText className="h-4 w-4" /> },
    { key: "synthesizing", label: "Synthesizing report", icon: <Brain className="h-4 w-4" /> },
  ];
  const currentIdx = steps.findIndex((s) => s.key === phase);

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {steps.map((step, idx) => {
        const isDone = currentIdx > idx;
        const isCurrent = currentIdx === idx;
        const isPending =
          currentIdx < idx && !["done", "error", "idle"].includes(phase);
        return (
          <div key={step.key} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            )}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all ${
                isCurrent
                  ? "bg-primary/10 text-primary font-medium"
                  : isDone
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isPending
                  ? "opacity-40"
                  : ""
              }`}
            >
              {isCurrent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isDone ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  &#10003;
                </span>
              ) : (
                step.icon
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Source card                                                         */
/* ------------------------------------------------------------------ */

function SourceCard({ source, index }: { source: Source; index: number }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent group"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
          {source.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {source.snippet}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground/70">
          <span className="truncate">{source.host}</span>
          {source.date && (
            <>
              <span>&middot;</span>
              <span>{source.date}</span>
            </>
          )}
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors mt-0.5" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadHistory = useCallback(async () => {
    if (historyLoaded) {
      setShowHistory(!showHistory);
      return;
    }
    try {
      const res = await fetch("/api/research/history");
      const data = await res.json();
      setHistory(data.history || []);
      setHistoryLoaded(true);
      setShowHistory(true);
    } catch {
      toast.error("Failed to load history");
    }
  }, [historyLoaded, showHistory]);

  const handleResearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setPhase("searching");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Research failed");

      setPhase("done");
      setResult(data);

      // Refresh history
      if (historyLoaded) {
        const histRes = await fetch("/api/research/history");
        const histData = await histRes.json();
        setHistory(histData.history || []);
      } else {
        setHistoryLoaded(true);
      }
      toast.success("Research complete!");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error(err instanceof Error ? err.message : "Research failed");
    }
  }, [query, historyLoaded]);

  const loadPastResearch = useCallback((item: HistoryItem) => {
    setResult({
      success: true,
      report: item.report,
      sources: item.sources,
      stats: { searchResults: 0, pagesRead: 0, totalChars: 0 },
    });
    setQuery(item.query);
    setPhase("done");
    setShowHistory(false);
  }, []);

  const deleteHistory = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
        await fetch("/api/research/history", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setHistory((prev) => prev.filter((h) => h.id !== id));
        toast.success("Deleted");
      } catch {
        toast.error("Failed to delete");
      }
    },
    []
  );

  const isWorking = ["searching", "reading", "synthesizing"].includes(phase);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                Web Research Agent
              </h1>
              <p className="text-xs text-muted-foreground">
                Search &middot; Read &middot; Synthesize
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            {history.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-5 text-xs px-1.5"
              >
                {history.length}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Search */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isWorking && handleResearch()
                }
                placeholder="What do you want to research?"
                className="pl-10 h-12 text-base rounded-xl"
                disabled={isWorking}
              />
            </div>
            <Button
              onClick={handleResearch}
              disabled={isWorking || !query.trim()}
              size="lg"
              className="h-12 px-6 rounded-xl gap-2 font-medium"
            >
              {isWorking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Researching...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Research</span>
                </>
              )}
            </Button>
          </div>

          {isWorking && <PhaseIndicator phase={phase as Phase} />}

          {phase === "error" && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Research Failed
                </p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResearch}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Results ────────────────────────────────────────── */}
        {phase === "done" && result && (
          <div className="mt-8 space-y-6">
            {/* Stats */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <Globe className="h-3.5 w-3.5" />
                {result.stats.searchResults} results found
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <FileText className="h-3.5 w-3.5" />
                {result.stats.pagesRead} pages read
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <BarChart3 className="h-3.5 w-3.5" />
                {(result.stats.totalChars / 1000).toFixed(1)}k chars analyzed
              </Badge>
            </div>

            {/* Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Research Report</CardTitle>
                <CardDescription>
                  Synthesized from {result.stats.pagesRead} web sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm sm:prose dark:prose-invert max-w-none prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:font-semibold">
                  <ReactMarkdown>{result.report}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Sources
                </CardTitle>
                <CardDescription>
                  {result.sources.length} references used in this research
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.sources.map((source, i) => (
                    <SourceCard
                      key={source.url}
                      source={source}
                      index={i}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Loading Skeleton ──────────────────────────────── */}
        {isWorking && (
          <div className="mt-8 space-y-6 animate-in fade-in duration-500">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-1" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-4"
                    style={{ width: `${85 - i * 6}%` }}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Empty State ───────────────────────────────────── */}
        {phase === "idle" && (
          <div className="mt-16 sm:mt-24 flex flex-col items-center text-center space-y-6 animate-in fade-in duration-700">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-semibold tracking-tight">
                AI-Powered Web Research
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Enter any topic and this agent will search the web, read
                multiple sources, and synthesize a comprehensive research
                report with citations.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
              {[
                {
                  icon: <Globe className="h-5 w-5" />,
                  title: "Web Search",
                  desc: "Finds the most relevant sources across the web",
                },
                {
                  icon: <FileText className="h-5 w-5" />,
                  title: "Deep Reading",
                  desc: "Reads and extracts content from top pages",
                },
                {
                  icon: <Brain className="h-5 w-5" />,
                  title: "LLM Synthesis",
                  desc: "Creates a structured report with citations",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-2 rounded-xl border p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {item.icon}
                  </div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {[
                "AI agents in 2025",
                "renewable energy trends",
                "remote work productivity",
                "quantum computing basics",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── History Drawer ──────────────────────────────────── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Research History
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                Close
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {history.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No research history yet
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadPastResearch(item)}
                      className="group flex items-start gap-3 rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-1">
                          {item.query}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                          <span className="mx-1">&middot;</span>
                          {item.sources?.length || 0} sources
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteHistory(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground mt-auto">
        <p>
          Web Research Agent &mdash; Powered by Tavily, OpenAI &amp;
          Cheerio
        </p>
      </footer>
    </div>
  );
}