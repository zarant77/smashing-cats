const EMAIL = "smashingcatsgame@gmail.com";

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

const element = document.createElement("div");

element.hidden = true;

element.innerHTML = `
  <style>
    .uncrasher {
      position: fixed;
      inset: 0;
      z-index: 999999;
      padding: 0 3vh 0 3vh;
      background: #111;
      color: #fff;
      font-family: monospace;
      white-space: pre-wrap;
      box-sizing: border-box;
      user-select: text;
    }
    .uncrasher a {
      color: #66ccff;
    }
    .uncrasher .title {
      font-size: 4vh;
      font-weight: bold;
      text-align: center;
      line-height: 0.8;
    }
    .uncrasher .text {
      font-size: 3vh;
      font-weight: 100;
      line-height: 1.4;
    }
    .uncrasher .error {
      max-height: 60vh;
      line-height: 1.4;
      font-size: 2vh;
      opacity: 0.9;
      overflow: scroll;
    }
  </style>

  <div class="uncrasher">
    <div class="title">
      Catastrophic failure 🐈
    </div>
    <div class="text">
      One of the cats probably touched production code.
      Please send this crash log to: <a href="mailto:${EMAIL}?subject=Smashing%20Cats%20Crash">${EMAIL}</a>
      Include your device and browser if possible.
    </div>
    <div class="error"></div>
  </div>
`;

const errorElement = element.querySelector<HTMLElement>(".error") as HTMLElement;

if (errorElement === null) {
  throw new Error("Uncrasher init failed");
}

function show(error: unknown): void {
  console.error(error);

  errorElement.textContent = normalizeError(error);

  element.hidden = false;
}

function mount(): void {
  if (document.body.contains(element)) {
    return;
  }

  document.body.append(element);
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
