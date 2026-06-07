"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Coupon } from "@/lib/coupons";
import { clearSession, getCoupons, getCouponState, isLoggedIn, login, type CouponState } from "@/lib/storage";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { birthdayDinnerPhoto } from "@/lib/photos/birthdayDinner";
import { davinRacePortraitPhoto } from "@/lib/photos/davinRacePortrait";
import { elaraUltrasoundPhoto } from "@/lib/photos/elaraUltrasound";

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
          <div className="absolute inset-0">
            <Image
              src={davinRacePortraitPhoto}
              alt="Davin race portrait"
              fill
              priority
              unoptimized
              className="object-cover object-[center_24%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,11,16,0.2)_0%,rgba(10,11,16,0.72)_42%,rgba(10,11,16,0.96)_100%)]" />
          </div>
          <div className="pass-grid" />

          <div className="relative z-10">
            <div className="mb-8 flex items-center justify-between gap-4">
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
                <div className="relative h-[72px] w-[72px] overflow-hidden rounded-2xl border border-gold/25">
                  <Image
                    src={elaraUltrasoundPhoto}
                    alt="Elara ultrasound"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="my-5 h-px bg-gold/25" />

              <div className="space-y-3 text-sm leading-7 text-cream/78">
                <p>有些時間屬於家庭，有些時間屬於夢想。</p>
                <p>而這些 Token，是 Hannah 與 Elara 預留給你的自由額度。當你想騎車、比賽、放空，或只是想做回 Davin 時，請放心使用。</p>
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
            <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src={birthdayDinnerPhoto}
                alt="Davin and Hannah gender reveal dinner"
                fill
                priority
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,11,16,0.04)_18%,rgba(10,11,16,0.86)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
                <div>
                  <p className="label-text text-cream/80">ACTIVE MEMBERSHIP</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Davin #40</h2>
                </div>
                <div className="bib-number">140.6</div>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-7 text-cream/78">
              <p>有些時間屬於家庭，有些時間屬於夢想。</p>
              <p>而這些 Token，是 Hannah 與 Elara 預留給你的自由額度。當你想騎車、比賽、放空，或只是想做回 Davin 時，請放心使用。</p>
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

        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">我們的紀念</h2>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold/80">FAMILY CREW</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              <div className="relative aspect-[4/5]">
                <Image
                  src={davinRacePortraitPhoto}
                  alt="Davin race portrait"
                  fill
                  unoptimized
                  className="object-cover object-[center_20%]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,11,16,0.05)_50%,rgba(10,11,16,0.84)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="label-text">Race Mode</p>
                  <p className="mt-1 text-xs leading-5 text-cream/82">就算成為爸爸，也還是那個會衝線、會訓練、會拼到底的 Davin。</p>
                </div>
              </div>
            </article>

            <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              <div className="relative aspect-[4/5]">
                <Image
                  src={elaraUltrasoundPhoto}
                  alt="Elara ultrasound"
                  fill
                  unoptimized
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,11,16,0.05)_50%,rgba(10,11,16,0.84)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="label-text">Elara</p>
                  <p className="mt-1 text-xs leading-5 text-cream/82">自由不是離開家庭，而是帶著愛繼續做自己。</p>
                </div>
              </div>
            </article>
          </div>
        </section>

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
