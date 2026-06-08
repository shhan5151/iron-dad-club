import { NextResponse } from "next/server";
import type { AppSnapshot } from "@/lib/storage";

const CLOUD_STATE_ID = "iron-dad-club";
const CLOUD_TABLE = "app_state";

const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isServerSyncConfigured() {
  return Boolean(RAW_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function createSupabaseHeaders(apiKey: string) {
  return {
    apikey: apiKey,
    ...(apiKey.startsWith("eyJ") ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function normalizeSupabaseRestUrl(url?: string) {
  if (!url) {
    return "";
  }

  return url.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

async function readResponseError(response: Response, fallback: string) {
  const responseText = (await response.text()).trim();
  if (!responseText) {
    return `${fallback} (${response.status})`;
  }

  return `${fallback} (${response.status}): ${responseText}`;
}

export async function GET() {
  if (!isServerSyncConfigured()) {
    return NextResponse.json({ error: "Server sync not configured" }, { status: 503 });
  }

  const response = await fetch(
    `${normalizeSupabaseRestUrl(RAW_SUPABASE_URL)}/rest/v1/${CLOUD_TABLE}?id=eq.${CLOUD_STATE_ID}&select=payload`,
    {
      headers: createSupabaseHeaders(SUPABASE_SERVICE_ROLE_KEY!),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: await readResponseError(response, "Cloud state could not be loaded") },
      { status: response.status },
    );
  }

  const rows = (await response.json()) as Array<{ payload?: Partial<AppSnapshot> }>;
  return NextResponse.json({ snapshot: rows[0]?.payload ?? null }, { status: 200 });
}

export async function POST(request: Request) {
  if (!isServerSyncConfigured()) {
    return NextResponse.json({ error: "Server sync not configured" }, { status: 503 });
  }

  const body = (await request.json()) as { snapshot?: AppSnapshot };
  if (!body.snapshot) {
    return NextResponse.json({ error: "Missing snapshot payload" }, { status: 400 });
  }

  const response = await fetch(`${normalizeSupabaseRestUrl(RAW_SUPABASE_URL)}/rest/v1/${CLOUD_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      ...createSupabaseHeaders(SUPABASE_SERVICE_ROLE_KEY!),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: CLOUD_STATE_ID,
      payload: body.snapshot,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: await readResponseError(response, "Cloud state could not be saved") },
      { status: response.status },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
