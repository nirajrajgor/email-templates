// Re-theme a template's saturated palette while preserving relative shades.

import {
  clamp01,
  hexToRgba,
  hslToRgb,
  rgbToHex,
  rgbToHsl,
} from "./color.js";

const SATURATION_MIN = 0.3;
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const SWATCHES = [
  ["original", "Original"],
  ["#4f46e5", "Indigo"],
  ["#0ea5e9", "Sky"],
  ["#059669", "Emerald"],
  ["#d97706", "Amber"],
  ["#e11d48", "Rose"],
  ["#7c3aed", "Violet"],
];

const renderSwatches = (section) => {
  const colorRole = section.dataset.colorControl;
  section.querySelector(".swatch-row").innerHTML = SWATCHES.map(
    ([value, name]) => `
      <button class="swatch" type="button" aria-pressed="false"
        data-swatch="${value}" title="${name}"
        aria-label="${value === "original" ? `Original ${colorRole} color` : name}"
        ${value === "original" ? "" : `style="--swatch: ${value}"`}>
        <span class="swatch-dot" aria-hidden="true"></span>
        <span class="swatch-name">${name}</span>
      </button>`,
  ).join("");
};

// Shift hue by delta and scale saturation/lightness relative to the brand color,
// preserving tint and shade relationships without clipping.
const remapHsl = (hsl, from, to) => {
  const h = (to.h + (hsl.h - from.h) + 360) % 360;
  const s = from.s > 0 ? clamp01(hsl.s * (to.s / from.s)) : hsl.s;
  const offset = hsl.l - from.l;
  const l =
    offset >= 0
      ? clamp01(to.l + (from.l >= 1 ? 0 : offset * ((1 - to.l) / (1 - from.l))))
      : clamp01(to.l + (from.l <= 0 ? 0 : offset * (to.l / from.l)));
  return { h, s, l };
};

const HEX_TOKEN =
  "#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-f])";
const RGB_TOKEN =
  "rgba?\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*(?:,\\s*(?:\\d*\\.)?\\d+\\s*)?\\)";
const COLOR_TOKEN_RE = new RegExp(`${HEX_TOKEN}|${RGB_TOKEN}`, "gi");

// Limit replacements to style, SVG, and Outlook VML contexts so hex-like text
// such as order numbers is never modified.
const STYLE_CONTEXT_RE =
  /<style\b[\s\S]*?<\/style>|\b(?:style|bgcolor|color|fillcolor|strokecolor|fill|stroke)\s*=\s*(?:"[^"]*"|'[^']*')/gi;

const parseColorToken = (token) => {
  if (token.startsWith("#")) return hexToRgba(token);
  const numbers = token.match(/[\d.]+/g).map(Number);
  return { r: numbers[0], g: numbers[1], b: numbers[2], a: numbers[3] ?? 1 };
};

const rgbKey = ({ r, g, b }) => `${r},${g},${b}`;

const hueDistance = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// Map each color through its nearest hue anchor so brand and accent stay separate.
const buildAnchors = (pairs) =>
  pairs.map(({ from, to }) => ({
    identity: from.toLowerCase() === to.toLowerCase(),
    from: rgbToHsl(hexToRgba(from)),
    to: rgbToHsl(hexToRgba(to)),
  }));

// Keep semantic colors pinned; themedExtra opts muted brand colors into mapping.
const buildOptions = ({ pinned = [], themedExtra = [] } = {}) => ({
  pinned: new Set(pinned.map((c) => rgbKey(hexToRgba(c)))),
  themedExtra: new Set(themedExtra.map((c) => rgbKey(hexToRgba(c)))),
});

const transformToken = (token, anchors, options) => {
  const rgba = parseColorToken(token);
  const key = rgbKey(rgba);
  if (options.pinned.has(key)) return token;
  const hsl = rgbToHsl(rgba);
  if (hsl.s < SATURATION_MIN && !options.themedExtra.has(key)) return token;

  const anchor = anchors.reduce((best, candidate) =>
    hueDistance(hsl.h, candidate.from.h) < hueDistance(hsl.h, best.from.h)
      ? candidate
      : best,
  );
  if (anchor.identity) return token;

  const mapped = hslToRgb(remapHsl(hsl, anchor.from, anchor.to));
  if (token.startsWith("#")) {
    const hex = rgbToHex(mapped);
    return rgba.a < 1
      ? hex +
          Math.round(rgba.a * 255)
            .toString(16)
            .padStart(2, "0")
      : hex;
  }
  return token.toLowerCase().startsWith("rgba")
    ? `rgba(${mapped.r}, ${mapped.g}, ${mapped.b}, ${rgba.a})`
    : `rgb(${mapped.r}, ${mapped.g}, ${mapped.b})`;
};

export const rethemeHtml = (html, pairs, overrides) => {
  const anchors = buildAnchors(pairs);
  const options = buildOptions(overrides);
  return html.replace(STYLE_CONTEXT_RE, (chunk) =>
    chunk.replace(COLOR_TOKEN_RE, (token) =>
      transformToken(token, anchors, options),
    ),
  );
};

export const rethemeCssColor = (color, pairs, overrides) => {
  const match = color.match(COLOR_TOKEN_RE);
  if (!match || match[0] !== color.trim()) return color;
  return transformToken(
    color.trim(),
    buildAnchors(pairs),
    buildOptions(overrides),
  );
};

const initColorControl = (section, original, onPick) => {
  renderSwatches(section);
  const swatches = Array.from(section.querySelectorAll("[data-swatch]"));
  const colorInput = section.querySelector('input[type="color"]');
  const hexInput = section.querySelector('input[type="text"]');
  const originalSwatch = section.querySelector('[data-swatch="original"]');
  originalSwatch.style.setProperty("--swatch", original);

  const error = document.createElement("p");
  error.className = "customize-error";
  error.hidden = true;
  error.textContent = "Enter a 6-digit hex color, like #2563eb.";
  hexInput.parentElement.insertAdjacentElement("afterend", error);

  const state = { value: original };

  const setError = (isInvalid) => {
    error.hidden = !isInvalid;
    hexInput.classList.toggle("is-invalid", isInvalid);
    hexInput.setAttribute("aria-invalid", String(isInvalid));
  };

  const setActiveSwatch = (predicate) => {
    swatches.forEach((swatch) => {
      const isActive = predicate(swatch);
      swatch.classList.toggle("is-active", isActive);
      swatch.setAttribute("aria-pressed", String(isActive));
    });
  };

  const setValue = (hex, activeSwatch = null) => {
    state.value = hex;
    colorInput.value = hex;
    hexInput.value = hex;
    setError(false);
    setActiveSwatch((swatch) => swatch === activeSwatch);
  };
  setValue(original, originalSwatch);

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      setValue(
        swatch.dataset.swatch === "original" ? original : swatch.dataset.swatch,
        swatch,
      );
      onPick();
    });
  });

  // Re-theme once after a burst of picker or keyboard input.
  let debounceTimer;
  const applySoon = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onPick, 150);
  };

  colorInput.addEventListener("input", () => {
    setValue(colorInput.value);
    applySoon();
  });

  const normalize = (raw) => raw.trim().replace(/^#?([0-9a-f]{6})$/i, "#$1");

  hexInput.addEventListener("input", () => {
    const value = normalize(hexInput.value);
    if (!HEX_COLOR_RE.test(value)) {
      setError(hexInput.value.trim().length > 0);
      return;
    }
    state.value = value;
    colorInput.value = value;
    setError(false);
    setActiveSwatch(
      (swatch) =>
        (swatch.dataset.swatch || "").toLowerCase() === value.toLowerCase(),
    );
    applySoon();
  });

  // Restore the last good value if the field is left in an invalid state.
  hexInput.addEventListener("blur", () => {
    if (!HEX_COLOR_RE.test(normalize(hexInput.value))) {
      hexInput.value = state.value;
      setError(false);
    }
  });

  return { state };
};

export const initCustomizer = ({
  brand,
  accent,
  background,
  pinned,
  themedExtra,
  loadHtml,
  onApply,
}) => {
  const panel = document.getElementById("customize-panel");
  const brandSection = panel.querySelector('[data-color-control="brand"]');
  const accentSection = panel.querySelector('[data-color-control="accent"]');

  // The markup ships hidden, so templates that never call this skip the rail.
  panel.hidden = false;

  let originalHtml = null;
  const ensureHtml = async () => (originalHtml ??= await loadHtml());

  const applyTheme = async () => {
    const html = await ensureHtml();
    const pairs = [{ from: brand, to: brandControl.state.value }];
    if (accentControl) {
      pairs.push({ from: accent, to: accentControl.state.value });
    }
    const isOriginal = pairs.every(
      ({ from, to }) => from.toLowerCase() === to.toLowerCase(),
    );
    const overrides = { pinned, themedExtra };
    onApply({
      html: isOriginal ? html : rethemeHtml(html, pairs, overrides),
      background: isOriginal
        ? background
        : rethemeCssColor(background, pairs, overrides),
    });
  };

  const brandControl = initColorControl(brandSection, brand, applyTheme);
  let accentControl = null;
  if (accent) {
    accentSection.hidden = false;
    accentControl = initColorControl(accentSection, accent, applyTheme);
  }
};
