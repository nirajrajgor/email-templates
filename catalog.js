const searchInput = document.getElementById("template-search");
const resultCount = document.getElementById("template-result-count");
const emptyState = document.getElementById("template-empty-state");
const clearFiltersButton = document.getElementById("template-clear-filters");
const filterButtons = document.querySelectorAll(
  ".filter-pill[data-filter-value]",
);
const tagButtons = document.querySelectorAll(".catalog-tag[data-filter-value]");
const grid = document.getElementById("template-grid");

const getCardSearchText = (card) => {
  const title = card.querySelector("h2")?.textContent ?? "";
  const description =
    card.querySelector(".catalog-card-copy, .integration-card-link > p")
      ?.textContent ?? "";
  const categories = card.dataset.category ?? "";

  return `${title} ${description} ${categories}`.toLowerCase();
};

const toCardData = (card) => ({
  card,
  categories: card.dataset.category.trim().split(/\s+/),
  searchText: getCardSearchText(card),
  type: card.hasAttribute("data-integration-card") ? "collection" : "template",
});

const cards = Array.from(
  document.querySelectorAll("#template-grid > article"),
).map(toCardData);

const state = {
  category: "all",
  query: "",
};

const setActiveCategory = (category) => {
  state.category = category;

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filterValue === category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  tagButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.filterValue === category,
    );
  });
};

const matchesCard = ({ categories, searchText }, terms) => {
  const matchesCategory =
    state.category === "all" || categories.includes(state.category);

  return matchesCategory && terms.every((term) => searchText.includes(term));
};

const syncUrl = () => {
  const params = new URLSearchParams();
  if (state.category !== "all") params.set("category", state.category);
  if (state.query.trim()) params.set("q", state.query.trim());

  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    query ? `${window.location.pathname}?${query}` : window.location.pathname,
  );
};

const renderResults = () => {
  const terms = state.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visible = { template: 0, collection: 0 };

  cards.forEach((cardData) => {
    const isVisible = matchesCard(cardData, terms);
    const { card, type } = cardData;
    card.hidden = !isVisible;
    if (isVisible) visible[type] += 1;
  });

  const formatCount = (count, singular, plural) =>
    `${count} ${count === 1 ? singular : plural}`;
  const visibleParts = [];

  if (visible.template > 0) {
    visibleParts.push(formatCount(visible.template, "template", "templates"));
  }

  if (visible.collection > 0) {
    visibleParts.push(
      formatCount(visible.collection, "collection", "collections"),
    );
  }

  resultCount.textContent = visibleParts.join(" · ") || "0 templates";
  emptyState.hidden = visible.template > 0 || visible.collection > 0;
  syncUrl();
};

const applyCategory = (category, { scrollIntoView = false } = {}) => {
  setActiveCategory(category);
  renderResults();

  if (scrollIntoView && grid) {
    const top = grid.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
};

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyCategory(button.dataset.filterValue);
  });
});

tagButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const next =
      state.category === button.dataset.filterValue
        ? "all"
        : button.dataset.filterValue;
    applyCategory(next, { scrollIntoView: true });
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderResults();
});

clearFiltersButton?.addEventListener("click", () => {
  state.query = "";
  searchInput.value = "";
  applyCategory("all");
  searchInput.focus();
});

const initFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const query = params.get("q");

  if (query) {
    state.query = query;
    searchInput.value = query;
  }

  const isKnownCategory = Array.from(filterButtons).some(
    (button) => button.dataset.filterValue === category,
  );

  setActiveCategory(isKnownCategory ? category : "all");
};

initFromUrl();
renderResults();
