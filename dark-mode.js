// Approximate common dark-mode transformations for visual stress testing.

import { hslToRgb, relativeLuminance, rgbToHsl } from "./color.js";

const ATTR = "data-dark-sim-original";

const SKIP_TAGS = ["IMG", "PICTURE", "VIDEO", "SVG"];

const LIGHT_BG_LUMINANCE = 0.62;
const DARK_TEXT_LUMINANCE = 0.38;
const INVERT_FLOOR = 0.05;
const INVERT_RANGE = 0.9;

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

// Ends are compressed: clients land white on dark grey, not pure black.
const darkenSurface = (hsl) => ({ ...hsl, l: 0.06 + (1 - hsl.l) * 0.3 });
const lightenInk = (hsl) => ({ ...hsl, l: 0.95 - hsl.l * 0.3 });

const invertChannel = (value) =>
  Math.round(255 * (INVERT_FLOOR + (1 - value / 255) * INVERT_RANGE));

export const invertRgb = ({ r, g, b }) => ({
  r: invertChannel(r),
  g: invertChannel(g),
  b: invertChannel(b),
});

const remap = (color, role, mode) => {
  if (mode === "full") return invertRgb(color);

  const hsl = rgbToHsl(color);
  const luminance = relativeLuminance(color);
  if (role === "background") {
    return luminance >= LIGHT_BG_LUMINANCE
      ? hslToRgb(darkenSurface(hsl))
      : null;
  }
  return luminance <= DARK_TEXT_LUMINANCE
    ? hslToRgb(lightenInk(hsl))
    : null;
};

const applyProperty = (element, property, computed, role, mode, originals) => {
  const color = parseColor(computed);
  if (!color) return;

  const next = remap(color, role, mode);
  if (!next) return;

  originals[property] = element.style[property];
  element.style[property] = toCss(next, color.a);
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
