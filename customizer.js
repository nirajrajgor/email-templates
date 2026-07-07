// Brand-color customizer: re-themes a template by transforming its whole
// saturated palette relative to one brand color, so tints/shades stay in sync.

const SATURATION_MIN = 0.3;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const hexToRgba = (hex) => {
  let digits = hex.slice(1);
  if (digits.length <= 4) {
    digits = [...digits].map((char) => char + char).join("");
  }
  const int = parseInt(digits.slice(0, 6), 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
    a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
  };
};

const rgbToHsl = ({ r, g, b }) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === red) h = ((green - blue) / delta) % 6;
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;
  h = (h * 60 + 360) % 360;

  return { h, s: clamp01(s), l };
};

const hslToRgb = ({ h, s, l }) => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;
  const sextant = Math.floor(h / 60) % 6;
  const [red, green, blue] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sextant];

  return {
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255),
  };
};

const rgbToHex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

// Shift a color by the same relative move the brand color makes: hue by
// delta, saturation by ratio, lightness proportionally into the headroom
// left above/below the new brand lightness (keeps tints from clipping).
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

const HEX_TOKEN = "#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-f])";
const RGB_TOKEN =
  "rgba?\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*(?:,\\s*(?:\\d*\\.)?\\d+\\s*)?\\)";
const COLOR_TOKEN_RE = new RegExp(`${HEX_TOKEN}|${RGB_TOKEN}`, "gi");

// Only rewrite colors inside style contexts so hex-like text content
// (e.g. "Order number: #6200600") is never touched.
const STYLE_CONTEXT_RE =
  /<style\b[\s\S]*?<\/style>|\b(?:style|bgcolor|color|fill|stroke)\s*=\s*"[^"]*"/gi;

const parseColorToken = (token) => {
  if (token.startsWith("#")) return hexToRgba(token);
  const numbers = token.match(/[\d.]+/g).map(Number);
  return { r: numbers[0], g: numbers[1], b: numbers[2], a: numbers[3] ?? 1 };
};

const rgbKey = ({ r, g, b }) => `${r},${g},${b}`;

// pinned: semantic colors (success badges, warnings) that must never follow
// the brand. themedExtra: colors below the saturation threshold that still
// belong to the brand family (e.g. muted browns in a warm monochrome theme).
const buildOptions = ({ pinned = [], themedExtra = [] } = {}) => ({
  pinned: new Set(pinned.map((c) => rgbKey(hexToRgba(c)))),
  themedExtra: new Set(themedExtra.map((c) => rgbKey(hexToRgba(c)))),
});

const transformToken = (token, from, to, options) => {
  const rgba = parseColorToken(token);
  const key = rgbKey(rgba);
  if (options.pinned.has(key)) return token;
  const hsl = rgbToHsl(rgba);
  if (hsl.s < SATURATION_MIN && !options.themedExtra.has(key)) return token;

  const mapped = hslToRgb(remapHsl(hsl, from, to));
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

export const rethemeHtml = (html, fromBrand, toBrand, overrides) => {
  const from = rgbToHsl(hexToRgba(fromBrand));
  const to = rgbToHsl(hexToRgba(toBrand));
  const options = buildOptions(overrides);
  return html.replace(STYLE_CONTEXT_RE, (chunk) =>
    chunk.replace(COLOR_TOKEN_RE, (token) =>
      transformToken(token, from, to, options),
    ),
  );
};

export const rethemeCssColor = (color, fromBrand, toBrand, overrides) => {
  const match = color.match(COLOR_TOKEN_RE);
  if (!match || match[0] !== color.trim()) return color;
  const from = rgbToHsl(hexToRgba(fromBrand));
  const to = rgbToHsl(hexToRgba(toBrand));
  return transformToken(color.trim(), from, to, buildOptions(overrides));
};

const contrastWithWhite = (hex) => {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const { r, g, b } = hexToRgba(hex);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return 1.05 / (luminance + 0.05);
};

export const initCustomizer = ({
  brand,
  background,
  pinned,
  themedExtra,
  loadHtml,
  onApply,
}) => {
  const menu = document.getElementById("customize-menu");
  const button = document.getElementById("customize-button");
  const panel = document.getElementById("customize-panel");
  const colorInput = document.getElementById("brand-color-input");
  const hexInput = document.getElementById("brand-hex-input");
  const hint = document.getElementById("contrast-hint");
  const swatches = Array.from(panel.querySelectorAll("[data-swatch]"));
  const originalSwatch = panel.querySelector('[data-swatch="original"]');

  button.hidden = false;
  originalSwatch.style.setProperty("--swatch", brand);
  colorInput.value = brand;
  hexInput.value = brand;

  let originalHtml = null;
  const ensureHtml = async () => (originalHtml ??= await loadHtml());

  const setPanelOpen = (isOpen) => {
    panel.hidden = !isOpen;
    button.setAttribute("aria-expanded", String(isOpen));
  };

  const setActiveSwatch = (hex) => {
    swatches.forEach((swatch) => {
      const value =
        swatch.dataset.swatch === "original" ? brand : swatch.dataset.swatch;
      swatch.classList.toggle(
        "is-active",
        value.toLowerCase() === hex.toLowerCase(),
      );
    });
  };

  const applyBrand = async (hex) => {
    const html = await ensureHtml();
    const isOriginal = hex.toLowerCase() === brand.toLowerCase();
    const overrides = { pinned, themedExtra };
    onApply({
      html: isOriginal ? html : rethemeHtml(html, brand, hex, overrides),
      background: isOriginal
        ? background
        : rethemeCssColor(background, brand, hex, overrides),
    });
    colorInput.value = hex;
    hexInput.value = hex;
    setActiveSwatch(hex);
    hint.hidden = isOriginal || contrastWithWhite(hex) >= 3;
  };

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const value =
        swatch.dataset.swatch === "original" ? brand : swatch.dataset.swatch;
      applyBrand(value);
    });
  });

  let debounceTimer;
  colorInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => applyBrand(colorInput.value), 150);
  });

  hexInput.addEventListener("change", () => {
    const value = hexInput.value.trim().replace(/^([0-9a-f]{6})$/i, "#$1");
    if (/^#[0-9a-f]{6}$/i.test(value)) applyBrand(value);
    else hexInput.value = colorInput.value;
  });

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setPanelOpen(panel.hidden);
  });

  panel.addEventListener("click", (event) => event.stopPropagation());

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) setPanelOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setPanelOpen(false);
  });
};
