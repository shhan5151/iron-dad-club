import { coupons, type Coupon } from "@/lib/coupons";

const LOGIN_KEY = "iron-dad-club.logged-in";
const COUPON_STATE_KEY = "iron-dad-club.coupons";
const RECORDS_KEY = "iron-dad-club.records";

export type CouponState = Record<string, number>;

export type RedemptionRecord = {
  id: string;
  couponId: string;
  couponTitle: string;
  redeemedAt: string;
  status: "已批准";
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function defaultCouponState(): CouponState {
  return Object.fromEntries(coupons.map((coupon) => [coupon.id, coupon.initialUses]));
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
    writeJson(COUPON_STATE_KEY, defaultCouponState());
  }
}

export function clearSession() {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(LOGIN_KEY);
}

export function getCouponState(): CouponState {
  const saved = readJson<CouponState>(COUPON_STATE_KEY, defaultCouponState());
  const defaults = defaultCouponState();
  return { ...defaults, ...saved };
}

export function getRecords(): RedemptionRecord[] {
  return readJson<RedemptionRecord[]>(RECORDS_KEY, []);
}

export function redeemCoupon(coupon: Coupon): { ok: boolean } {
  const state = getCouponState();
  const remaining = state[coupon.id] ?? coupon.initialUses;
  if (remaining <= 0) {
    return { ok: false };
  }

  const nextState = {
    ...state,
    [coupon.id]: remaining - 1,
  };
  const record: RedemptionRecord = {
    id: `${coupon.id}-${Date.now()}`,
    couponId: coupon.id,
    couponTitle: coupon.title,
    redeemedAt: new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date()),
    status: "已批准",
  };

  writeJson(COUPON_STATE_KEY, nextState);
  writeJson(RECORDS_KEY, [record, ...getRecords()]);
  return { ok: true };
}
