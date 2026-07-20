import { initCustomizer } from "./customizer.js";

const templates = {
  "purchase-confirmation": {
    title: "Purchase Confirmation Emailer",
    file: "./templates/purchase-confirmation.html",
    background: "#f4f4f4",
    brand: "#00bfa5",
  },
  "product-confirmation": {
    title: "Product Confirmation Emailer",
    file: "./templates/product-confirmation.html",
    background: "#f4f4f4",
  },
  "ecommerce-order": {
    title: "Ecommerce Order Emailer",
    file: "./templates/ecommerce-order.html",
    background: "#fff5f0",
    brand: "#ff4d4d",
  },
  "shipping-confirmation": {
    title: "Shipping Confirmation Emailer",
    file: "./templates/shipping-confirmation.html",
    background: "#eff6ff",
    brand: "#2563eb",
  },
  "promotional-offer": {
    title: "Promotional Offer Emailer",
    file: "./templates/promotional-offer.html",
    background: "#ff9b12",
    brand: "#ff9b12",
  },
  "shopping-deals": {
    title: "Shopping Deals Emailer",
    file: "./templates/shopping-deals.html",
    background: "#f4f4f4",
    brand: "#7cff64",
  },
  "gift-decor": {
    title: "Gift Decor Emailer",
    file: "./templates/gift-decor.html",
    background: "rgb(36, 3, 54)",
    brand: "#ffd700",
    accent: "#663399",
  },
  "product-announcements": {
    title: "Product Announcements Emailer",
    file: "./templates/product-announcements.html",
    background: "#ffffff",
    brand: "#4f46e5",
    pinned: ["#dcfce7", "#f0fdf4", "#166534"],
  },
  "ai-newsletter": {
    title: "AI Newsletter Emailer",
    file: "./templates/ai-newsletter.html",
    background: "#06120d",
    brand: "#007bff",
  },
  "music-event-promotion": {
    title: "Music Event Promotion Emailer",
    file: "./templates/music-event-promotion.html",
    background: "#f4f4f4",
    brand: "#ffd700",
    accent: "#007bff",
  },
  "abandoned-cart": {
    title: "Abandoned Cart Emailer",
    file: "./templates/abandoned-cart.html",
    background: "#ffffff",
    brand: "#0ea5e9",
  },
  "password-reset": {
    title: "Password Reset Emailer",
    file: "./templates/password-reset.html",
    background: "#f4f4f4",
    brand: "#667eea",
  },
  "account-verification": {
    title: "Account Verification Emailer",
    file: "./templates/account-verification.html",
    background: "#fafaf9",
    brand: "#d4a574",
    themedExtra: ["#8b7355", "#a8998a", "#5c4b37", "#e8e3dd"],
  },
  "supabase-confirm-signup": {
    title: "Supabase Confirm Signup",
    file: "./templates/supabase-confirm-signup.html",
    background: "#f3f4f6",
    brand: "#4f46e5",
    back: "./supabase.html",
    integration: "Supabase",
  },
  "supabase-email-otp": {
    title: "Supabase Email OTP",
    file: "./templates/supabase-email-otp.html",
    background: "#f3f4f6",
    brand: "#4f46e5",
    back: "./supabase.html",
    integration: "Supabase",
  },
  "supabase-magic-link": {
    title: "Supabase Magic Link",
    file: "./templates/supabase-magic-link.html",
    background: "#f3f4f6",
    brand: "#4f46e5",
    back: "./supabase.html",
    integration: "Supabase",
  },
  "supabase-reset-password": {
    title: "Supabase Reset Password",
    file: "./templates/supabase-reset-password.html",
    background: "#f3f4f6",
    brand: "#4f46e5",
    back: "./supabase.html",
    integration: "Supabase",
  },
  "welcome-onboarding": {
    title: "Welcome Onboarding Emailer",
    file: "./templates/welcome-onboarding.html",
    background: "#f4f4f4",
    brand: "#f59e0b",
  },
  "product-review": {
    title: "Product Review HTML Template",
    file: "./templates/product-review.html",
    background: "#f4f4f4",
    brand: "#065f46",
  },
  reengagement: {
    title: "Re-engagement HTML Email",
    file: "./templates/reengagement.html",
    background: "#f8fafc",
    brand: "#f97316",
  },
  "account-billing-update": {
    title: "Account & Billing Update Emailer",
    file: "./templates/account-billing-update.html",
    background: "#eef2f7",
    brand: "#2563eb",
    pinned: ["#f59e0b"],
  },
  "product-promotion": {
    title: "Product Promotion HTML Email Template",
    file: "./templates/product-promotion.html",
    background: "#141a08",
    brand: "#c9d36a",
  },
};

const params = new URLSearchParams(window.location.search);
const id = params.get("template") || "purchase-confirmation";
const template = templates[id] || templates["purchase-confirmation"];
const plainTextFile = template.file.replace(/\.html$/, ".txt");
const title = `${template.title} | Email Template Preview`;
const titleNode = document.getElementById("template-title");
const backLink = document.getElementById("back-link");
const frame = document.getElementById("template-frame");
const frameShell = document.getElementById("frame-shell");
const frameScaler = document.getElementById("frame-scaler");
const stage = document.getElementById("preview-stage");
const downloadLink = document.getElementById("download-link");
const copyMenu = document.getElementById("copy-menu");
const copyMenuButton = document.getElementById("copy-menu-button");
const copyMenuList = document.getElementById("copy-menu-list");
const copyHtmlMenuItem = document.getElementById("copy-html-menu-item");
const copyTextMenuItem = document.getElementById("copy-text-menu-item");
const FRAME_MIN_WIDTH = 600;
let frameResizeObservers = [];

const getFallbackFrameHeight = () =>
  window.innerHeight - document.querySelector(".preview-toolbar").offsetHeight;

document.title = title;
titleNode.textContent = template.title;
backLink.href = template.back || "./index.html";
backLink.setAttribute(
  "aria-label",
  template.back ? `Back to ${template.integration} templates` : "Back to templates",
);
frame.src = template.file;
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

const getFrameContentWidth = () => {
  try {
    const doc = frame.contentDocument;
    if (!doc) return FRAME_MIN_WIDTH;
    return Math.max(
      FRAME_MIN_WIDTH,
      doc.body?.scrollWidth || 0,
      doc.documentElement?.scrollWidth || 0,
    );
  } catch (error) {
    return FRAME_MIN_WIDTH;
  }
};

const bindFrameContentResize = () => {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    frameResizeObservers.forEach((observer) => observer.disconnect());
    frameResizeObservers = [];

    const syncSoon = () => requestAnimationFrame(syncPreviewSize);
    doc.querySelectorAll("img").forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", syncSoon, { once: true });
        image.addEventListener("error", syncSoon, { once: true });
      }
    });

    const rootObserver = new ResizeObserver(syncSoon);
    rootObserver.observe(doc.documentElement);
    frameResizeObservers.push(rootObserver);

    if (doc.body) {
      const bodyObserver = new ResizeObserver(syncSoon);
      bodyObserver.observe(doc.body);
      frameResizeObservers.push(bodyObserver);
    }
  } catch (error) {
    // Same-origin previews should be readable; ignore if a browser blocks access.
  }
};

const syncPreviewSize = () => {
  const frameWidth = getFrameContentWidth();
  const frameHeight = getFrameContentHeight();
  frameShell.style.setProperty("--frame-width", `${frameWidth}px`);
  frame.style.width = `${frameWidth}px`;
  frame.style.height = `${frameHeight}px`;
  frameScaler.style.height = `${frameHeight}px`;
  frameScaler.style.width = `${frameWidth}px`;
};

const syncToolbarHeight = () => {
  document.documentElement.style.setProperty(
    "--bar-height",
    `${document.querySelector(".preview-toolbar").offsetHeight}px`,
  );
  requestAnimationFrame(syncPreviewSize);
};

frame.addEventListener("load", () => {
  bindFrameContentResize();
  syncPreviewSize();
});
window.addEventListener("resize", () => {
  syncToolbarHeight();
});

new ResizeObserver(syncToolbarHeight).observe(
  document.querySelector(".preview-toolbar"),
);

const setCopyMenuOpen = (isOpen) => {
  copyMenuList.hidden = !isOpen;
  copyMenuButton.setAttribute("aria-expanded", String(isOpen));
};

const getFileContent = async (file) => {
  const response = await fetch(file);
  if (!response.ok) throw new Error("Unable to load template");
  return response.text();
};

const copyFileToClipboard = async (button, getContent, successText) => {
  const original = button.innerHTML;
  button.disabled = true;
  try {
    const content = await getContent();
    await navigator.clipboard.writeText(content);
    button.textContent = successText;
    setTimeout(() => {
      button.innerHTML = original;
      button.disabled = false;
    }, 1400);
  } catch (error) {
    button.textContent = "Copy failed";
    setTimeout(() => {
      button.innerHTML = original;
      button.disabled = false;
    }, 1600);
  }
};

copyMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (copyMenuButton.disabled) return;
  setCopyMenuOpen(copyMenuList.hidden);
});

copyHtmlMenuItem.addEventListener("click", () => {
  setCopyMenuOpen(false);
  copyFileToClipboard(
    copyMenuButton,
    () => currentHtml ?? getFileContent(template.file),
    "HTML copied",
  );
});

copyTextMenuItem.addEventListener("click", () => {
  setCopyMenuOpen(false);
  copyFileToClipboard(
    copyMenuButton,
    () => getFileContent(plainTextFile),
    "Text copied",
  );
});

document.addEventListener("click", (event) => {
  if (!copyMenu.contains(event.target)) setCopyMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setCopyMenuOpen(false);
});

let currentHtml = null;
let downloadBlobUrl = null;

if (template.brand) {
  initCustomizer({
    brand: template.brand,
    accent: template.accent,
    background: template.background,
    pinned: template.pinned,
    themedExtra: template.themedExtra,
    loadHtml: () => getFileContent(template.file),
    onApply: ({ html, background }) => {
      currentHtml = html;
      frame.srcdoc = html;
      stage.style.setProperty("--template-bg", background);
      if (downloadBlobUrl) URL.revokeObjectURL(downloadBlobUrl);
      downloadBlobUrl = URL.createObjectURL(
        new Blob([html], { type: "text/html" }),
      );
      downloadLink.href = downloadBlobUrl;
    },
  });
}
