import { NextResponse } from "next/server";
import { auth, pool } from "@/lib/auth";
import { nanoid } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT * FROM "search_history" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 10`,
    [session.user.id],
  );

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, vatRate, citations } = await req.json();

  const { rows: existing } = await pool.query(
    `SELECT id FROM "search_history" WHERE "userId" = $1 ORDER BY "createdAt" ASC`,
    [session.user.id],
  );

  if (existing.length >= 10) {
    await pool.query(`DELETE FROM "search_history" WHERE id = $1`, [
      existing[0].id,
    ]);
  }

  await pool.query(
    `INSERT INTO "search_history" ("id", "userId", "query", "vatRate", "citations") VALUES ($1, $2, $3, $4, $5)`,
    [nanoid(), session.user.id, query, vatRate, JSON.stringify(citations)],
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
