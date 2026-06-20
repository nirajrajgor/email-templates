const templates = {
  "purchase-confirmation": {
    title: "Purchase Confirmation Emailer",
    file: "./templates/purchase-confirmation.html",
    background: "#f4f4f4",
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
  },
  "promotional-offer": {
    title: "Promotional Offer Emailer",
    file: "./templates/promotional-offer.html",
    background: "#ff9b12",
  },
  "shopping-deals": {
    title: "Shopping Deals Emailer",
    file: "./templates/shopping-deals.html",
    background: "#f4f4f4",
  },
  "gift-decor": {
    title: "Gift Decor Emailer",
    file: "./templates/gift-decor.html",
    background: "rgb(36, 3, 54)",
  },
  "product-announcements": {
    title: "Product Announcements Emailer",
    file: "./templates/product-announcements.html",
    background: "#ffffff",
  },
  "ai-newsletter": {
    title: "AI Newsletter Emailer",
    file: "./templates/ai-newsletter.html",
    background: "#06120d",
  },
  "music-event-promotion": {
    title: "Music Event Promotion Emailer",
    file: "./templates/music-event-promotion.html",
    background: "#f4f4f4",
  },
  "abandoned-cart": {
    title: "Abandoned Cart Emailer",
    file: "./templates/abandoned-cart.html",
    background: "#ffffff",
  },
  "password-reset": {
    title: "Password Reset Emailer",
    file: "./templates/password-reset.html",
    background: "#f4f4f4",
  },
  "account-verification": {
    title: "Account Verification Emailer",
    file: "./templates/account-verification.html",
    background: "#fafaf9",
  },
  "welcome-onboarding": {
    title: "Welcome Onboarding Emailer",
    file: "./templates/welcome-onboarding.html",
    background: "#f4f4f4",
  },
  "product-review": {
    title: "Product Review HTML Template",
    file: "./templates/product-review.html",
    background: "#f4f4f4",
  },
  reengagement: {
    title: "Re-engagement HTML Email",
    file: "./templates/reengagement.html",
    background: "#f8fafc",
  },
  "account-billing-update": {
    title: "Account & Billing Update Emailer",
    file: "./templates/account-billing-update.html",
    background: "#eef2f7",
  },
  "product-promotion": {
    title: "Product Promotion HTML Email Template",
    file: "./templates/product-promotion.html",
    background: "#141a08",
  },
};

const params = new URLSearchParams(window.location.search);
const id = params.get("template") || "purchase-confirmation";
const template = templates[id] || templates["purchase-confirmation"];
const plainTextFile = template.file.replace(/\.html$/, ".txt");
const title = `${template.title} | Email Template Preview`;
const titleNode = document.getElementById("template-title");
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
frame.src = template.file;
stage.style.setProperty("--template-bg", template.background);
downloadLink.href = template.file;
downloadLink.download = template.file.split("/").pop();

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

const copyFileToClipboard = async (button, file, successText) => {
  const original = button.innerHTML;
  button.disabled = true;
  try {
    const content = await getFileContent(file);
    await writeToClipboard(content);
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

const writeToClipboard = async (content) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content);
      return;
    } catch (error) {
      // Fall back for browsers or contexts that block the async Clipboard API.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("Unable to copy to clipboard");
};

copyMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (copyMenuButton.disabled) return;
  setCopyMenuOpen(copyMenuList.hidden);
});

copyHtmlMenuItem.addEventListener("click", () => {
  if (copyHtmlMenuItem.disabled) return;
  setCopyMenuOpen(false);
  copyFileToClipboard(copyMenuButton, template.file, "HTML copied");
});

copyTextMenuItem.addEventListener("click", () => {
  if (copyTextMenuItem.disabled) return;
  setCopyMenuOpen(false);
  copyFileToClipboard(copyMenuButton, plainTextFile, "Text copied");
});

document.addEventListener("click", (event) => {
  if (!copyMenu.contains(event.target)) setCopyMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setCopyMenuOpen(false);
});
