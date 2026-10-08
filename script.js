const root = document.documentElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

// localStorage can throw in private mode or when storage is blocked
const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};

// Light & dark theme
const themeToggle = document.getElementById("theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const systemDark = matchMedia("(prefers-color-scheme: dark)");

function applyTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  themeColorMeta.setAttribute("content", theme === "dark" ? "#0b0e0d" : "#f7f6f2");
}

applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  storage.set("theme", next);

  if (!document.startViewTransition || reducedMotion.matches) {
    applyTheme(next);
    return;
  }

  // Reveal the new theme as a circle growing out of the toggle button
  const { left, top, width, height } = themeToggle.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  document.startViewTransition(() => applyTheme(next)).ready.then(() => {
    root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
    );
  });
});

// Follow the system theme until the visitor picks one
systemDark.addEventListener("change", (event) => {
  if (!storage.get("theme")) applyTheme(event.matches ? "dark" : "light");
});

// Mobile menu
const nav = document.getElementById("nav");
const menuToggle = document.getElementById("menu-toggle");

function setMenu(open) {
  nav.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));

document.querySelectorAll(".nav__links a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("is-open")) {
    setMenu(false);
    menuToggle.focus();
  }
});

matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
  if (event.matches) setMenu(false);
});

// Scroll-driven effects: nav background, progress bar, timeline fill
const timeline = document.querySelector(".timeline");
let scrollTicking = false;

function onScroll() {
  const maxScroll = root.scrollHeight - innerHeight;
  root.style.setProperty("--scroll", maxScroll > 0 ? (scrollY / maxScroll).toFixed(4) : 0);
  nav.classList.toggle("is-scrolled", scrollY > 12);

  if (timeline) {
    const rect = timeline.getBoundingClientRect();
    const progress = Math.min(Math.max((innerHeight * 0.65 - rect.top) / rect.height, 0), 1);
    timeline.style.setProperty("--progress", progress.toFixed(4));
  }

  scrollTicking = false;
}

addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(onScroll);
    }
  },
  { passive: true }
);
addEventListener("resize", onScroll);
onScroll();

// Highlight the nav link for the section in view
const navLinks = new Map(
  [...document.querySelectorAll(".nav__links a")].map((link) => [link.getAttribute("href").slice(1), link])
);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link, id) => link.classList.toggle("is-active", id === entry.target.id));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);

document.querySelectorAll("main section[id]").forEach((section) => sectionObserver.observe(section));

// Count-up numbers
function countUp(el) {
  const target = Number(el.dataset.count);
  if (reducedMotion.matches) {
    el.textContent = target;
    return;
  }

  const duration = 1400;
  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased);
    if (t < 1) requestAnimationFrame(frame);
  }

  el.textContent = "0";
  requestAnimationFrame(frame);
}

// Reveal elements as they scroll into view
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      entry.target.querySelectorAll("[data-count]").forEach(countUp);
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Typewriter for the hero role
const rotator = document.querySelector(".rotator");

if (rotator) {
  const phrases = rotator.dataset.phrases.split("|");
  let phraseIndex = 0;
  let charIndex = phrases[0].length;
  let deleting = true;

  function tick() {
    const phrase = phrases[phraseIndex];

    if (reducedMotion.matches) {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      rotator.textContent = phrases[phraseIndex];
      setTimeout(tick, 3500);
      return;
    }

    if (deleting) {
      charIndex--;
      rotator.textContent = phrase.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
      setTimeout(tick, 28);
    } else {
      const next = phrases[phraseIndex];
      charIndex++;
      rotator.textContent = next.slice(0, charIndex);
      if (charIndex === next.length) {
        deleting = true;
        setTimeout(tick, 2600);
      } else {
        setTimeout(tick, 55);
      }
    }
  }

  setTimeout(tick, 2800);
}

// 3D tilt on project visuals
document.querySelectorAll("[data-tilt]").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (!finePointer.matches || reducedMotion.matches) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    card.classList.add("is-tilting");
    card.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
    card.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
    card.style.setProperty("--gx", `${px * 100}%`);
    card.style.setProperty("--gy", `${py * 100}%`);
  });

  card.addEventListener("pointerleave", () => {
    card.classList.remove("is-tilting");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });
});

// Glow that follows the cursor on cards
document.querySelectorAll(".glow").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    card.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
});

// Copy email to clipboard
const toast = document.getElementById("toast");
const copyButton = document.getElementById("copy-email");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-shown"), 2400);
}

copyButton.addEventListener("click", async () => {
  const email = copyButton.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    showToast("Email copied to clipboard");
  } catch {
    location.href = `mailto:${email}`;
  }
});

document.getElementById("year").textContent = new Date().getFullYear();
