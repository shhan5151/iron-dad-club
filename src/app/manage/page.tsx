"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteCopy } from "@/lib/copy";
import type { Coupon } from "@/lib/coupons";
import { defaultSiteImages, type SiteImages } from "@/lib/media";
import {
  approveRedemptionRequestAsync,
  deleteRedemptionRecordAsync,
  getCouponState,
  getCoupons,
  getRecords,
  getSiteCopy,
  getSiteImages,
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

type SiteImageField = keyof SiteImages;

const photoSlots: Array<{
  key: SiteImageField;
  eyebrow: string;
  label: string;
  hint: string;
  previewClass: string;
  wrapClass?: string;
}> = [
  {
    key: "beforeLoginBackground",
    eyebrow: "LOGIN HERO",
    label: "登入前背景照",
    hint: "建議用橫式運動照，會鋪滿整個登入頁背景。",
    previewClass: "object-cover",
  },
  {
    key: "beforeLoginProfile",
    eyebrow: "MEMBER PORTRAIT",
    label: "登入前 Profile 照",
    hint: "適合臉清楚的單人照，會顯示在卡片右上角。",
    previewClass: "object-cover",
  },
  {
    key: "afterLoginMemoryCollage",
    eyebrow: "MEMORY BOARD",
    label: "登入後回憶拼圖",
    hint: "建議用完整拼圖或長圖，畫面會完整顯示。",
    previewClass: "object-contain",
    wrapClass: "bg-[#050608] p-2",
  },
  {
    key: "afterLoginCard",
    eyebrow: "LETTER PHOTO",
    label: "卡片照片",
    hint: "會放在文案卡片上方，適合有情緒的兩人照。",
    previewClass: "object-cover",
  },
  {
    key: "afterLoginUltrasound",
    eyebrow: "ELARA",
    label: "Elara 專區照片",
    hint: "適合超音波照或任何你想放在 Elara 區的照片。",
    previewClass: "object-cover",
  },
];

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

function createEmptyCoupon(): EditableCoupon {
  const stamp = Date.now();
  return {
    id: `custom-${stamp}`,
    code: `NEW-${String(stamp).slice(-4)}`,
    category: "Custom Pass",
    title: "新票券",
    effect: "",
    redeemableFor: [],
    usableFor: [],
    rules: [],
    note: "",
    validity: "",
    initialUses: 1,
    remaining: 1,
    redeemableForText: "",
    usableForText: "",
    rulesText: "",
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("圖片讀取失敗"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("圖片載入失敗"));
    image.src = source;
  });
}

async function optimizeImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("請選擇圖片檔");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);

  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("圖片處理失敗");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ManagePage() {
  const [ready, setReady] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<EditableCoupon[]>([]);
  const [siteCopy, setSiteCopy] = useState<SiteCopy>(getSiteCopy());
  const [siteImages, setSiteImages] = useState<SiteImages>(getSiteImages());
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState<RedemptionRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<SiteImageField | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const authed = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
    setAdminAuthed(authed);

    if (authed) {
      void loadManagerData();
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!adminAuthed) {
      return;
    }

    const refresh = () => {
      void loadManagerData({ silent: true, preserveEditor: hasUnsavedChanges });
    };

    const intervalId = window.setInterval(refresh, 8000);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [adminAuthed, hasUnsavedChanges]);

  async function loadManagerData(options?: { silent?: boolean; preserveEditor?: boolean }) {
    setRefreshing(true);
    try {
      const snapshot = await loadAppSnapshot();
      if (!options?.preserveEditor) {
        setItems(snapshot.coupons.map((coupon) => toEditable(coupon, snapshot.couponState)));
        setSiteCopy(snapshot.siteCopy);
        setSiteImages(snapshot.siteImages);
        setHasUnsavedChanges(false);
      }
      setRecords(snapshot.records);
    } catch {
      const coupons = getCoupons();
      const state = getCouponState(coupons);
      if (!options?.preserveEditor) {
        setItems(coupons.map((coupon) => toEditable(coupon, state)));
        setSiteCopy(getSiteCopy());
        setSiteImages(getSiteImages());
        setHasUnsavedChanges(false);
      }
      setRecords(getRecords());
      if (!options?.silent) {
        setMessage("目前讀取的是這台裝置上的資料，雲端同步稍後再試。");
      }
    } finally {
      setRefreshing(false);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  }

  function addCoupon() {
    setItems((current) => [...current, createEmptyCoupon()]);
    setMessage("已新增一張新票券，記得按一次「儲存變更」。");
    setHasUnsavedChanges(true);
  }

  function removeCoupon(id: string) {
    const target = items.find((item) => item.id === id);
    if (!target) {
      return;
    }

    const approved = window.confirm(`要刪除「${target.title || "這張票券"}」嗎？`);
    if (!approved) {
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setMessage("已從清單移除這張票券，記得按一次「儲存變更」。");
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  }

  function updateSiteImage(key: SiteImageField, value: string) {
    setSiteImages((current) => ({
      ...current,
      [key]: value,
    }));
    setMessage("");
    setHasUnsavedChanges(true);
  }

  async function handleImageSelected(key: SiteImageField, file: File | null) {
    if (!file) {
      return;
    }

    setUploadingImage(key);
    try {
      const optimized = await optimizeImage(file);
      updateSiteImage(key, optimized);
      setMessage("圖片已載入，記得按一次「儲存變更」。");
    } catch (uploadError) {
      const detail = uploadError instanceof Error ? uploadError.message : "Unknown error";
      setMessage(`圖片處理失敗：${detail}`);
    } finally {
      setUploadingImage(null);
    }
  }

  function resetSiteImage(key: SiteImageField) {
    updateSiteImage(key, defaultSiteImages[key]);
    setMessage("這張照片已還原成預設版本，記得按一次「儲存變更」。");
  }

  async function saveChanges() {
    setSaving(true);
    const nextCoupons = items.map(toCoupon);
    const nextState = Object.fromEntries(items.map((item) => [item.id, Math.max(0, Number(item.remaining) || 0)]));

    try {
      await saveCouponManagerStateAsync(nextCoupons, nextState, siteCopy, siteImages);
      setItems(nextCoupons.map((coupon) => toEditable(coupon, nextState)));
      setMessage(
        isCloudSyncConfigured()
          ? "已儲存到共享資料。Davin 那邊重新整理後就會看到最新版。"
          : "已儲存在這台裝置上。",
      );
      setHasUnsavedChanges(false);
    } catch (saveError) {
      const detail = saveError instanceof Error ? saveError.message : "Unknown error";
      setMessage(`儲存失敗：${detail}`);
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    setSaving(true);
    try {
      await resetCouponManagerStateAsync();
      await loadManagerData();
      setMessage("已還原成目前程式的預設內容。");
      setHasUnsavedChanges(false);
    } catch (resetError) {
      const detail = resetError instanceof Error ? resetError.message : "Unknown error";
      setMessage(`還原失敗：${detail}`);
    } finally {
      setSaving(false);
    }
  }

  async function approveRequest(requestId: string) {
    setSaving(true);
    const result = await approveRedemptionRequestAsync(requestId);
    if (!result.ok) {
      setMessage("批准失敗，可能是票券資料已變更，請重新整理後再試。");
      setSaving(false);
      return;
    }

    await loadManagerData();
    setSaving(false);
    setMessage("已批准這張申請，票券次數也同步扣除了。");
  }

  async function rejectRequest(requestId: string) {
    setSaving(true);
    await rejectRedemptionRequestAsync(requestId);
    await loadManagerData();
    setSaving(false);
    setMessage("已婉拒這張申請。");
  }

  async function deleteRecord(recordId: string) {
    setSaving(true);
    await deleteRedemptionRecordAsync(recordId);
    await loadManagerData();
    setSaving(false);
    setMessage("已刪除這筆兌換紀錄。");
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
              在這裡調整票券內容、前台文案、照片，並處理 Davin 送出的自由模式申請。
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
                  placeholder="輸入 Hannah 專用密碼"
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
            你可以在這裡安排票券順序、調整剩餘次數、改文案、換照片，也能批准或婉拒 Davin 的申請。
          </p>
        </header>

        {message ? (
          <p className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm font-bold text-gold">
            {message}
          </p>
        ) : null}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">待批准申請</h2>
              <p className="mt-1 text-xs font-semibold text-cream/45">
                {refreshing
                  ? "正在更新共享資料..."
                  : hasUnsavedChanges
                    ? "你正在編輯中，系統只更新申請清單，不會覆蓋文字或圖片"
                    : "每 8 秒會自動更新一次"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="ghost-button px-3 py-2 text-xs" onClick={() => void loadManagerData()} type="button">
                重新整理
              </button>
              <span className="text-sm font-bold text-gold">{pendingRequests.length} 筆</span>
            </div>
          </div>

          <div className="space-y-3">
            {pendingRequests.length ? (
              pendingRequests.map((record) => (
                <article className="premium-card p-5" key={record.id}>
                  <p className="label-text">REQUEST</p>
                  <h3 className="mt-2 text-xl font-black text-white">{record.couponTitle}</h3>
                  <p className="mt-2 text-sm text-cream/65">送出時間：{record.requestedAt}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      className="ghost-button justify-center py-4 disabled:opacity-40"
                      disabled={saving}
                      onClick={() => void rejectRequest(record.id)}
                      type="button"
                    >
                      婉拒
                    </button>
                    <button
                      className="primary-button disabled:opacity-40"
                      disabled={saving}
                      onClick={() => void approveRequest(record.id)}
                      type="button"
                    >
                      批准
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-cream/60">
                目前沒有待批准的自由模式申請。
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 premium-card p-5">
          <p className="label-text">RECORD MANAGER</p>
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-black text-white">兌換紀錄管理</h2>
            <span className="text-sm font-bold text-gold">{records.length} 筆</span>
          </div>

          <div className="mt-5 space-y-3">
            {records.length ? (
              records.map((record) => (
                <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" key={record.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-white">{record.couponTitle}</p>
                      <p className="mt-1 text-xs text-cream/48">
                        {record.status === "待批准"
                          ? `申請時間 ${record.requestedAt}`
                          : `處理時間 ${record.resolvedAt ?? record.requestedAt}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-gold">{record.status}</span>
                  </div>
                  <button
                    className="ghost-button mt-4 w-full justify-center py-3 text-sm disabled:opacity-40"
                    disabled={saving}
                    onClick={() => void deleteRecord(record.id)}
                    type="button"
                  >
                    刪除紀錄
                  </button>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-cream/60">
                目前沒有可刪除的兌換紀錄。
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 premium-card p-5">
          <p className="label-text">PHOTO MANAGER</p>
          <h2 className="mt-2 text-2xl font-black text-white">照片管理</h2>
          <p className="mt-2 text-sm leading-7 text-cream/65">
            你可以直接在這裡換圖。系統會先幫你壓縮，再跟文案一起存進共享資料。
          </p>

          <div className="mt-5 space-y-4">
            {photoSlots.map((slot) => (
              <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" key={slot.key}>
                <p className="label-text">{slot.eyebrow}</p>
                <h3 className="mt-2 text-lg font-black text-white">{slot.label}</h3>
                <p className="mt-2 text-sm leading-6 text-cream/60">{slot.hint}</p>

                <div className={`mt-4 relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 ${slot.wrapClass ?? "bg-black/25"}`}>
                  <img alt={slot.label} className={`h-full w-full ${slot.previewClass}`} src={siteImages[slot.key]} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="primary-button cursor-pointer justify-center">
                    {uploadingImage === slot.key ? "處理中" : "上傳新照片"}
                    <input
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage === slot.key || saving}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handleImageSelected(slot.key, file);
                        event.currentTarget.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  <button
                    className="ghost-button justify-center py-3 disabled:opacity-40"
                    disabled={uploadingImage === slot.key || saving}
                    onClick={() => resetSiteImage(slot.key)}
                    type="button"
                  >
                    還原預設
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 premium-card p-5">
          <p className="label-text">FRONT COPY</p>
          <h2 className="mt-2 text-2xl font-black text-white">登入前文案</h2>
          <div className="mt-5 grid gap-4">
            <label className="field-label">
              <span>主標題</span>
              <input value={siteCopy.beforeLogin.title} onChange={(event) => updateBeforeLogin({ title: event.target.value })} />
            </label>
            <label className="field-label">
              <span>附標</span>
              <input value={siteCopy.beforeLogin.subtitle} onChange={(event) => updateBeforeLogin({ subtitle: event.target.value })} />
            </label>
            <label className="field-label">
              <span>卡片標題</span>
              <input value={siteCopy.beforeLogin.cardTitle} onChange={(event) => updateBeforeLogin({ cardTitle: event.target.value })} />
            </label>
            <label className="field-label">
              <span>內文</span>
              <textarea
                rows={8}
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
              <input value={siteCopy.afterLogin.title} onChange={(event) => updateAfterLogin({ title: event.target.value })} />
            </label>
            <label className="field-label">
              <span>附標</span>
              <input value={siteCopy.afterLogin.subtitle} onChange={(event) => updateAfterLogin({ subtitle: event.target.value })} />
            </label>
            <label className="field-label">
              <span>卡片小標</span>
              <input
                value={siteCopy.afterLogin.memoryEyebrow}
                onChange={(event) => updateAfterLogin({ memoryEyebrow: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>卡片標題</span>
              <input value={siteCopy.afterLogin.memoryTitle} onChange={(event) => updateAfterLogin({ memoryTitle: event.target.value })} />
            </label>
            <label className="field-label">
              <span>卡片內文</span>
              <textarea
                rows={12}
                value={siteCopy.afterLogin.memoryDescription}
                onChange={(event) => updateAfterLogin({ memoryDescription: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>Elara 區小標</span>
              <input
                value={siteCopy.afterLogin.ultrasoundEyebrow}
                onChange={(event) => updateAfterLogin({ ultrasoundEyebrow: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>Elara 區標題</span>
              <input
                value={siteCopy.afterLogin.ultrasoundTitle}
                onChange={(event) => updateAfterLogin({ ultrasoundTitle: event.target.value })}
              />
            </label>
            <label className="field-label">
              <span>Elara 區內文</span>
              <textarea
                rows={4}
                value={siteCopy.afterLogin.ultrasoundDescription}
                onChange={(event) => updateAfterLogin({ ultrasoundDescription: event.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="mt-5 flex items-center justify-between">
          <div>
            <p className="label-text">COUPON MANAGER</p>
            <h2 className="mt-2 text-2xl font-black text-white">票券管理</h2>
          </div>
          <button className="primary-button px-4 py-3" onClick={addCoupon} type="button">
            新增票券
          </button>
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

              <button
                className="ghost-button mt-3 w-full justify-center py-3 text-sm text-red-200 disabled:opacity-40"
                onClick={() => removeCoupon(item.id)}
                type="button"
              >
                刪除此票券
              </button>

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
                    <input value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value })} />
                  </label>
                </div>

                <label className="field-label">
                  <span>效力</span>
                  <textarea rows={3} value={item.effect} onChange={(event) => updateItem(item.id, { effect: event.target.value })} />
                </label>

                <label className="field-label">
                  <span>可兌換內容</span>
                  <textarea
                    rows={3}
                    value={item.redeemableForText}
                    onChange={(event) => updateItem(item.id, { redeemableForText: event.target.value })}
                  />
                </label>

                <label className="field-label">
                  <span>可使用情境</span>
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
                  <input value={item.validity ?? ""} onChange={(event) => updateItem(item.id, { validity: event.target.value })} />
                </label>
              </div>
            </article>
          ))}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0b10]/92 p-4 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
            <button className="ghost-button justify-center py-4 disabled:opacity-40" disabled={saving} onClick={() => void resetDefaults()} type="button">
              還原預設
            </button>
            <button className="primary-button disabled:opacity-40" disabled={saving || Boolean(uploadingImage)} onClick={() => void saveChanges()} type="button">
              {saving ? "儲存中" : "儲存變更"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
