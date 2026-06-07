"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRecords, isLoggedIn, type RedemptionRecord } from "@/lib/storage";

export default function RecordsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [records, setRecords] = useState<RedemptionRecord[]>([]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/");
      return;
    }
    setRecords(getRecords());
    setReady(true);
  }, [router]);

  if (!ready) {
    return <main className="min-h-dvh bg-iron text-cream" />;
  }

  return (
    <main className="min-h-dvh bg-iron text-cream">
      <section className="mx-auto min-h-dvh max-w-md px-4 pb-24 pt-5">
        <nav className="mb-5 flex items-center justify-between">
          <Link className="ghost-button" href="/">
            返回券包
          </Link>
          <p className="label-text">REQUEST LOG</p>
        </nav>

        <header className="premium-card p-5">
          <p className="label-text">IRON DAD CLUB</p>
          <h1 className="mt-3 text-3xl font-black text-white">兌換紀錄</h1>
          <p className="mt-3 text-sm leading-7 text-cream/70">
            這裡會顯示 Davin 送出的申請，以及 Hannah 的審核結果。
          </p>
        </header>

        <div className="mt-6 space-y-3">
          {records.length ? (
            records.map((record) => (
              <article className="record-row" key={record.id}>
                <div>
                  <p className="font-black text-white">{record.couponTitle}</p>
                  <p className="mt-1 text-xs text-cream/48">
                    {record.status === "待批准"
                      ? `申請時間 ${record.requestedAt}`
                      : `處理時間 ${record.resolvedAt ?? record.requestedAt}`}
                  </p>
                </div>
                <span>{record.status}</span>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="text-sm font-semibold leading-7 text-cream/65">目前尚未啟動任何自由模式。</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
