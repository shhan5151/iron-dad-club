import { defaultSiteCopy, type SiteCopy } from "@/lib/copy";
import { defaultCoupons, type Coupon } from "@/lib/coupons";

const LOGIN_KEY = "iron-dad-club.logged-in";
const COUPON_STATE_KEY = "iron-dad-club.coupons";
const CUSTOM_COUPONS_KEY = "iron-dad-club.custom-coupons";
const RECORDS_KEY = "iron-dad-club.records";
const SITE_COPY_KEY = "iron-dad-club.site-copy";

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CLOUD_STATE_ID = "iron-dad-club";
const CLOUD_TABLE = "app_state";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function defaultCouponState(couponList: Coupon[] = defaultCoupons): CouponState {
  return Object.fromEntries(couponList.map((coupon) => [coupon.id, coupon.initialUses]));
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

function createDefaultSnapshot(): AppSnapshot {
  return {
    coupons: defaultCoupons,
    couponState: defaultCouponState(defaultCoupons),
    records: [],
    siteCopy: defaultSiteCopy,
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

function mergeSnapshot(partial?: Partial<AppSnapshot>): AppSnapshot {
  const coupons = partial?.coupons?.length ? partial.coupons : defaultCoupons;
  return {
    coupons,
    couponState: {
      ...defaultCouponState(coupons),
      ...partial?.couponState,
    },
    records: partial?.records ?? [],
    siteCopy: mergeSiteCopy(partial?.siteCopy),
  };
}

async function readResponseError(response: Response, fallback: string) {
  const responseText = (await response.text()).trim();
  if (!responseText) {
    return `${fallback} (${response.status})`;
  }

  return `${fallback} (${response.status}): ${responseText}`;
}

export function isCloudSyncConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function fetchCloudSnapshot(): Promise<AppSnapshot | null> {
  if (!isCloudSyncConfigured()) {
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${CLOUD_TABLE}?id=eq.${CLOUD_STATE_ID}&select=payload`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readResponseError(response, "Cloud state could not be loaded"));
  }

  const rows = (await response.json()) as Array<{ payload?: Partial<AppSnapshot> }>;
  return rows[0]?.payload ? mergeSnapshot(rows[0].payload) : null;
}

async function saveCloudSnapshot(snapshot: AppSnapshot) {
  if (!isCloudSyncConfigured()) {
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${CLOUD_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
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
    throw new Error(await readResponseError(response, "Cloud state could not be saved"));
  }
}

export async function loadAppSnapshot(): Promise<AppSnapshot> {
  if (!isCloudSyncConfigured()) {
    return getLocalSnapshot();
  }

  const snapshot = await fetchCloudSnapshot();
  const nextSnapshot = snapshot ?? getLocalSnapshot();
  if (!snapshot) {
    await saveCloudSnapshot(nextSnapshot);
  }
  saveLocalSnapshot(nextSnapshot);
  return nextSnapshot;
}

async function persistSnapshot(snapshot: AppSnapshot) {
  saveLocalSnapshot(snapshot);
  await saveCloudSnapshot(snapshot);
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
    writeJson(COUPON_STATE_KEY, defaultCouponState(getCoupons()));
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
  const saved = readJson<CouponState>(COUPON_STATE_KEY, defaultCouponState(couponList));
  const defaults = defaultCouponState(couponList);
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
  writeJson(COUPON_STATE_KEY, defaultCouponState(defaultCoupons));
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
  return readJson<RedemptionRecord[]>(RECORDS_KEY, []);
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

  const nextState = {
    ...state,
    [coupon.id]: remaining - 1,
  };
  const resolvedAt = formatTimestamp();
  const nextRecords = records.map((record) =>
    record.id === requestId ? { ...record, status: "已批准" as const, resolvedAt } : record,
  );

  writeJson(COUPON_STATE_KEY, nextState);
  writeJson(RECORDS_KEY, nextRecords);
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
  const nextRecords = records.map((record) =>
    record.id === requestId ? { ...record, status: "已婉拒" as const, resolvedAt: formatTimestamp() } : record,
  );
  writeJson(RECORDS_KEY, nextRecords);
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
