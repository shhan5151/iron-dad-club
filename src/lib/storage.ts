import { defaultSiteCopy, type SiteCopy } from "@/lib/copy";
import { defaultCoupons, type Coupon } from "@/lib/coupons";

const LOGIN_KEY = "iron-dad-club.logged-in";
const COUPON_STATE_KEY = "iron-dad-club.coupons";
const CUSTOM_COUPONS_KEY = "iron-dad-club.custom-coupons";
const RECORDS_KEY = "iron-dad-club.records";
const SITE_COPY_KEY = "iron-dad-club.site-copy";

const CLOUD_STATE_ID = "iron-dad-club";
const CLOUD_TABLE = "app_state";
const SERVER_SYNC_ENDPOINT = "/api/app-state";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type CouponState = Record<string, number>;
export type RedemptionStatus = "待批准" | "已批准" | "已婉拒";

export type RedemptionRecord = {
  id: string;
  couponId: string;
  couponTitle: string;
  requestedAt: string;
  resolvedAt?: string;
  status: RedemptionStatus;
};

export type AppSnapshot = {
  coupons: Coupon[];
  couponState: CouponState;
  records: RedemptionRecord[];
  siteCopy: SiteCopy;
};

type SaveResult = {
  synced: boolean;
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createDefaultCouponState(couponList: Coupon[] = defaultCoupons): CouponState {
  return Object.fromEntries(couponList.map((coupon) => [coupon.id, coupon.initialUses]));
}

function createDefaultSnapshot(): AppSnapshot {
  return {
    coupons: defaultCoupons,
    couponState: createDefaultCouponState(defaultCoupons),
    records: [],
    siteCopy: defaultSiteCopy,
  };
}

function isRedemptionStatus(value: unknown): value is RedemptionStatus {
  return value === "待批准" || value === "已批准" || value === "已婉拒";
}

function normalizeStatus(value: unknown): RedemptionStatus {
  if (isRedemptionStatus(value)) {
    return value;
  }

  if (value === "pending") {
    return "待批准";
  }

  if (value === "approved") {
    return "已批准";
  }

  if (value === "rejected") {
    return "已婉拒";
  }

  return "待批准";
}

function normalizeRecord(record: Partial<RedemptionRecord>): RedemptionRecord | null {
  if (!record.id || !record.couponId || !record.couponTitle || !record.requestedAt) {
    return null;
  }

  return {
    id: record.id,
    couponId: record.couponId,
    couponTitle: record.couponTitle,
    requestedAt: record.requestedAt,
    resolvedAt: record.resolvedAt,
    status: normalizeStatus(record.status),
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function mergeSiteCopy(partial?: Partial<SiteCopy>): SiteCopy {
  return {
    beforeLogin: {
      ...defaultSiteCopy.beforeLogin,
      ...partial?.beforeLogin,
    },
    afterLogin: {
      ...defaultSiteCopy.afterLogin,
      ...partial?.afterLogin,
    },
  };
}

function mergeSnapshot(partial?: Partial<AppSnapshot>): AppSnapshot {
  const coupons = partial?.coupons?.length ? partial.coupons : defaultCoupons;
  const records = Array.isArray(partial?.records)
    ? partial.records
        .map((record) => normalizeRecord(record))
        .filter((record): record is RedemptionRecord => Boolean(record))
    : [];

  return {
    coupons,
    couponState: {
      ...createDefaultCouponState(coupons),
      ...partial?.couponState,
    },
    records,
    siteCopy: mergeSiteCopy(partial?.siteCopy),
  };
}

function getLocalSnapshot(): AppSnapshot {
  const coupons = getCoupons();

  return {
    coupons,
    couponState: getCouponState(coupons),
    records: getRecords(),
    siteCopy: getSiteCopy(),
  };
}

function saveLocalSnapshot(snapshot: AppSnapshot) {
  writeJson(CUSTOM_COUPONS_KEY, snapshot.coupons);
  writeJson(COUPON_STATE_KEY, snapshot.couponState);
  writeJson(RECORDS_KEY, snapshot.records);
  writeJson(SITE_COPY_KEY, snapshot.siteCopy);
}

async function readResponseError(response: Response, fallback: string) {
  const responseText = (await response.text()).trim();
  if (!responseText) {
    return `${fallback}（${response.status}）`;
  }

  return `${fallback}（${response.status}）: ${responseText}`;
}

function createSupabaseHeaders(apiKey: string) {
  return {
    apikey: apiKey,
    ...(apiKey.startsWith("eyJ") ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

export function isCloudSyncConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function fetchServerSnapshot(): Promise<AppSnapshot | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const response = await fetch(SERVER_SYNC_ENDPOINT, {
    cache: "no-store",
  });

  if (response.status === 404 || response.status === 503) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readResponseError(response, "共享資料讀取失敗"));
  }

  const payload = (await response.json()) as { snapshot?: Partial<AppSnapshot> | null };
  return payload.snapshot ? mergeSnapshot(payload.snapshot) : null;
}

async function saveServerSnapshot(snapshot: AppSnapshot): Promise<SaveResult> {
  if (typeof window === "undefined") {
    return { synced: false };
  }

  const response = await fetch(SERVER_SYNC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ snapshot }),
  });

  if (response.status === 404 || response.status === 503) {
    return { synced: false };
  }

  if (!response.ok) {
    throw new Error(await readResponseError(response, "共享資料儲存失敗"));
  }

  return { synced: true };
}

async function fetchDirectCloudSnapshot(): Promise<AppSnapshot | null> {
  if (!isCloudSyncConfigured()) {
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${CLOUD_TABLE}?id=eq.${CLOUD_STATE_ID}&select=payload`,
    {
      headers: createSupabaseHeaders(SUPABASE_ANON_KEY!),
    },
  );

  if (!response.ok) {
    throw new Error(await readResponseError(response, "Supabase 資料讀取失敗"));
  }

  const rows = (await response.json()) as Array<{ payload?: Partial<AppSnapshot> }>;
  return rows[0]?.payload ? mergeSnapshot(rows[0].payload) : null;
}

async function saveDirectCloudSnapshot(snapshot: AppSnapshot): Promise<SaveResult> {
  if (!isCloudSyncConfigured()) {
    return { synced: false };
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${CLOUD_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      ...createSupabaseHeaders(SUPABASE_ANON_KEY!),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: CLOUD_STATE_ID,
      payload: snapshot,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response, "Supabase 資料儲存失敗"));
  }

  return { synced: true };
}

async function fetchRemoteSnapshot(): Promise<AppSnapshot | null> {
  let lastError: Error | null = null;

  try {
    const serverSnapshot = await fetchServerSnapshot();
    if (serverSnapshot) {
      return serverSnapshot;
    }
  } catch (error) {
    lastError = error instanceof Error ? error : new Error("共享資料讀取失敗");
  }

  try {
    const cloudSnapshot = await fetchDirectCloudSnapshot();
    if (cloudSnapshot) {
      return cloudSnapshot;
    }
  } catch (error) {
    lastError = error instanceof Error ? error : new Error("Supabase 資料讀取失敗");
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

async function saveRemoteSnapshot(snapshot: AppSnapshot): Promise<SaveResult> {
  let lastError: Error | null = null;

  try {
    const result = await saveServerSnapshot(snapshot);
    if (result.synced) {
      return result;
    }
  } catch (error) {
    lastError = error instanceof Error ? error : new Error("共享資料儲存失敗");
  }

  try {
    const result = await saveDirectCloudSnapshot(snapshot);
    if (result.synced) {
      return result;
    }
  } catch (error) {
    lastError = error instanceof Error ? error : new Error("Supabase 資料儲存失敗");
  }

  if (lastError) {
    throw lastError;
  }

  return { synced: false };
}

async function ensureRemoteSnapshot(snapshot: AppSnapshot) {
  const result = await saveRemoteSnapshot(snapshot);
  return result.synced;
}

export async function loadAppSnapshot(): Promise<AppSnapshot> {
  const localSnapshot = getLocalSnapshot();

  try {
    const remoteSnapshot = await fetchRemoteSnapshot();
    if (remoteSnapshot) {
      saveLocalSnapshot(remoteSnapshot);
      return remoteSnapshot;
    }

    await ensureRemoteSnapshot(localSnapshot);
    return localSnapshot;
  } catch (error) {
    if (isCloudSyncConfigured()) {
      throw error;
    }

    return localSnapshot;
  }
}

async function persistSnapshot(snapshot: AppSnapshot) {
  saveLocalSnapshot(snapshot);

  try {
    await ensureRemoteSnapshot(snapshot);
  } catch (error) {
    if (isCloudSyncConfigured()) {
      throw error;
    }
  }
}

export function isLoggedIn() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(LOGIN_KEY) === "true";
}

export function login() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(LOGIN_KEY, "true");
  const existing = readJson<CouponState | null>(COUPON_STATE_KEY, null);
  if (!existing) {
    writeJson(COUPON_STATE_KEY, createDefaultCouponState(getCoupons()));
  }
}

export function clearSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(LOGIN_KEY);
}

export function getCoupons(): Coupon[] {
  return readJson<Coupon[]>(CUSTOM_COUPONS_KEY, defaultCoupons);
}

export function getCouponState(couponList: Coupon[] = getCoupons()): CouponState {
  const defaults = createDefaultCouponState(couponList);
  const saved = readJson<CouponState>(COUPON_STATE_KEY, defaults);
  return { ...defaults, ...saved };
}

export function getSiteCopy(): SiteCopy {
  return mergeSiteCopy(readJson<Partial<SiteCopy>>(SITE_COPY_KEY, defaultSiteCopy));
}

export function saveCouponManagerState(couponList: Coupon[], state: CouponState, siteCopy: SiteCopy) {
  writeJson(CUSTOM_COUPONS_KEY, couponList);
  writeJson(COUPON_STATE_KEY, state);
  writeJson(SITE_COPY_KEY, siteCopy);
}

export async function saveCouponManagerStateAsync(couponList: Coupon[], state: CouponState, siteCopy: SiteCopy) {
  const current = await loadAppSnapshot();
  await persistSnapshot({
    ...current,
    coupons: couponList,
    couponState: state,
    siteCopy,
  });
}

export function resetCouponManagerState() {
  writeJson(CUSTOM_COUPONS_KEY, defaultCoupons);
  writeJson(COUPON_STATE_KEY, createDefaultCouponState(defaultCoupons));
  writeJson(SITE_COPY_KEY, defaultSiteCopy);
}

export async function resetCouponManagerStateAsync() {
  const current = await loadAppSnapshot();
  await persistSnapshot({
    ...createDefaultSnapshot(),
    records: current.records,
  });
}

export function getRecords(): RedemptionRecord[] {
  const records = readJson<Array<Partial<RedemptionRecord>>>(RECORDS_KEY, []);
  return records
    .map((record) => normalizeRecord(record))
    .filter((record): record is RedemptionRecord => Boolean(record));
}

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function hasPendingRequest(couponId: string) {
  return getRecords().some((record) => record.couponId === couponId && record.status === "待批准");
}

export function submitRedemptionRequest(coupon: Coupon): { ok: boolean; reason?: "empty" | "pending" } {
  const state = getCouponState();
  const remaining = state[coupon.id] ?? coupon.initialUses;
  if (remaining <= 0) {
    return { ok: false, reason: "empty" };
  }

  if (hasPendingRequest(coupon.id)) {
    return { ok: false, reason: "pending" };
  }

  const record: RedemptionRecord = {
    id: `${coupon.id}-${Date.now()}`,
    couponId: coupon.id,
    couponTitle: coupon.title,
    requestedAt: formatTimestamp(),
    status: "待批准",
  };

  writeJson(RECORDS_KEY, [record, ...getRecords()]);
  return { ok: true };
}

export async function submitRedemptionRequestAsync(coupon: Coupon): Promise<{ ok: boolean; reason?: "empty" | "pending" }> {
  const snapshot = await loadAppSnapshot();
  const remaining = snapshot.couponState[coupon.id] ?? coupon.initialUses;
  if (remaining <= 0) {
    return { ok: false, reason: "empty" };
  }

  if (snapshot.records.some((record) => record.couponId === coupon.id && record.status === "待批准")) {
    return { ok: false, reason: "pending" };
  }

  const record: RedemptionRecord = {
    id: `${coupon.id}-${Date.now()}`,
    couponId: coupon.id,
    couponTitle: coupon.title,
    requestedAt: formatTimestamp(),
    status: "待批准",
  };

  await persistSnapshot({
    ...snapshot,
    records: [record, ...snapshot.records],
  });
  return { ok: true };
}

export function approveRedemptionRequest(requestId: string): { ok: boolean; reason?: "missing" | "empty" } {
  const records = getRecords();
  const target = records.find((record) => record.id === requestId);
  if (!target) {
    return { ok: false, reason: "missing" };
  }

  const coupons = getCoupons();
  const coupon = coupons.find((item) => item.id === target.couponId);
  if (!coupon) {
    return { ok: false, reason: "missing" };
  }

  const state = getCouponState(coupons);
  const remaining = state[coupon.id] ?? coupon.initialUses;
  if (remaining <= 0) {
    return { ok: false, reason: "empty" };
  }

  const resolvedAt = formatTimestamp();
  writeJson(COUPON_STATE_KEY, {
    ...state,
    [coupon.id]: remaining - 1,
  });
  writeJson(
    RECORDS_KEY,
    records.map((record) => (record.id === requestId ? { ...record, status: "已批准" as const, resolvedAt } : record)),
  );
  return { ok: true };
}

export async function approveRedemptionRequestAsync(
  requestId: string,
): Promise<{ ok: boolean; reason?: "missing" | "empty" }> {
  const snapshot = await loadAppSnapshot();
  const target = snapshot.records.find((record) => record.id === requestId);
  if (!target) {
    return { ok: false, reason: "missing" };
  }

  const coupon = snapshot.coupons.find((item) => item.id === target.couponId);
  if (!coupon) {
    return { ok: false, reason: "missing" };
  }

  const remaining = snapshot.couponState[coupon.id] ?? coupon.initialUses;
  if (remaining <= 0) {
    return { ok: false, reason: "empty" };
  }

  const resolvedAt = formatTimestamp();
  await persistSnapshot({
    ...snapshot,
    couponState: {
      ...snapshot.couponState,
      [coupon.id]: remaining - 1,
    },
    records: snapshot.records.map((record) =>
      record.id === requestId ? { ...record, status: "已批准" as const, resolvedAt } : record,
    ),
  });
  return { ok: true };
}

export function rejectRedemptionRequest(requestId: string): { ok: boolean } {
  const records = getRecords();
  writeJson(
    RECORDS_KEY,
    records.map((record) =>
      record.id === requestId ? { ...record, status: "已婉拒" as const, resolvedAt: formatTimestamp() } : record,
    ),
  );
  return { ok: true };
}

export async function rejectRedemptionRequestAsync(requestId: string): Promise<{ ok: boolean }> {
  const snapshot = await loadAppSnapshot();
  await persistSnapshot({
    ...snapshot,
    records: snapshot.records.map((record) =>
      record.id === requestId ? { ...record, status: "已婉拒" as const, resolvedAt: formatTimestamp() } : record,
    ),
  });
  return { ok: true };
}
