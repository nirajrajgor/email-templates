// Header search. It lists every template on every page that has the header,
// because the homepage and category pages each show only some of them.
import metadata from "./scripts/template-metadata.json";
import { buildSearchIndex, search } from "./search-index.js";

const index = buildSearchIndex(metadata);
const LIST_ID = "site-search-list";
const ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';

const root = document.createElement("div");
root.className = "site-search";
root.innerHTML = `
  <button type="button" class="site-search-toggle" aria-label="Search templates" aria-expanded="false">${ICON}</button>
  <div class="site-search-panel">
    <div class="site-search-field">
      ${ICON}
      <input
        class="site-search-input"
        type="text"
        role="combobox"
        aria-label="Search templates"
        aria-expanded="false"
        aria-controls="${LIST_ID}"
        aria-autocomplete="list"
        autocomplete="off"
        spellcheck="false"
        enterkeyhint="go"
        placeholder="Search ${index.templates.length} templates"
      />
    </div>
    <div class="site-search-results" hidden>
      <p class="site-search-status" role="status"></p>
      <div id="${LIST_ID}" role="listbox" aria-label="Templates and collections"></div>
      <p class="site-search-hint" aria-hidden="true">&uarr;&darr; to move &nbsp;&middot;&nbsp; Enter to open &nbsp;&middot;&nbsp; Esc to close</p>
    </div>
  </div>`;

const toggle = root.querySelector(".site-search-toggle");
const input = root.querySelector(".site-search-input");
const results = root.querySelector(".site-search-results");
const status = root.querySelector(".site-search-status");
const list = root.querySelector(`#${LIST_ID}`);

let options = [];
let active = -1;
let isOpen = false;

// Text goes in as text nodes, so a typed query can never become markup.
const el = (tag, className, ...children) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
};

const option = (href, ...children) => {
  const link = el("a", "site-search-option", ...children);
  link.href = href;
  link.tabIndex = -1;
  link.setAttribute("role", "option");
  link.setAttribute("aria-selected", "false");
  return link;
};

const collectionOption = ({ label, href, count }) =>
  option(
    href,
    label,
    el("span", "site-search-count", String(count), el("span", "site-search-quiet", " templates")),
  );

const templateOption = ({ name, image, collection, href }) => {
  const thumbnail = el("img");
  thumbnail.src = `./${image}`;
  thumbnail.alt = "";
  thumbnail.loading = "lazy";
  thumbnail.width = 44;
  thumbnail.height = 44;

  return option(
    href,
    thumbnail,
    el(
      "span",
      "",
      el("span", "site-search-name", name),
      el("span", "site-search-collection", collection),
    ),
  );
};

const group = (label, groupOptions) => {
  const heading = el("p", "site-search-label", label);
  heading.setAttribute("aria-hidden", "true");

  const node = el("div", "", heading, ...groupOptions);
  node.setAttribute("role", "group");
  node.setAttribute("aria-label", label);
  return node;
};

function setActive(next) {
  active = next;
  options.forEach((node, position) => {
    node.setAttribute("aria-selected", String(position === active));
  });

  const current = options[active];
  if (current) {
    input.setAttribute("aria-activedescendant", current.id);
    current.scrollIntoView({ block: "nearest" });
  } else {
    input.removeAttribute("aria-activedescendant");
  }
}

function render() {
  const query = input.value.trim();
  const found = search(index, query);
  const hasMatches = found.collections.length + found.templates.length > 0;
  const groups = [];

  if (!hasMatches) {
    groups.push(group("Browse collections", index.collections.map(collectionOption)));
  }
  if (found.collections.length) {
    groups.push(group("Collections", found.collections.map(collectionOption)));
  }
  if (found.templates.length) {
    groups.push(group("Templates", found.templates.map(templateOption)));
  }
  list.replaceChildren(...groups);

  // A miss is shown to everyone. A count is only announced to screen readers.
  const count = found.templates.length;
  const isMiss = Boolean(query) && !hasMatches;
  status.textContent = isMiss
    ? `No templates match “${query}”`
    : query && `${count} template${count === 1 ? "" : "s"}`;
  status.classList.toggle("site-search-quiet", !isMiss);

  options = [...list.querySelectorAll('[role="option"]')];
  options.forEach((node, position) => {
    node.id = `site-search-option-${position}`;
  });
  // Enter opens the top match, but never a collection the visitor did not pick.
  setActive(hasMatches ? 0 : -1);
}

function setOpen(open) {
  if (open === isOpen) return;
  isOpen = open;
  root.dataset.open = String(open);
  results.hidden = !open;
  input.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-expanded", String(open));
  if (open) render();
}

// The toggle is only displayed where the field is tucked into a panel.
const usesPanel = () => toggle.offsetParent !== null;

function close() {
  const hadFocus = root.contains(document.activeElement);
  setOpen(false);
  if (hadFocus && usesPanel()) toggle.focus();
}

toggle.addEventListener("click", () => {
  if (isOpen) return close();
  setOpen(true);
  input.focus();
});

input.addEventListener("focus", () => setOpen(true));
input.addEventListener("click", () => setOpen(true));
input.addEventListener("input", () => {
  setOpen(true);
  render();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    setOpen(true);
    if (options.length === 0) return;
    const step = event.key === "ArrowDown" ? 1 : -1;
    // From no selection, down goes to the first option and up to the last.
    const from = active === -1 && step === -1 ? 0 : active;
    setActive((from + step + options.length) % options.length);
  } else if (event.key === "Enter" && isOpen && options[active]) {
    event.preventDefault();
    options[active].click();
  } else if (event.key === "Escape" && isOpen) {
    event.preventDefault();
    close();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (isOpen && !root.contains(event.target)) setOpen(false);
});
root.addEventListener("focusout", (event) => {
  if (event.relatedTarget && !root.contains(event.relatedTarget)) setOpen(false);
});

document.querySelector("header .header-actions")?.before(root);
