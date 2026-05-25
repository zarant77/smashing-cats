const EMAIL = "smashingcatsgame@gmail.com";
const SUBJECT = encodeURIComponent("Smashing Cats Crash");

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

const locale = localStorage.getItem("smashing-cats-locale") ?? navigator.language?.split("-")[0] ?? "en";

const titles = {
  en: "Catastrophic failure 🐈",
  uk: "Катастрофічна помилка 🐈",
  pl: "Katastrofalna awaria 🐈",
};
const buttonTexts = {
  en: "Continue anyway",
  uk: "Все одно продовжити",
  pl: "Kontynuuj mimo to",
};
const messages = {
  en: `One of the cats probably touched production code.<br />Please send this crash log to: <a href="mailto:${EMAIL}?subject=${SUBJECT}">${EMAIL}</a>`,
  uk: `Ймовірно, один з котиків торкнувся продакшн-коду.<br />Будь ласка, надішліть цей лог помилки на: <a href="mailto:${EMAIL}?subject=${SUBJECT}">${EMAIL}</a>`,
  pl: `Prawdopodobnie jedna z kotów dotknęła kodu produkcyjnego.<br />Proszę, wyślij ten log błędu na: <a href="mailto:${EMAIL}?subject=${SUBJECT}">${EMAIL}</a>`,
};

const title = titles[locale as keyof typeof titles] ?? titles.en;
const message = messages[locale as keyof typeof messages] ?? messages.en;
const buttonText = buttonTexts[locale as keyof typeof buttonTexts] ?? buttonTexts.en;

const element = document.createElement("div");
element.hidden = true;

element.innerHTML = `
  <style>
    .uncrasher {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: grid;
      place-items: center;
      padding: 4vmin;
      background: #111;
      color: #fff;
      font-family: monospace;
      box-sizing: border-box;
      user-select: none;
    }
    .uncrasher-card {
      width: min(120vmin, 100%);
      max-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 3vmin;
      padding: 4vmin;
      border-radius: 3vmin;
      background: #111;
      box-sizing: border-box;
    }
    .uncrasher a,
    .uncrasher .error {
      user-select: text;
    }
    .uncrasher a {
      color: #66ccff;
    }
    .uncrasher .title {
      font-size: 5vmin;
      font-weight: bold;
      text-align: center;
      line-height: 1;
    }
    .uncrasher .text {
      font-size: 2.8vmin;
      line-height: 1.35;
    }
    .uncrasher .error {
      flex: 1;
      min-height: 18vmin;
      max-height: 45vmin;
      padding: 2vmin;
      border-radius: 2vmin;
      background: #000;
      overflow: auto;
      font-size: 2vmin;
      line-height: 1.45;
      opacity: 0.92;
    }
    .uncrasher .actions {
      display: flex;
      justify-content: center;
    }
    .uncrasher .continue-button {
      padding: 1.4vmin 3vmin;
      border: 0;
      border-radius: 999vmin;
      background: #66ccff;
      color: #111;
      font-family: inherit;
      font-size: 2.2vmin;
      font-weight: bold;
      cursor: pointer;
    }
    .uncrasher .continue-button:hover {
      filter: brightness(1.08);
    }
  </style>
  <div class="uncrasher">
    <div class="uncrasher-card">
      <div class="title">${title}</div>
      <div class="text">${message}</div>
      <div class="error"></div>
      <div class="actions">
        <button class="continue-button" type="button">${buttonText}</button>
      </div>
    </div>
  </div>
`;

const errorElement = element.querySelector<HTMLElement>(".error") as HTMLElement;
const continueButton = element.querySelector<HTMLButtonElement>(".continue-button") as HTMLButtonElement;

continueButton.addEventListener("click", () => {
  element.hidden = true;
});

function show(error: unknown): void {
  console.error(error);

  errorElement.textContent = normalizeError(error);
  element.hidden = false;
}

function mount(): void {
  if (!document.body.contains(element)) {
    document.body.append(element);
  }
}

window.addEventListener("error", (event) => {
  mount();
  show(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  mount();
  show(event.reason);
});

export const Uncrasher = {
  show,
};
