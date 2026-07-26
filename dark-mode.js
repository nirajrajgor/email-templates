// Simulate per-element client transformations: partial inversion changes light
// surfaces and dark text, while full inversion remaps every color.

import {
  contrastRatio,
  hslToRgb,
  relativeLuminance,
  rgbToHsl,
} from "./color.js";

const ATTR = "data-dark-sim-original";

const SKIP_TAGS = ["IMG", "PICTURE", "VIDEO", "SVG"];

const LIGHT_BG_LUMINANCE = 0.62;
const DARK_TEXT_LUMINANCE = 0.38;
// This intentionally flags only effectively unreadable text, not every WCAG
// failure. A higher threshold overwhelms the simulation with false positives.
export const SEVERE_CONTRAST_RATIO = 1.5;

const parseColor = (value) => {
  if (!value) return null;
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => parseFloat(part.trim()));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  const alpha = parts.length > 3 ? parts[3] : 1;
  if (alpha === 0) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: alpha };
};

const toCss = ({ r, g, b }, a) =>
  a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;

const composite = (foreground, background) => {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return null;

  return {
    r:
      (foreground.r * foreground.a +
        background.r * background.a * (1 - foreground.a)) /
      alpha,
    g:
      (foreground.g * foreground.a +
        background.g * background.a * (1 - foreground.a)) /
      alpha,
    b:
      (foreground.b * foreground.a +
        background.b * background.a * (1 - foreground.a)) /
      alpha,
    a: alpha,
  };
};

// Resolve solid ancestor layers; images and element opacity require pixel sampling.
const effectiveBackground = (element) => {
  const layers = [];

  for (let current = element; current; current = current.parentElement) {
    const computed =
      current.ownerDocument.defaultView?.getComputedStyle(current);
    if (!computed) return null;
    if (computed.backgroundImage !== "none" || Number(computed.opacity) < 1) {
      return null;
    }

    const color = parseColor(computed.backgroundColor);
    if (!color) continue;
    layers.push(color);

    if (color.a >= 1) {
      let result = layers.pop();
      while (layers.length) result = composite(layers.pop(), result);
      return result;
    }
  }

  return null;
};

const hasDirectText = (element) =>
  [...element.childNodes].some(
    (node) => node.nodeType === 3 && node.textContent.trim(),
  );

// Measure rendered direct text only when its background resolves to a solid color.
export const auditSimulatedContrast = (
  doc,
  threshold = SEVERE_CONTRAST_RATIO,
) => {
  if (!doc?.body) return { issues: [], uncheckedCount: 0 };

  const issues = [];
  let uncheckedCount = 0;

  doc.body.querySelectorAll("*").forEach((element) => {
    if (!hasDirectText(element) || !element.getClientRects().length) return;
    if (element.closest("svg, picture, video")) return;

    const computed = doc.defaultView?.getComputedStyle(element);
    if (
      !computed ||
      computed.display === "none" ||
      computed.visibility === "hidden" ||
      Number(computed.opacity) === 0
    ) {
      return;
    }

    const foreground = parseColor(computed.color);
    const background = effectiveBackground(element);
    if (!foreground || !background) {
      uncheckedCount += 1;
      return;
    }

    const visibleForeground =
      foreground.a < 1 ? composite(foreground, background) : foreground;
    if (!visibleForeground) {
      uncheckedCount += 1;
      return;
    }

    const contrast = contrastRatio(visibleForeground, background);
    if (contrast < threshold) issues.push({ element, contrast });
  });

  return { issues, uncheckedCount };
};

// Ends are compressed: clients land white on dark grey, not pure black.
const darkenSurface = (hsl) => ({ ...hsl, l: 0.06 + (1 - hsl.l) * 0.3 });
const lightenInk = (hsl) => ({ ...hsl, l: 0.95 - hsl.l * 0.3 });
const invertLightness = (hsl) => ({ ...hsl, l: 0.05 + (1 - hsl.l) * 0.9 });

const remap = (color, role, mode) => {
  const hsl = rgbToHsl(color);
  const luminance = relativeLuminance(color);

  if (mode === "full") return invertLightness(hsl);

  if (role === "background") {
    return luminance >= LIGHT_BG_LUMINANCE ? darkenSurface(hsl) : null;
  }
  return luminance <= DARK_TEXT_LUMINANCE ? lightenInk(hsl) : null;
};

const applyProperty = (element, property, computed, role, mode, originals) => {
  const color = parseColor(computed);
  if (!color) return;

  const next = remap(color, role, mode);
  if (!next) return;

  originals[property] = element.style[property];
  element.style[property] = toCss(hslToRgb(next), color.a);
};

export const applyDarkSimulation = (doc, mode) => {
  if (!doc?.body) return;
  clearDarkSimulation(doc);
  if (!mode) return;

  // Clients never repaint imagery.
  const elements = [
    doc.documentElement,
    doc.body,
    ...doc.body.querySelectorAll("*"),
  ].filter((element) => !SKIP_TAGS.includes(element.tagName));

  // Read every color before writing any: `color` and `borderColor` inherit, so
  // reading after a parent was written would remap its new value a second time.
  const readings = elements.map((element) => {
    const computed = getComputedStyle(element);
    return {
      element,
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      borderColor: computed.borderColor,
    };
  });

  readings.forEach(({ element, backgroundColor, color, borderColor }) => {
    const originals = {};
    applyProperty(
      element,
      "backgroundColor",
      backgroundColor,
      "background",
      mode,
      originals,
    );
    applyProperty(element, "color", color, "text", mode, originals);
    applyProperty(element, "borderColor", borderColor, "text", mode, originals);

    if (Object.keys(originals).length) {
      element.setAttribute(ATTR, JSON.stringify(originals));
    }
  });
};

export const clearDarkSimulation = (doc) => {
  if (!doc?.body) return;
  doc.querySelectorAll(`[${ATTR}]`).forEach((element) => {
    let originals = {};
    try {
      originals = JSON.parse(element.getAttribute(ATTR)) || {};
    } catch (error) {
      originals = {};
    }
    Object.entries(originals).forEach(([property, value]) => {
      element.style[property] = value ?? "";
    });
    element.removeAttribute(ATTR);
  });
};
