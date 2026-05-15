import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 4173);

const root = join(fileURLToPath(new URL(".", import.meta.url)), "dist");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"]);

// Tiny 1x1 transparent PNG
const NOT_FOUND_IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2p3fQAAAAASUVORK5CYII=",
  "base64",
);

const NOT_FOUND_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>404</title>

  <style>
    body {
      margin: 0;
      background: #0f1117;
      color: white;
      font-family: sans-serif;

      display: flex;
      align-items: center;
      justify-content: center;

      height: 100vh;
    }

    .box {
      text-align: center;
    }

    h1 {
      font-size: 72px;
      margin: 0;
    }

    p {
      opacity: 0.7;
      margin-top: 12px;
      font-size: 24px;
    }

    img {
      padding: 0 0 0 60px;
    }
  </style>
</head>
<body>
  <div class="box">
    <img src="data:image/png;base64,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">
    <h1>404</h1>
    <p id="message">Page not found</p>
  </div>

  <script>
    const locale = localStorage.getItem("smashing-cats-locale");

    const messages = {
      en: [
        "Page not found",
        "The cats stole this page",
        "Wrong portal, warrior",
        "This place is empty",
        "No cats here",
        "The trail went cold",
        "Looks like a dead end",
        "You got lost in the cat dimension",
        "Nothing survived here",
        "Mission failed successfully",
        "404. Cats are investigating",
        "Even the cactus couldn't survive here",
        "This page has been smashed",
        "You jumped into the void",
        "The enemy escaped with this page",
        "The civilians fled the scene",
        "You rolled a critical navigation failure",
        "A ghostcat erased this page",
        "The server cats are confused too",
        "This route does not exist",
        "You found the edge of the universe",
        "A batcat carried this page away",
        "The loot was fake",
        "No checkpoints nearby",
        "The map ended here",
        "This level was never finished",
        "You entered forbidden territory",
        "The page exploded dramatically",
        "Cybercat hacked this route",
        "404 combo x999",
        "Nothing but dust and question marks",
        "You weren't supposed to be here",
        "The boss already destroyed this place",
        "This tunnel leads nowhere",
        "Reality.dll is missing",
        "Out of tuna. Out of luck.",
        "The page rage quit",
        "This area is under catstruction",
        "The coordinates are corrupted",
        "The void meows back",
      ],

      uk: [
        "Сторінка не знайдена",
        "Коти вкрали цю сторінку",
        "Тут нічого нема",
        "Ти заблукав у котячому вимірі",
        "Сліди ведуть у нікуди",
        "Навіть коти не знають де це",
        "Тут пусто, друже",
        "Схоже, сторінку рознесло смешем",
        "Це тупик",
        "Кіт розгубився і ми теж",
        "404. Коти вже розслідують",
        "Навіть кактус тут не вижив",
        "Цю сторінку знищили",
        "Ти вистрибнув у порожнечу",
        "Ворог утік разом зі сторінкою",
        "Мирні мешканці давно втекли",
        "Критична помилка навігації",
        "Ghostcat стер цю сторінку",
        "Навіть серверні коти в ахуї",
        "Такого маршруту не існує",
        "Ти знайшов край всесвіту",
        "Batcat забрав сторінку у печеру",
        "Лут виявився фейковим",
        "Поруч немає чекпоінтів",
        "Мапа закінчилась",
        "Цей рівень не добудували",
        "Ти заліз куди не треба",
        "Сторінка епічно вибухнула",
        "Cybercat зламав цей роут",
        "404 комбо x999",
        "Тут лише пил і знаки питання",
        "Тебе тут не чекали",
        "Бос уже знищив це місце",
        "Цей тунель веде в нікуди",
        "Файл reality.dll не знайдено",
        "Тунець закінчився. Удача теж.",
        "Сторінка rage quit-нулась",
        "Тут ще триває котобудівництво",
        "Координати пошкоджені",
        "Порожнеча нявкає у відповідь",
      ],
    };

    const lang = locale === "uk" ? "uk" : "en";

    const variants = messages[lang];

    const randomMessage =
      variants[Math.floor(Math.random() * variants.length)];

    const message = document.getElementById("message");

    if (message !== null) {
      message.textContent = randomMessage;
    }

    document.documentElement.lang = lang;
  </script>
</body>
</html>
`;

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);

  const filePath = normalize(join(root, pathname));

  const isValidFile = filePath.startsWith(root) && existsSync(filePath) && statSync(filePath).isFile();

  if (!isValidFile) {
    const extension = extname(pathname).toLowerCase();

    if (IMAGE_EXTENSIONS.has(extension)) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "image/png");
      response.setHeader("Cache-Control", "no-store");
      response.end(NOT_FOUND_IMAGE);
      return;
    }

    response.statusCode = 404;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end(NOT_FOUND_HTML);

    return;
  }

  response.statusCode = 200;

  const extension = extname(filePath).toLowerCase();

  if (extension === ".html") {
    response.setHeader("Cache-Control", "no-cache");
  } else {
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }

  response.setHeader("Content-Type", mimeTypes.get(extname(filePath)) ?? "application/octet-stream");

  createReadStream(filePath).pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Smash!ng Cats webclient listening on http://0.0.0.0:${port}`);
});
