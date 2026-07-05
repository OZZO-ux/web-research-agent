import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { tavily } from "@tavily/core";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

function extractText(html: string, maxLength = 8000): string {
  const $ = cheerio.load(html);
  // Remove non-content elements
  $("script, style, nav, footer, header, aside, noscript, iframe, svg").remove();
  // Get main content or fall back to body
  const content =
    $("main").text() ||
    $("article").text() ||
    $('[role="main"]').text() ||
    $("body").text();
  return content.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide a research query" },
        { status: 400 }
      );
    }

    // ── Phase 1: Web Search via Tavily ──────────────────────────
    const searchResponse = await tvly.search(query.trim(), {
      maxResults: 8,
      includeAnswer: false,
    });

    const rawResults = searchResponse.results || [];
    if (rawResults.length === 0) {
      return NextResponse.json(
        { error: "No search results found. Try a different query." },
        { status: 404 }
      );
    }

    const sources = rawResults.slice(0, 6).map((r) => ({
      url: r.url,
      title: r.title || "Untitled",
      snippet: (r.content || "").slice(0, 200),
      host: new URL(r.url).hostname.replace("www.", ""),
      date: r.publishedDate || "",
      favicon: "",
    }));

    // ── Phase 2: Read top pages ─────────────────────────────────
    const pagesToRead = sources.slice(0, 4);
    const pageContents: {
      title: string;
      url: string;
      text: string;
    }[] = [];

    for (const source of pagesToRead) {
      try {
        const res = await fetch(source.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; ResearchAgent/1.0; +https://github.com)",
            Accept: "text/html",
          },
          signal: AbortSignal.timeout(10_000),
        });
        const html = await res.text();
        const text = extractText(html);
        if (text.length > 100) {
          pageContents.push({
            title: source.title,
            url: source.url,
            text,
          });
        }
      } catch {
        // Skip pages that fail to load
      }
    }

    // ── Phase 3: LLM Synthesis via OpenAI ───────────────────────
    const contextBlock = pageContents
      .map(
        (p, i) =>
          `--- Source ${i + 1}: ${p.title} ---\nURL: ${p.url}\nContent:\n${p.text}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert research analyst. Synthesize information from multiple web sources into a comprehensive, well-structured research report.

Guidelines:
- Write in a clear, professional tone
- Structure with ## headings and ### subheadings
- Include key findings, data points, and insights from the sources
- Identify patterns, trends, and connections across sources
- Note any conflicting information between sources
- Provide actionable takeaways where relevant
- Use bullet points for lists
- Bold important terms or key data
- Cite sources inline using [Source N] format
- Do NOT fabricate information not present in the sources`,
        },
        {
          role: "user",
          content: `Research Topic: ${query}\n\nHere are the sources I found and their content:\n\n${contextBlock}\n\nPlease provide a comprehensive research report on "${query}" based on these sources.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    });

    const report =
      completion.choices[0]?.message?.content ||
      "Failed to generate research report. Please try again.";

    // ── Save to database ────────────────────────────────────────
    try {
      await db.research.create({
        data: {
          query: query.trim(),
          report,
          sources: JSON.stringify(sources),
        },
      });
    } catch {
      // DB write is non-critical — don't fail the request
    }

    return NextResponse.json({
      success: true,
      report,
      sources,
      stats: {
        searchResults: rawResults.length,
        pagesRead: pageContents.length,
        totalChars: contextBlock.length,
      },
    });
  } catch (error) {
    console.error("Research error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}