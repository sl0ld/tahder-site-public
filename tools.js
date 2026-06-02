const searchInput = document.getElementById('tools-search');
const cards = Array.from(document.querySelectorAll('.tool-card'));
const categoryButtons = Array.from(document.querySelectorAll('.category-button'));
const emptyState = document.getElementById('empty-tools');
let activeCategory = 'all';

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

function renderTools() {
  const query = normalize(searchInput.value);
  let visibleCount = 0;

  cards.forEach((card) => {
    const inCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
    const matchesSearch = !query || normalize(`${card.dataset.search} ${card.innerText}`).includes(query);
    card.hidden = !(inCategory && matchesSearch);
    if (!card.hidden) visibleCount += 1;
  });

  emptyState.hidden = visibleCount > 0;
}

categoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    categoryButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderTools();
  });
});

searchInput.addEventListener('input', renderTools);
