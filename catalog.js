const searchInput = document.getElementById("template-search");
const resultCount = document.getElementById("template-result-count");
const emptyState = document.getElementById("template-empty-state");
const filterButtons = document.querySelectorAll("[data-filter-value]");

const state = {
  category: "all",
  query: "",
};

const getCardSearchText = (card) => {
  const title = card.querySelector("h2")?.textContent ?? "";
  const description =
    card.querySelector(".catalog-card-meta + p")?.textContent ?? "";

  return `${title} ${description}`.toLowerCase();
};

const cards = Array.from(
  document.querySelectorAll("#template-grid article.wrapper"),
).map((card) => ({
  card,
  categories: card.dataset.category.trim().split(/\s+/),
  searchText: getCardSearchText(card),
}));

const setActiveCategory = (category) => {
  state.category = category;

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filterValue === category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const matchesCard = ({ categories, searchText }, terms) => {
  const matchesCategory =
    state.category === "all" || categories.includes(state.category);

  return matchesCategory && terms.every((term) => searchText.includes(term));
};

const renderResults = () => {
  const terms = state.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let visibleCount = 0;

  cards.forEach(({ card, ...cardData }) => {
    const isVisible = matchesCard(cardData, terms);
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  resultCount.textContent =
    visibleCount === cards.length
      ? `${cards.length} templates`
      : `${visibleCount} of ${cards.length} templates`;
  emptyState.hidden = visibleCount > 0;
};

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveCategory(button.dataset.filterValue);
    renderResults();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderResults();
});

setActiveCategory(state.category);
renderResults();
