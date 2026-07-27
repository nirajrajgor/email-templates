import { initCustomizer } from "./customizer.js";
import { applyDarkSimulation } from "./dark-mode.js";

const supabaseTemplate = (title) => ({
  title: `Supabase ${title}`,
  background: "#f3f4f6",
  brand: "#4f46e5",
  back: "./supabase.html",
  integration: "Supabase",
});

const templates = {
  "purchase-confirmation": {
    title: "Purchase Confirmation Emailer",
    background: "#f4f4f4",
    brand: "#00bfa5",
  },
  "product-confirmation": {
    title: "Product Confirmation Emailer",
    background: "#f4f4f4",
  },
  "ecommerce-order": {
    title: "Ecommerce Order Emailer",
    background: "#fff5f0",
    brand: "#ff4d4d",
  },
  "shipping-confirmation": {
    title: "Shipping Confirmation Emailer",
    background: "#eff6ff",
    brand: "#2563eb",
  },
  "promotional-offer": {
    title: "Promotional Offer Emailer",
    background: "#ff9b12",
    brand: "#ff9b12",
  },
  "shopping-deals": {
    title: "Shopping Deals Emailer",
    background: "#f4f4f4",
    brand: "#7cff64",
  },
  "gift-decor": {
    title: "Gift Decor Emailer",
    background: "rgb(36, 3, 54)",
    brand: "#ffd700",
    accent: "#663399",
  },
  "product-announcements": {
    title: "Product Announcements Emailer",
    background: "#ffffff",
    brand: "#4f46e5",
    pinned: ["#dcfce7", "#f0fdf4", "#166534"],
  },
  "ai-newsletter": {
    title: "AI Newsletter Emailer",
    background: "#06120d",
    brand: "#007bff",
  },
  "music-event-promotion": {
    title: "Music Event Promotion Emailer",
    background: "#f4f4f4",
    brand: "#ffd700",
    accent: "#007bff",
  },
  "abandoned-cart": {
    title: "Abandoned Cart Emailer",
    background: "#ffffff",
    brand: "#0ea5e9",
  },
  "password-reset": {
    title: "Password Reset Emailer",
    background: "#f4f4f4",
    brand: "#667eea",
  },
  "account-verification": {
    title: "Account Verification Emailer",
    background: "#fafaf9",
    brand: "#d4a574",
    themedExtra: ["#8b7355", "#a8998a", "#5c4b37", "#e8e3dd"],
  },
  "supabase-confirm-signup": supabaseTemplate("Confirm Signup"),
  "supabase-email-otp": supabaseTemplate("Email OTP"),
  "supabase-invite-user": supabaseTemplate("Invite User"),
  "supabase-magic-link": supabaseTemplate("Magic Link"),
  "supabase-reset-password": supabaseTemplate("Reset Password"),
  "welcome-onboarding": {
    title: "Welcome Onboarding Emailer",
    background: "#f4f4f4",
    brand: "#f59e0b",
  },
  "product-review": {
    title: "Product Review HTML Template",
    background: "#f4f4f4",
    brand: "#065f46",
  },
  reengagement: {
    title: "Re-engagement HTML Email",
    background: "#f8fafc",
    brand: "#f97316",
  },
  "account-billing-update": {
    title: "Account & Billing Update Emailer",
    background: "#eef2f7",
    brand: "#2563eb",
    pinned: ["#f59e0b"],
  },
  "product-promotion": {
    title: "Product Promotion HTML Email Template",
    background: "#141a08",
    brand: "#c9d36a",
  },
};

const params = new URLSearchParams(window.location.search);
const requestedId = params.get("template") || "purchase-confirmation";
const id = templates[requestedId] ? requestedId : "purchase-confirmation";
const template = {
  ...templates[id],
  file: `./templates/${id}.html`,
};
const plainTextFile = template.file.replace(/\.html$/, ".txt");
const titleNode = document.getElementById("template-title");
const backLink = document.getElementById("back-link");
const frame = document.getElementById("template-frame");
const frameShell = document.getElementById("frame-shell");
const frameScaler = document.getElementById("frame-scaler");
const stage = document.getElementById("preview-stage");
const toolbar = document.querySelector(".preview-toolbar");
const downloadLink = document.getElementById("download-link");
const copyMenu = document.getElementById("copy-menu");
const copyMenuButton = document.getElementById("copy-menu-button");
const copyMenuList = document.getElementById("copy-menu-list");
const copyHtmlMenuItem = document.getElementById("copy-html-menu-item");
const copyTextMenuItem = document.getElementById("copy-text-menu-item");
const overflowWarning = document.getElementById("overflow-warning");
const darkMenu = document.getElementById("dark-menu");
const darkMenuButton = document.getElementById("dark-menu-button");
const darkMenuList = document.getElementById("dark-menu-list");
const darkMenuLabel = document.getElementById("dark-menu-label");
const darkMenuItems = document.querySelectorAll("[data-dark-mode]");
const viewportMenu = document.getElementById("viewport-menu");
const viewportMenuButton = document.getElementById("viewport-menu-button");
const viewportMenuList = document.getElementById("viewport-menu-list");
const viewportMenuLabel = document.getElementById("viewport-menu-label");
const viewportButtons = document.querySelectorAll("[data-viewport]");
// Must exceed the largest template mobile breakpoint (623px, product-promotion).
const FRAME_MIN_WIDTH = 624;
const MOBILE_FRAME_WIDTH = 375;
let frameResizeObserver = null;
let viewportMode = "desktop";
let currentHtml = null;

const getFallbackFrameHeight = () => window.innerHeight - toolbar.offsetHeight;

const stripsEmbeddedCss = (mode) => mode === "mobile-nocss";

// Gmail on IMAP accounts drops style blocks, including media queries.
const removeStyleBlocks = (html) =>
  html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

const getActiveHtml = async () => currentHtml ?? (await getRawHtml());

// srcdoc wins over src, so it has to be cleared before falling back to the file.
const showFile = () => {
  frame.removeAttribute("srcdoc");
  frame.src = template.file;
};

// Prevent a stale async CSS-stripped render from replacing a newer mode.
let renderToken = 0;

const renderFrame = async () => {
  const token = ++renderToken;

  if (!stripsEmbeddedCss(viewportMode)) {
    if (currentHtml) frame.srcdoc = currentHtml;
    else showFile();
    return;
  }

  try {
    const html = removeStyleBlocks(await getActiveHtml());
    if (token === renderToken) frame.srcdoc = html;
  } catch (error) {
    if (token === renderToken) showFile();
  }
};

document.title = `${template.title} | Email Template Preview`;
titleNode.textContent = template.title;
backLink.href = template.back || "./index.html";
backLink.setAttribute(
  "aria-label",
  template.integration
    ? `Back to ${template.integration} templates`
    : "Back to templates",
);
stage.style.setProperty("--template-bg", template.background);
downloadLink.href = template.file;
downloadLink.download = template.file.split("/").pop();
if (template.integration) {
  copyHtmlMenuItem.querySelector("span").textContent =
    `Copy ${template.integration} HTML`;
}

const getFrameContentHeight = () => {
  try {
    const doc = frame.contentDocument;
    if (!doc) return getFallbackFrameHeight();
    const body = doc.body;
    if (!body) return getFallbackFrameHeight();

    const bodyTop = body.getBoundingClientRect().top;
    const visibleChildren = Array.from(body.children).filter(
      (element) => !["SCRIPT", "STYLE"].includes(element.tagName),
    );
    const childBottom = visibleChildren.reduce((max, element) => {
      const rect = element.getBoundingClientRect();
      return Math.max(max, rect.bottom - bodyTop);
    }, 0);

    return Math.ceil(Math.max(body.offsetHeight || 0, childBottom));
  } catch (error) {
    return getFallbackFrameHeight();
  }
};

// Desktop uses a minimum width; a zero floor exposes raw mobile overflow.
const getFrameScrollWidth = (floor = 0) => {
  try {
    const doc = frame.contentDocument;
    if (!doc) return floor;
    return Math.ceil(
      Math.max(
        floor,
        doc.documentElement?.scrollWidth || 0,
        doc.body?.scrollWidth || 0,
      ),
    );
  } catch (error) {
    return floor;
  }
};

const bindFrameContentResize = () => {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    frameResizeObserver?.disconnect();

    const syncSoon = () => requestAnimationFrame(syncPreviewSize);
    doc.querySelectorAll("img").forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", syncSoon, { once: true });
        image.addEventListener("error", syncSoon, { once: true });
      }
    });

    frameResizeObserver = new ResizeObserver(syncSoon);
    frameResizeObserver.observe(doc.documentElement);
    if (doc.body) frameResizeObserver.observe(doc.body);
  } catch (error) {}
};

const STAGE_GUTTER = 32;

// Report mobile overflow instead of scaling it away; tolerate sub-pixel rounding.
const OVERFLOW_TOLERANCE = 8;

const updateOverflowWarning = (overflowPx) => {
  if (!overflowWarning) return;
  const isOverflowing = overflowPx > OVERFLOW_TOLERANCE;
  overflowWarning.hidden = !isOverflowing;
  if (isOverflowing) {
    overflowWarning.textContent = `This layout is ${Math.round(overflowPx)}px wider than a ${MOBILE_FRAME_WIDTH}px phone screen, so parts of it sit off the edge.`;
  }
};

// Render at the template's true width, then scale the complete frame to fit.
const syncPreviewSize = () => {
  const isMobile = viewportMode.startsWith("mobile");

  let frameWidth;
  if (!isMobile) {
    // Measure from the baseline, or a narrower leftover caps the reading.
    frame.style.width = `${FRAME_MIN_WIDTH}px`;
    frameWidth = getFrameScrollWidth(FRAME_MIN_WIDTH);
  } else if (stripsEmbeddedCss(viewportMode)) {
    // With breakpoints removed, shrink the natural desktop layout to phone width.
    frame.style.width = `${MOBILE_FRAME_WIDTH}px`;
    frameWidth = Math.max(MOBILE_FRAME_WIDTH, getFrameScrollWidth());
  } else {
    // Must stay exactly at the phone width or a breakpoint flips the layout.
    frameWidth = MOBILE_FRAME_WIDTH;
  }
  frame.style.width = `${frameWidth}px`;

  if (isMobile && !stripsEmbeddedCss(viewportMode)) {
    updateOverflowWarning(getFrameScrollWidth() - MOBILE_FRAME_WIDTH);
  } else {
    updateOverflowWarning(0);
  }

  const frameHeight = getFrameContentHeight();
  const available = Math.max(
    0,
    (stage.clientWidth || window.innerWidth) - STAGE_GUTTER,
  );
  const targetWidth = isMobile ? MOBILE_FRAME_WIDTH : frameWidth;
  const scale =
    available > 0
      ? Math.min(1, targetWidth / frameWidth, available / frameWidth)
      : 1;

  frame.style.height = `${frameHeight}px`;

  frameScaler.style.width = `${frameWidth}px`;
  frameScaler.style.height = `${frameHeight}px`;
  // A centered origin would push the scaled frame rightward.
  frameScaler.style.transform = scale < 1 ? `scale(${scale})` : "";

  // Transformed, not resized, so the shell must reserve the post-scale box.
  frameShell.style.width = `${Math.round(frameWidth * scale)}px`;
  frameShell.style.height = `${Math.round(frameHeight * scale)}px`;
};

const syncToolbarHeight = () => {
  document.documentElement.style.setProperty(
    "--bar-height",
    `${toolbar.offsetHeight}px`,
  );
  requestAnimationFrame(syncPreviewSize);
};

frame.addEventListener("load", () => {
  bindFrameContentResize();
  syncPreviewSize();
  syncFrameDarkSimulation();
});
window.addEventListener("resize", syncToolbarHeight);
new ResizeObserver(syncToolbarHeight).observe(toolbar);

// Coordinate all toolbar dropdowns so only one can remain open.
const dropdowns = [];

const closeDropdowns = () => dropdowns.forEach((menu) => menu.setOpen(false));

const createDropdown = ({ root, button, list, canOpen = () => true }) => {
  const menu = {
    button,
    root,
    isOpen: () => !list.hidden,
    setOpen: (isOpen) => {
      list.hidden = !isOpen;
      button.setAttribute("aria-expanded", String(isOpen));
    },
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!canOpen()) return;
    const shouldOpen = !menu.isOpen();
    closeDropdowns();
    menu.setOpen(shouldOpen);
  });

  dropdowns.push(menu);
  return menu;
};

document.addEventListener("click", (event) => {
  dropdowns.forEach((menu) => {
    if (!menu.root.contains(event.target)) menu.setOpen(false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  dropdowns.forEach((menu) => {
    if (!menu.isOpen()) return;
    menu.setOpen(false);
    menu.button.focus();
  });
});

const viewportDropdown = createDropdown({
  root: viewportMenu,
  button: viewportMenuButton,
  list: viewportMenuList,
});

const VIEWPORT_LABELS = {
  desktop: "Desktop",
  mobile: "Mobile · 375px",
  "mobile-nocss": "Mobile, styles stripped",
};

const setViewportMode = (mode) => {
  const previous = viewportMode;
  viewportMode = mode;

  viewportButtons.forEach((button) => {
    const isActive = button.dataset.viewport === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
  viewportMenuLabel.textContent = VIEWPORT_LABELS[mode];
  viewportMenuButton.classList.toggle("is-active", mode !== "desktop");

  // Stripping <style> changes the document, so re-render rather than resize.
  if (stripsEmbeddedCss(previous) !== stripsEmbeddedCss(mode)) {
    renderFrame();
  } else {
    syncPreviewSize();
  }
};

viewportButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setViewportMode(button.dataset.viewport);
    viewportDropdown.setOpen(false);
  });
});

let darkMode = "none";

const DARK_MODE_LABELS = {
  none: "Original",
  partial: "Partial inversion",
  full: "Full inversion",
};

const syncFrameDarkSimulation = () => {
  try {
    const doc = frame.contentDocument;
    if (!doc?.body) return;
    applyDarkSimulation(doc, darkMode === "none" ? null : darkMode);
  } catch (error) {}
};

const darkDropdown = createDropdown({
  root: darkMenu,
  button: darkMenuButton,
  list: darkMenuList,
});

const setDarkSimulation = (mode) => {
  darkMode = mode;
  const isSimulating = mode !== "none";

  stage.classList.toggle("is-dark-sim", isSimulating);
  darkMenuButton.classList.toggle("is-active", isSimulating);
  darkMenuLabel.textContent = DARK_MODE_LABELS[mode];

  darkMenuItems.forEach((item) => {
    const isActive = item.dataset.darkMode === mode;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-checked", String(isActive));
  });

  syncFrameDarkSimulation();
};

darkMenuItems.forEach((item) => {
  item.addEventListener("click", () => {
    setDarkSimulation(item.dataset.darkMode);
    darkDropdown.setOpen(false);
  });
});

const copyDropdown = createDropdown({
  root: copyMenu,
  button: copyMenuButton,
  list: copyMenuList,
  canOpen: () => !copyMenuButton.disabled,
});

const getFileContent = async (file) => {
  const response = await fetch(file);
  if (!response.ok) throw new Error("Unable to load template");
  return response.text();
};

// Share one template request across clipping, viewport, and customization.
let rawHtmlRequest = null;
const getRawHtml = () => (rawHtmlRequest ??= getFileContent(template.file));

const copyFileToClipboard = async (button, getContent, successText) => {
  const original = button.innerHTML;
  button.disabled = true;
  let restoreDelay = 1400;
  try {
    const content = await getContent();
    await navigator.clipboard.writeText(content);
    button.textContent = successText;
  } catch (error) {
    button.textContent = "Copy failed";
    restoreDelay = 1600;
  }
  setTimeout(() => {
    button.innerHTML = original;
    button.disabled = false;
  }, restoreDelay);
};

copyHtmlMenuItem.addEventListener("click", () => {
  copyDropdown.setOpen(false);
  copyFileToClipboard(
    copyMenuButton,
    () => currentHtml ?? getRawHtml(),
    "HTML copied",
  );
});

copyTextMenuItem.addEventListener("click", () => {
  copyDropdown.setOpen(false);
  copyFileToClipboard(
    copyMenuButton,
    () => getFileContent(plainTextFile),
    "Text copied",
  );
});

let downloadBlobUrl = null;

if (template.brand) {
  initCustomizer({
    brand: template.brand,
    accent: template.accent,
    background: template.background,
    pinned: template.pinned,
    themedExtra: template.themedExtra,
    loadHtml: getRawHtml,
    onApply: ({ html, background }) => {
      currentHtml = html;
      renderFrame();
      stage.style.setProperty("--template-bg", background);
      if (downloadBlobUrl) URL.revokeObjectURL(downloadBlobUrl);
      downloadBlobUrl = URL.createObjectURL(
        new Blob([html], { type: "text/html" }),
      );
      downloadLink.href = downloadBlobUrl;
    },
  });
}

renderFrame();
