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
  ultrasoundEyebrow: string;
  ultrasoundTitle: string;
  ultrasoundDescription: string;
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
      "有些時間屬於家庭，有些時間屬於夢想。\n\n而這些 Token，是 Hannah 與 Elara 預留給你的自由額度。當你想騎車、比賽、放空，或只是想做回 Davin 時，請放心使用。\n\n因為成為爸爸，不代表要放棄自己 ♡",
  },
  afterLogin: {
    title: "DADDY'S FREE TIME TOKEN",
    subtitle: "Being a dad doesn't mean giving up being you.",
    memoryEyebrow: "FROM HANNAH",
    memoryTitle: "給 Davin 的卡片",
    memoryDescription:
      "親愛的老公:\n\n從2020第一次合照，到一起慶生、跨年、滑雪、追各種球賽、出國、買房、求婚....等，這一路上我們經歷了好多好多，終於，在今年我們正式成為家人，也迎來了第一個小生命，我們的寶貝Elara，回頭看這六年，說長不長說短不短，但最刻苦銘心的幾個Moment在我心中是永遠忘不了的。\n\n謝謝你在我人生經歷重大挫折的時候，一直陪著我、愛著我、心疼我，謝謝你陪我哭、陪我笑，也把我從黑暗中拉回，讓我能繼續正常的過日子，這份感恩感謝感動，會一直存在我心中。\n\n接下來我們要一起迎接新的旅程，日子依然酸甜苦辣都有，又要拚事業又要照顧小孩，聽起來確實困難重重，但我相信我們還是能找出最佳解，找到生活與工作的平衡，當然我更希望你還是你，不會因為當了爸爸而被迫犧牲最愛的運動，未來日子我們相互扶持、包容、體諒，當彼此最好的隊友，我相信再困難的事情都會有辦法解決的。\n\n最後想跟你說，謝謝你，辛苦了! 還有最重要的，生日快樂，永遠愛你 ♡\n\n愛你的老婆 Hannah\n2026.6.8",
    ultrasoundEyebrow: "HELLO ELARA",
    ultrasoundTitle: "我們的第一個寶寶",
    ultrasoundDescription: "從兩個人，到三個人。未來的日子很忙，也會很滿，但我們會一起把愛帶進每一天。",
  },
};
