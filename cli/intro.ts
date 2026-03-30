import ora from "ora";
import cfonts from "cfonts";
import kleur from "kleur";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function type(text: string, delay = 25) {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(delay);
  }
}

async function divider() {
  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  );
  await sleep(400);
}

async function run() {
  console.clear();

  // -------------------------
  // HERO
  // -------------------------
  const text = "Zipup";
  let i = 1;

  const interval = setInterval(() => {
    console.clear();

    cfonts.say(text.slice(0, i), {
      font: "slick",
      align: "left",
      gradient: ["white", "blue"]
    });

    i++;

    if (i > text.length) {
      clearInterval(interval);
    }
  }, 200);

  await sleep(1200);


  const Slogan =
    "🚢 " +
    kleur
      .cyan()
      .underline()
      .bold("An Open Source Personal Cloud for JavaScript Developers.\n");
  await type(Slogan, 35);
  await divider();

  // -------------------------
  // CORE FEATURES (use stopAndPersist)
  // -------------------------
  const core = [
    "Deploy static websites & NodeJS apps",
    "Blazingly fast deployments",
    "Built-in Postgres and Valkey(Redis)",
    "Queues for background jobs",
    "High Performance Logging with Rich Querying capabilities",
    "Real-time log tailing",
    "Automatic SSL",
    "Secure access to Postgres, Valkey and Logs via WireGuard VPN",
    "...and much more!"
  ];

  for (const item of core) {
    const spinner = ora({
      text: item,
      spinner: "dots",
      color: "cyan"
    }).start();

    await sleep(1400);

    spinner.succeed();

    await sleep(400);
  }

  await divider();

  // -------------------------
  // ROADMAP (different symbol + same spinner UX)
  // -------------------------
  console.log("⏳ Future Roadmap\n");
  await sleep(400);

  const roadmap = [
    "Forward Auth Proxy",
    "Layers",
    "AbuseIPDB Protection",
    "2FA",
    "SCRAM Auth"
  ];

  for (const item of roadmap) {
    const spinner = ora({
      text: item,
      spinner: "dots",
      color: "yellow"
    }).start();

    await sleep(900);

    spinner.stopAndPersist({
      symbol: "▢", // planned
      text: item
    });

    await sleep(350);
  }

  await divider();

  // -------------------------
  // FINAL CLEAN END (optional but recommended)
  // -------------------------
  const subSlogan =
    "🚢 " +
    kleur
      .cyan()
      .underline()
      .bold("For Personal Projects, MVPs, Internal Tools & Side Hustles.");
  await type(subSlogan, 35);
  console.log("\n");
  const final = ora({
    text: "Coming soon...",
    spinner: "dots",
    color: "green"
  }).start();

  await sleep(1200);

  final.stopAndPersist({
    symbol: "🚧",
    text: "Coming soon..."
  });
  console.log("\n\n\n");
}

run();
