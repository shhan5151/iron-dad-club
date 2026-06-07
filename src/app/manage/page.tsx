"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Coupon } from "@/lib/coupons";
import {
  getCoupons,
  getCouponState,
  resetCouponManagerState,
  saveCouponManagerState,
  type CouponState,
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
    title: item.title.trim() || "未命名券",
    effect: item.effect.trim(),
    redeemableFor: toLines(item.redeemableForText),
    usableFor: toLines(item.usableForText),
    rules: toLines(item.rulesText),
    note: item.note?.trim(),
    validity: item.validity?.trim(),
    initialUses: Math.max(0, Number(item.initialUses) || 0),
  };
}

export default function ManagePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<EditableCoupon[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const authed = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
    setAdminAuthed(authed);

    if (authed) {
      const coupons = getCoupons();
      const state = getCouponState(coupons);
      setItems(coupons.map((coupon) => toEditable(coupon, state)));
    }
    setReady(true);
  }, [router]);

  function handleAdminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.trim().toUpperCase() !== ADMIN_PASSWORD) {
      setError("管理密碼不正確。");
      return;
    }

    window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
    const coupons = getCoupons();
    const state = getCouponState(coupons);
    setItems(coupons.map((coupon) => toEditable(coupon, state)));
    setAdminAuthed(true);
    setError("");
  }

  function updateItem(id: string, patch: Partial<EditableCoupon>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setMessage("");
  }

  function saveChanges() {
    const nextCoupons = items.map(toCoupon);
    const nextState = Object.fromEntries(
      items.map((item) => [item.id, Math.max(0, Number(item.remaining) || 0)]),
    );

    saveCouponManagerState(nextCoupons, nextState);
    setItems(nextCoupons.map((coupon) => toEditable(coupon, nextState)));
    setMessage("已儲存。Davin 的自由模式規格已更新。");
  }

  function resetDefaults() {
    resetCouponManagerState();
    const coupons = getCoupons();
    const state = getCouponState(coupons);
    setItems(coupons.map((coupon) => toEditable(coupon, state)));
    setMessage("已還原預設券包內容與次數。");
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
            <h1 className="mt-3 text-3xl font-black text-white">管理券包</h1>
            <p className="mt-3 text-sm leading-7 text-cream/70">
              這裡是隱藏管理頁，不會出現在 Davin 的券包首頁。
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
                進入管理
              </button>
              <Link className="ghost-button w-full justify-center py-4" href="/">
                返回 Davin 券包
              </Link>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-iron text-cream">
      <section className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-5">
        <nav className="mb-5 flex items-center justify-between">
          <Link className="ghost-button" href="/">
            返回券包
          </Link>
          <p className="label-text">PASS MANAGER</p>
        </nav>

        <header className="premium-card p-5">
          <p className="label-text">IRON DAD CLUB</p>
          <h1 className="mt-3 text-3xl font-black text-white">管理券包</h1>
          <p className="mt-3 text-sm leading-7 text-cream/70">
            可調整每張券的文字、規則、備註、期限與剩餘次數。每個多行欄位一行代表一個項目。
          </p>
        </header>

        {message ? (
          <p className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm font-bold text-gold">
            {message}
          </p>
        ) : null}

        <div className="mt-5 space-y-5">
          {items.map((item) => (
            <article className="premium-card p-5" key={item.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-text">{item.code}</p>
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
            <button className="ghost-button justify-center py-4" onClick={resetDefaults} type="button">
              還原預設
            </button>
            <button className="primary-button" onClick={saveChanges} type="button">
              儲存修改
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
