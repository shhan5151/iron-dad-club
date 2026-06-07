export type LoginPageCopy = {
  title: string;
  subtitle: string;
  cardTitle: string;
  description: string;
};

export type WalletPageCopy = {
  title: string;
  subtitle: string;
  memoryEyebrow: string;
  memoryTitle: string;
  memoryDescription: string;
};

export type SiteCopy = {
  beforeLogin: LoginPageCopy;
  afterLogin: WalletPageCopy;
};

export const defaultSiteCopy: SiteCopy = {
  beforeLogin: {
    title: "DADDY'S FREE TIME TOKEN",
    subtitle: "Being a dad doesn't mean giving up being you.",
    cardTitle: "Davin 專屬通行證",
    description:
      "有些時間屬於家庭，有些時間屬於夢想。\n\n而這些 Token，是 Hannah 與 Elara 預留給你的自由額度。當你想騎車、比賽、放空，或只是想做回 Davin 時，請放心使用。\n\n因為成為爸爸，不代表要放棄自己 ❤️",
  },
  afterLogin: {
    title: "DADDY'S FREE TIME TOKEN",
    subtitle: "Being a dad doesn't mean giving up being you.",
    memoryEyebrow: "2020-2026",
    memoryTitle: "Davin & Hannah",
    memoryDescription: "從第一次合照，到紐西蘭、求婚、第一個寶寶，這張 Pass 也是你們一起走到今天的紀念票。",
  },
};
