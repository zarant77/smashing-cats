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
      overflow: auto;
      padding: 0 3vh 0 3vh;
      background: #111;
      color: #fff;
      font-family: monospace;
      white-space: pre-wrap;
      box-sizing: border-box;
    }

    .uncrasher-title {
      font-size: 4vh;
      font-weight: bold;
      text-align: center;
      height: 14vh;
      line-height: 1;
    }

    .uncrasher-error {
      font-size: 2vh;
      opacity: 0.9;
      line-height: 1.4;
      height: 75vh;
      overflow: scroll;
    }
  </style>

  <div class="uncrasher">
    <div class="uncrasher-title">
      Smash!ng Cats crashed
    </div>

    <div class="uncrasher-error"></div>
  </div>
`;

const errorElement = element.querySelector<HTMLElement>(".uncrasher-error") as HTMLElement;

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
