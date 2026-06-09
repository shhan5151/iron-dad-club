export type Coupon = {
  id: string;
  code: string;
  category: string;
  title: string;
  effect: string;
  redeemableFor?: string[];
  usableFor?: string[];
  rules?: string[];
  note?: string;
  validity?: string;
  initialUses: number;
};

export const defaultCoupons: Coupon[] = [
  {
    id: "triathlon-anytime",
    code: "TRI-001",
    category: "ENDURANCE PASS",
    title: "無條件三鐵券",
    effect: "可兌換一次三鐵賽事、單車賽或馬拉松賽事的自由報名權。",
    redeemableFor: ["三鐵賽事一次", "單車賽一次", "馬拉松賽事一次"],
    rules: ["媽媽不得說「你確定？」", "媽媽不得說「現在？」", "媽媽不得說「不是才剛比完？」"],
    initialUses: 1,
  },
  {
    id: "weekend-vanish",
    code: "WND-008",
    category: "FREE MOVEMENT",
    title: "週末消失券",
    effect: "8 小時自由行動。",
    usableFor: ["騎車", "跑步", "看賽事", "和朋友聚餐", "咖啡廳放空"],
    note: "不得被連續 Call 回家。",
    initialUses: 2,
  },
  {
    id: "sleep-until-ready",
    code: "SLP-100",
    category: "RECOVERY PASS",
    title: "睡到自然醒券",
    effect: "當天早上所有育兒工作自動轉移，爸爸可睡到自然醒。",
    initialUses: 2,
  },
  {
    id: "mens-gathering",
    code: "BRO-040",
    category: "SOCIAL LICENSE",
    title: "男子漢聚會券",
    effect: "當朋友約聚餐、運動、看比賽時，可直接啟動。",
    rules: ["無須提前三天申請。"],
    initialUses: 2,
  },
  {
    id: "solo-trip",
    code: "ONE-024",
    category: "SOLO EXPEDITION",
    title: "一個人旅行券",
    effect: "1 天自由時間。",
    usableFor: ["單車旅行", "登山", "溫泉", "小旅行"],
    note: "媽媽與 Elara 全力支援。",
    initialUses: 1,
  },
  {
    id: "emotion-immunity",
    code: "CALM-003",
    category: "MENTAL RESET",
    title: "情緒豁免券",
    effect: "當爸爸覺得累、壓力大、想放空時，可直接啟動，換來一段不被打擾的休息時間。",
    usableFor: ["一個人待著", "散步或兜風", "安靜喝咖啡", "看球賽", "短暫放空", "什麼都不做"],
    rules: ["不需解釋原因。"],
    initialUses: 3,
  },
  {
    id: "birthday-grand-prize",
    code: "BDAY-777",
    category: "GRAND PRIZE",
    title: "生日大獎券",
    effect: "可兌換一次「今天全部聽你的」。",
    validity: "2026/06/10 - 2027/06/09",
    initialUses: 1,
  },
];

export const coupons = defaultCoupons;
