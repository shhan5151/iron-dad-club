"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Coupon } from "@/lib/coupons";
import { clearSession, getCoupons, getCouponState, isLoggedIn, login, type CouponState } from "@/lib/storage";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

const PASSWORD = "ELARA0612";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<CouponState>({});
  const [couponList, setCouponList] = useState<Coupon[]>([]);

  useEffect(() => {
    const savedCoupons = getCoupons();
    setAuthenticated(isLoggedIn());
    setCouponList(savedCoupons);
    setState(getCouponState(savedCoupons));
    setReady(true);
  }, []);

  const totalRemaining = useMemo(
    () => couponList.reduce((total, coupon) => total + (state[coupon.id] ?? coupon.initialUses), 0),
    [couponList, state],
  );

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.trim().toUpperCase() !== PASSWORD) {
      setError("密碼不正確。請輸入 Elara 的通行代碼。");
      return;
    }
    login();
    const savedCoupons = getCoupons();
    setAuthenticated(true);
    setCouponList(savedCoupons);
    setState(getCouponState(savedCoupons));
  }

  function handleLogout() {
    clearSession();
    setAuthenticated(false);
    setPassword("");
  }

  if (!ready) {
    return <main className="min-h-dvh bg-iron text-cream" />;
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh overflow-hidden bg-iron text-cream">
        <RegisterServiceWorker />
        <section className="relative flex min-h-dvh flex-col justify-between px-5 py-7">
          <div className="pass-grid" />
          <div className="relative z-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="label-text">MEMBER ACCESS</p>
                <h1 className="mt-2 text-4xl font-black tracking-[0.1em] text-gold">DADDY&apos;S FREE TIME TOKEN</h1>
              </div>
              <div className="bib-number">40</div>
            </div>

            <div className="premium-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-text">Being a dad doesn&apos;t mean giving up being you.</p>
                  <h2 className="mt-3 text-2xl font-extrabold text-white">Davin 專屬通行證</h2>
                </div>
                <span className="status-pill">ELARA READY</span>
              </div>
              <div className="my-5 h-px bg-gold/25" />
              <div className="space-y-3 text-sm leading-7 text-cream/78">
                <p>有些時間屬於家庭，有些時間屬於夢想。</p>
                <p>
                  而這些 Token，是 Hannah 與 Elara 預留給你的自由額度。當你想騎車、比賽、放空，或只是想做回 Davin 時，請放心使用。
                </p>
                <p>因為成為爸爸，不代表要放棄自己。 ❤️</p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <label className="block">
                  <span className="label-text">PASSCODE</span>
                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    type="password"
                    autoComplete="current-password"
                    placeholder="輸入專屬密碼"
                    className="mt-2 w-full rounded-xl border border-gold/25 bg-black/35 px-4 py-4 text-base font-semibold text-white outline-none ring-gold/35 transition focus:border-gold focus:ring-4"
                  />
                </label>
                {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
                <button className="primary-button w-full" type="submit">
                  進入券包
                </button>
              </form>
            </div>
          </div>

          <p className="relative z-10 pb-2 text-center text-xs font-semibold uppercase tracking-[0.28em] text-cream/45">
            Endurance. Freedom. Fatherhood.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-iron text-cream">
      <RegisterServiceWorker />
      <section className="mx-auto min-h-dvh max-w-md px-4 pb-24 pt-5">
        <header className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="label-text">Being a dad doesn&apos;t mean giving up being you.</p>
              <h1 className="mt-2 text-4xl font-black tracking-[0.1em] text-gold">DADDY&apos;S FREE TIME TOKEN</h1>
            </div>
            <button className="ghost-button shrink-0" onClick={handleLogout} type="button">
              登出
            </button>
          </div>

          <div className="premium-card overflow-hidden p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-text">ACTIVE MEMBERSHIP</p>
                <h2 className="mt-2 text-2xl font-black text-white">Davin #40</h2>
              </div>
              <div className="bib-number">140.6</div>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-7 text-cream/78">
              <p>有些時間屬於家庭，有些時間屬於夢想。</p>
              <p>
                而這些 Token，是 Hannah 與 Elara 預留給你的自由額度。當你想騎車、比賽、放空，或只是想做回 Davin 時，請放心使用。
              </p>
              <p>因為成為爸爸，不代表要放棄自己。 ❤️</p>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="metric-box">
                <span>{couponList.length}</span>
                <p>券種</p>
              </div>
              <div className="metric-box">
                <span>{totalRemaining}</span>
                <p>剩餘</p>
              </div>
              <div className="metric-box">
                <span>2026</span>
                <p>啟用</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">券包</h2>
          <Link className="text-sm font-bold text-gold underline-offset-4 hover:underline" href="/records">
            兌換紀錄
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {couponList.map((coupon) => {
            const remaining = state[coupon.id] ?? coupon.initialUses;
            return (
              <Link className="coupon-row" href={`/pass/${coupon.id}`} key={coupon.id}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="race-chip">{coupon.code}</span>
                    <span className="text-xs font-bold text-cream/45">{coupon.category}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-black text-white">{coupon.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-cream/65">{coupon.effect}</p>
                </div>
                <div className="remaining-badge">
                  <span>{remaining}</span>
                  <p>剩餘</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
