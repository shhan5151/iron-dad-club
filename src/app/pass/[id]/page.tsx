"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { coupons } from "@/lib/coupons";
import {
  getCouponState,
  getRecords,
  isLoggedIn,
  redeemCoupon,
  type CouponState,
  type RedemptionRecord,
} from "@/lib/storage";

export default function PassDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const coupon = useMemo(() => coupons.find((item) => item.id === params.id), [params.id]);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<CouponState>({});
  const [records, setRecords] = useState<RedemptionRecord[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/");
      return;
    }
    setState(getCouponState());
    setRecords(getRecords());
    setReady(true);
  }, [router]);

  if (!coupon) {
    notFound();
  }

  const remaining = state[coupon.id] ?? coupon.initialUses;
  const relatedRecords = records.filter((record) => record.couponId === coupon.id);

  function handleRedeem() {
    if (!coupon) {
      return;
    }
    const result = redeemCoupon(coupon);
    if (!result.ok) {
      setState(getCouponState());
      return;
    }
    setState(getCouponState());
    setRecords(getRecords());
    setConfirming(false);
    setSuccess("Hannah 已批准。Elara 今日由媽媽接管。Davin 可以安心出發。");
  }

  if (!ready) {
    return <main className="min-h-dvh bg-iron text-cream" />;
  }

  return (
    <main className="min-h-dvh bg-iron text-cream">
      <section className="mx-auto min-h-dvh max-w-md px-4 pb-24 pt-5">
        <nav className="mb-5 flex items-center justify-between">
          <Link className="ghost-button" href="/">
            返回
          </Link>
          <Link className="text-sm font-bold text-gold underline-offset-4 hover:underline" href="/records">
            兌換紀錄
          </Link>
        </nav>

        <article className="premium-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-text">{coupon.category}</p>
              <h1 className="mt-3 text-3xl font-black text-white">{coupon.title}</h1>
            </div>
            <div className="remaining-badge large">
              <span>{remaining}</span>
              <p>剩餘</p>
            </div>
          </div>

          <div className="my-5 border-t border-dashed border-gold/35" />

          <section>
            <p className="label-text">效力</p>
            <p className="mt-2 text-base font-semibold leading-8 text-cream/86">{coupon.effect}</p>
          </section>

          {coupon.redeemableFor?.length ? (
            <section className="mt-5">
              <p className="label-text">可兌換</p>
              <ul className="mt-3 space-y-2">
                {coupon.redeemableFor.map((item) => (
                  <li className="rule-item" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {coupon.usableFor?.length ? (
            <section className="mt-5">
              <p className="label-text">可用於</p>
              <ul className="mt-3 space-y-2">
                {coupon.usableFor.map((item) => (
                  <li className="rule-item" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {coupon.rules?.length ? (
            <section className="mt-5">
              <p className="label-text">使用規則</p>
              <ul className="mt-3 space-y-2">
                {coupon.rules.map((item) => (
                  <li className="rule-item muted" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-5 grid gap-3">
            {coupon.validity ? (
              <div className="info-strip">
                <span>使用期限</span>
                <strong>{coupon.validity}</strong>
              </div>
            ) : null}
            {coupon.note ? (
              <div className="info-strip">
                <span>備註</span>
                <strong>{coupon.note}</strong>
              </div>
            ) : null}
          </div>

          {success ? <p className="mt-5 rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm font-bold leading-6 text-gold">{success}</p> : null}

          <button
            className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-cream/35"
            disabled={remaining <= 0}
            onClick={() => setConfirming(true)}
            type="button"
          >
            {remaining <= 0 ? "已使用完畢" : "啟動自由模式"}
          </button>
        </article>

        <section className="mt-6">
          <h2 className="text-lg font-black text-white">此券紀錄</h2>
          <div className="mt-3 space-y-3">
            {relatedRecords.length ? (
              relatedRecords.map((record) => (
                <div className="record-row" key={record.id}>
                  <div>
                    <p className="font-bold text-white">{record.couponTitle}</p>
                    <p className="mt-1 text-xs text-cream/48">{record.redeemedAt}</p>
                  </div>
                  <span>已批准</span>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-cream/55">
                目前尚未啟動任何自由模式。
              </p>
            )}
          </div>
        </section>
      </section>

      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gold/25 bg-[#111217] p-5 shadow-2xl">
            <p className="label-text">REDEMPTION CONTROL</p>
            <h2 className="mt-3 text-2xl font-black text-white">Hannah 是否批准 Davin 啟動自由模式？</h2>
            <p className="mt-3 text-sm leading-6 text-cream/65">
              按下批准後將扣除一次額度，並寫入兌換紀錄。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="ghost-button justify-center py-4" onClick={() => setConfirming(false)} type="button">
                取消
              </button>
              <button className="primary-button" onClick={handleRedeem} type="button">
                批准兌換
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
