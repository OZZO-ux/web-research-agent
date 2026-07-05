import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const history = await db.research.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const formatted = history.map((r) => ({
      id: r.id,
      query: r.query,
      report: r.report,
      sources: JSON.parse(r.sources),
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ history: formatted });
  } catch {
    return NextResponse.json({ history: [] });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.research.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}