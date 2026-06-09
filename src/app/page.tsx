"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SiteCopy } from "@/lib/copy";
import type { Coupon } from "@/lib/coupons";
import type { SiteImages } from "@/lib/media";
import {
  clearSession,
  getCouponState,
  getCoupons,
  getSiteCopy,
  getSiteImages,
  isLoggedIn,
  loadAppSnapshot,
  login,
  type CouponState,
} from "@/lib/storage";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

const PASSWORD = "ELARA0612";

function renderParagraphs(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (
      <p key={line} className="text-sm leading-7 text-cream/78">
        {line}
      </p>
    ));
}

function renderCardParagraphs(text: string) {
  return text
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => (
      <p key={block} className="whitespace-pre-line text-sm leading-8 text-cream/78">
        {block}
      </p>
    ));
}

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<CouponState>({});
  const [couponList, setCouponList] = useState<Coupon[]>([]);
  const [siteCopy, setSiteCopy] = useState<SiteCopy>(getSiteCopy());
  const [siteImages, setSiteImages] = useState<SiteImages>(getSiteImages());

  useEffect(() => {
    async function refreshHomeData() {
      const snapshot = await loadAppSnapshot();
      setAuthenticated(isLoggedIn());
      setCouponList(snapshot.coupons);
      setState(snapshot.couponState);
      setSiteCopy(snapshot.siteCopy);
      setSiteImages(snapshot.siteImages);
      setReady(true);
    }

    refreshHomeData().catch(() => {
      const savedCoupons = getCoupons();
      setAuthenticated(isLoggedIn());
      setCouponList(savedCoupons);
      setState(getCouponState(savedCoupons));
      setSiteCopy(getSiteCopy());
      setSiteImages(getSiteImages());
      setReady(true);
    });

    const handleFocusRefresh = () => {
      void refreshHomeData().catch(() => undefined);
    };

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleFocusRefresh);

    return () => {
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleFocusRefresh);
    };
  }, []);

  const totalRemaining = useMemo(
    () => couponList.reduce((total, coupon) => total + (state[coupon.id] ?? coupon.initialUses), 0),
    [couponList, state],
  );

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.trim().toUpperCase() !== PASSWORD) {
      setError("密碼不正確，請輸入 Elara 的通關密碼。");
      return;
    }

    login();
    setAuthenticated(true);
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
              src={siteImages.beforeLoginBackground}
              alt="Davin riding along the coast"
              fill
              priority
              unoptimized
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,11,16,0.28)_0%,rgba(10,11,16,0.7)_38%,rgba(10,11,16,0.94)_100%)]" />
          </div>
          <div className="pass-grid" />

          <div className="relative z-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="label-text">MEMBER ACCESS</p>
                <h1 className="mt-2 text-4xl font-black tracking-[0.1em] text-gold">{siteCopy.beforeLogin.title}</h1>
              </div>
              <div className="bib-number">40</div>
            </div>

            <div className="premium-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="label-text">{siteCopy.beforeLogin.subtitle}</p>
                  <h2 className="mt-3 text-2xl font-extrabold text-white">{siteCopy.beforeLogin.cardTitle}</h2>
                </div>
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gold/30 bg-black/30 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
                  <Image
                    src={siteImages.beforeLoginProfile}
                    alt="Davin portrait"
                    fill
                    priority
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="my-5 h-px bg-gold/25" />
              <div className="space-y-3">{renderParagraphs(siteCopy.beforeLogin.description)}</div>

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
                    placeholder="輸入生日通關密碼"
                    className="mt-2 w-full rounded-xl border border-gold/25 bg-black/35 px-4 py-4 text-base font-semibold text-white outline-none ring-gold/35 transition focus:border-gold focus:ring-4"
                  />
                </label>
                {error ? <p className="text-sm font-semibold text-red-300">{error}</p> : null}
                <button className="primary-button w-full" type="submit">
                  進入票券包
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
              <p className="label-text">{siteCopy.afterLogin.subtitle}</p>
              <h1 className="mt-2 text-4xl font-black tracking-[0.1em] text-gold">{siteCopy.afterLogin.title}</h1>
            </div>
            <button className="ghost-button shrink-0" onClick={handleLogout} type="button">
              登出
            </button>
          </div>

          <div className="premium-card overflow-hidden p-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-[#050608] p-2">
              <Image
                src={siteImages.afterLoginMemoryCollage}
                alt="Davin and Hannah memory collage"
                fill
                priority
                unoptimized
                className="object-contain"
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="relative aspect-[4/3] overflow-hidden border-b border-white/10 bg-black/20">
                <Image
                  src={siteImages.afterLoginCard}
                  alt="Hannah and Davin"
                  fill
                  unoptimized
                  className="object-cover object-[center_78%]"
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(8,9,14,0)_0%,rgba(8,9,14,0.72)_100%)]" />
              </div>
              <div className="p-4">
                <p className="label-text text-cream/70">{siteCopy.afterLogin.memoryEyebrow}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{siteCopy.afterLogin.memoryTitle}</h2>
                <div className="mt-4 space-y-4">{renderCardParagraphs(siteCopy.afterLogin.memoryDescription)}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="grid gap-4 sm:grid-cols-[0.95fr_1.05fr] sm:items-center">
                <div className="relative aspect-[5/4] overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                  <Image
                    src={siteImages.afterLoginUltrasound}
                    alt="Elara ultrasound"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="label-text text-cream/70">{siteCopy.afterLogin.ultrasoundEyebrow}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{siteCopy.afterLogin.ultrasoundTitle}</h2>
                  <p className="mt-3 text-sm leading-7 text-cream/75">{siteCopy.afterLogin.ultrasoundDescription}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="metric-box">
                <span>{couponList.length}</span>
                <p>票券</p>
              </div>
              <div className="metric-box">
                <span>{totalRemaining}</span>
                <p>剩餘</p>
              </div>
              <div className="metric-box">
                <span>2026</span>
                <p>版本</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">票券列表</h2>
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
