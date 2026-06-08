"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteCopy } from "@/lib/copy";
import type { Coupon } from "@/lib/coupons";
import {
  approveRedemptionRequestAsync,
  getCouponState,
  getCoupons,
  getRecords,
  getSiteCopy,
  isCloudSyncConfigured,
  loadAppSnapshot,
  rejectRedemptionRequestAsync,
  resetCouponManagerStateAsync,
  saveCouponManagerStateAsync,
  type CouponState,
  type RedemptionRecord,
} from "@/lib/storage";

const ADMIN_PASSWORD = "HANNAH0612";
const ADMIN_SESSION_KEY = "iron-dad-club.admin";

type EditableCoupon = Coupon & {
  remaining: number;
  redeemableForText: string;
  usableForText: string;
  rulesText: string;
};

function toText(lines?: string[]) {
  return lines?.join("\n") ?? "";
}

function toLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function toEditable(coupon: Coupon, state: CouponState): EditableCoupon {
  return {
    ...coupon,
    remaining: state[coupon.id] ?? coupon.initialUses,
    redeemableForText: toText(coupon.redeemableFor),
    usableForText: toText(coupon.usableFor),
    rulesText: toText(coupon.rules),
  };
}

function toCoupon(item: EditableCoupon): Coupon {
  return {
    id: item.id,
    code: item.code.trim(),
    category: item.category.trim(),
    title: item.title.trim() || "未命名票券",
    effect: item.effect.trim(),
    redeemableFor: toLines(item.redeemableForText),
    usableFor: toLines(item.usableForText),
    rules: toLines(item.rulesText),
    note: item.note?.trim(),
    validity: item.validity?.trim(),
    initialUses: Math.max(0, Number(item.initialUses) || 0),
  };
}

function moveInArray<T>(list: T[], fromIndex: number, toIndex: number) {
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function ManagePage() {
  const [ready, setReady] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<EditableCoupon[]>([]);
  const [siteCopy, setSiteCopy] = useState<SiteCopy>(getSiteCopy());
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState<RedemptionRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const authed = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
    setAdminAuthed(authed);

    if (authed) {
      loadManagerData();
    }
    setReady(true);
  }, []);

  async function loadManagerData() {
    try {
      const snapshot = await loadAppSnapshot();
      setItems(snapshot.coupons.map((coupon) => toEditable(coupon, snapshot.couponState)));
      setRecords(snapshot.records);
      setSiteCopy(snapshot.siteCopy);
    } catch {
      const coupons = getCoupons();
      const state = getCouponState(coupons);
      setItems(coupons.map((coupon) => toEditable(coupon, state)));
      setRecords(getRecords());
      setSiteCopy(getSiteCopy());
      setMessage("雲端同步暫時讀取失敗，現在顯示本機資料。");
    }
  }

  function handleAdminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.trim().toUpperCase() !== ADMIN_PASSWORD) {
      setError("管理密碼不正確。");
      return;
    }

    window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
    void loadManagerData();
    setAdminAuthed(true);
    setError("");
  }

  function updateItem(id: string, patch: Partial<EditableCoupon>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setMessage("");
  }

  function moveItem(id: string, direction: "up" | "down") {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index === -1) {
        return current;
      }
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      return moveInArray(current, index, targetIndex);
    });
    setMessage("");
  }

  function updateBeforeLogin(patch: Partial<SiteCopy["beforeLogin"]>) {
    setSiteCopy((current) => ({
      ...current,
      beforeLogin: {
        ...current.beforeLogin,
        ...patch,
      },
    }));
    setMessage("");
  }

  function updateAfterLogin(patch: Partial<SiteCopy["afterLogin"]>) {
    setSiteCopy((current) => ({
      ...current,
      afterLogin: {
        ...current.afterLogin,
        ...patch,
      },
    }));
    setMessage("");
  }

  async function saveChanges() {
    setSaving(true);
    const nextCoupons = items.map(toCoupon);
    const nextState = Object.fromEntries(items.map((item) => [item.id, Math.max(0, Number(item.remaining) || 0)]));

    try {
      await saveCouponManagerStateAsync(nextCoupons, nextState, siteCopy);
      setItems(nextCoupons.map((coupon) => toEditable(coupon, nextState)));
      setMessage(
        isCloudSyncConfigured() ? "已儲存到雲端。Davin 的手機重新整理後會同步更新。" : "已儲存在這台裝置。",
      );
    } catch {
      setMessage("儲存失敗，請檢查 Supabase 設定或網路狀態。");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    setSaving(true);
    try {
      await resetCouponManagerStateAsync();
      await loadManagerData();
      setMessage("已還原成預設內容與順序。");
    } catch {
      setMessage("還原失敗，請檢查 Supabase 設定或網路狀態。");
    } finally {
      setSaving(false);
    }
  }

  async function approveRequest(requestId: string) {
    setSaving(true);
    const result = await approveRedemptionRequestAsync(requestId);
    if (!result.ok) {
      setMessage("批准失敗，可能是該票券次數已用完或資料不同步。");
      setSaving(false);
      return;
    }
    await loadManagerData();
    setSaving(false);
    setMessage("已批准申請，票券次數也同步扣除了。");
  }

  async function rejectRequest(requestId: string) {
    setSaving(true);
    await rejectRedemptionRequestAsync(requestId);
    await loadManagerData();
    setSaving(false);
    setMessage("已婉拒這次申請。");
  }

  if (!ready) {
    return <main className="min-h-dvh bg-iron text-cream" />;
  }

  if (!adminAuthed) {
    return (
      <main className="min-h-dvh bg-iron text-cream">
        <section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8">
          <div className="premium-card p-5">
            <p className="label-text">HANNAH CONTROL</p>
            <h1 className="mt-3 text-3xl font-black text-white">後台管理</h1>
            <p className="mt-3 text-sm leading-7 text-cream/70">
              這裡可以調整 Davin 看到的票券內容、前台文案與申請批准狀態。
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleAdminLogin}>
              <label className="field-label">
                <span>管理密碼</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="輸入 Hannah 管理密碼"
                />
              </label>
              {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
              <button className="primary-button w-full" type="submit">
                進入後台
              </button>
              <Link className="ghost-button w-full justify-center py-4" href="/">
                回到 Davin 前台
              </Link>
            </form>
          </div>
        </section>
      </main>
    );
  }

  const pendingRequests = records.filter((record) => record.status === "待批准");

  return (
    <main className="min-h-dvh bg-iron text-cream">
      <section className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-5">
        <nav className="mb-5 flex items-center justify-between">
          <Link className="ghost-button" href="/">
            回到前台
          </Link>
          <p className="label-text">PASS MANAGER</p>
        </nav>

        <header className="premium-card p-5">
          <p className="label-text">IRON DAD CLUB</p>
          <h1 className="mt-3 text-3xl font-black text-white">後台管理</h1>
          <p className="mt-3 text-sm leading-7 text-cream/70">
            你可以在這裡改票券內容、調整票券順序，還有修改登入前與登入後的前台文案。
          </p>
        </header>

        {message ? (
          <p className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm font-bold text-gold">
            {message}
          </p>
        ) : null}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-white">待批准申請</h2>
            <span className="text-sm font-bold text-gold">{pendingRequests.length} 筆</span>
          </div>

          <div className="space-y-3">
            {pendingRequests.length ? (
              pendingRequests.map((record) => (
                <article className="premium-card p-5" key={record.id}>
                  <p className="label-text">REQUEST</p>
                  <h3 className="mt-2 text-xl font-black text-white">{record.couponTitle}</h3>
                  <p className="mt-2 text-sm text-cream/65">申請時間：{record.requestedAt}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      className="ghost-button justify-center py-4 disabled:opacity-40"
                      disabled={saving}
                      onClick={() => rejectRequest(record.id)}
                      type="button"
                    >
                      婉拒
                    </button>
                    <button className="primary-button disabled:opacity-40" disabled={saving} onClick={() => approveRequest(record.id)} type="button">
                      批准
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-cream/60">
                目前沒有新的申請在等待你處理。
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 premium-card p-5">
          <p className="label-text">FRONT COPY</p>
          <h2 className="mt-2 text-2xl font-black text-white">登入前文案</h2>
          <div className="mt-5 grid gap-4">
            <label className="field-label">
              <span>主標題</span>
              <input
                value={siteCopy.beforeLogin.title}
                onChange={(event) => updateBeforeLogin({ title: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>附標</span>
              <input
                value={siteCopy.beforeLogin.subtitle}
                onChange={(event) => updateBeforeLogin({ subtitle: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>卡片標題</span>
              <input
                value={siteCopy.beforeLogin.cardTitle}
                onChange={(event) => updateBeforeLogin({ cardTitle: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>文案</span>
              <textarea
                rows={7}
                value={siteCopy.beforeLogin.description}
                onChange={(event) => updateBeforeLogin({ description: event.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="mt-5 premium-card p-5">
          <p className="label-text">WALLET COPY</p>
          <h2 className="mt-2 text-2xl font-black text-white">登入後文案</h2>
          <div className="mt-5 grid gap-4">
            <label className="field-label">
              <span>主標題</span>
              <input
                value={siteCopy.afterLogin.title}
                onChange={(event) => updateAfterLogin({ title: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>附標</span>
              <input
                value={siteCopy.afterLogin.subtitle}
                onChange={(event) => updateAfterLogin({ subtitle: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>照片下方卡片小標</span>
              <input
                value={siteCopy.afterLogin.memoryEyebrow}
                onChange={(event) => updateAfterLogin({ memoryEyebrow: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>照片下方卡片標題</span>
              <input
                value={siteCopy.afterLogin.memoryTitle}
                onChange={(event) => updateAfterLogin({ memoryTitle: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>照片下方卡片文案</span>
              <textarea
                rows={5}
                value={siteCopy.afterLogin.memoryDescription}
                onChange={(event) => updateAfterLogin({ memoryDescription: event.target.value })}
              />
            </label>
          </div>
        </section>

        <div className="mt-5 space-y-5">
          {items.map((item, index) => (
            <article className="premium-card p-5" key={item.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-text">
                    #{index + 1} · {item.code}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">{item.title}</h2>
                </div>
                <label className="small-number-field">
                  <span>剩餘</span>
                  <input
                    min="0"
                    type="number"
                    value={item.remaining}
                    onChange={(event) => updateItem(item.id, { remaining: Number(event.target.value) })}
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="ghost-button justify-center py-3 disabled:opacity-35"
                  disabled={index === 0}
                  onClick={() => moveItem(item.id, "up")}
                  type="button"
                >
                  往上移
                </button>
                <button
                  className="ghost-button justify-center py-3 disabled:opacity-35"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(item.id, "down")}
                  type="button"
                >
                  往下移
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="field-label">
                  <span>券名</span>
                  <input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="field-label">
                    <span>代碼</span>
                    <input value={item.code} onChange={(event) => updateItem(item.id, { code: event.target.value })} />
                  </label>
                  <label className="field-label">
                    <span>分類</span>
                    <input
                      value={item.category}
                      onChange={(event) => updateItem(item.id, { category: event.target.value })}
                    />
                  </label>
                </div>

                <label className="field-label">
                  <span>效力</span>
                  <textarea
                    rows={3}
                    value={item.effect}
                    onChange={(event) => updateItem(item.id, { effect: event.target.value })}
                  />
                </label>

                <label className="field-label">
                  <span>可兌換</span>
                  <textarea
                    rows={3}
                    value={item.redeemableForText}
                    onChange={(event) => updateItem(item.id, { redeemableForText: event.target.value })}
                  />
                </label>

                <label className="field-label">
                  <span>可用於</span>
                  <textarea
                    rows={3}
                    value={item.usableForText}
                    onChange={(event) => updateItem(item.id, { usableForText: event.target.value })}
                  />
                </label>

                <label className="field-label">
                  <span>使用規則</span>
                  <textarea
                    rows={3}
                    value={item.rulesText}
                    onChange={(event) => updateItem(item.id, { rulesText: event.target.value })}
                  />
                </label>

                <label className="field-label">
                  <span>備註</span>
                  <input value={item.note ?? ""} onChange={(event) => updateItem(item.id, { note: event.target.value })} />
                </label>

                <label className="field-label">
                  <span>有效期限</span>
                  <input
                    value={item.validity ?? ""}
                    onChange={(event) => updateItem(item.id, { validity: event.target.value })}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0b10]/92 p-4 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
            <button className="ghost-button justify-center py-4 disabled:opacity-40" disabled={saving} onClick={resetDefaults} type="button">
              還原預設
            </button>
            <button className="primary-button disabled:opacity-40" disabled={saving} onClick={saveChanges} type="button">
              {saving ? "儲存中" : "儲存變更"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
