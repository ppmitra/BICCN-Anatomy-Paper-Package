document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.searchable-table-wrapper').forEach(wrapper => {
    const input = wrapper.querySelector('.table-search-input');
    const rows = Array.from(wrapper.querySelectorAll('.data-row'));
    if (!input || !rows.length) return;

    const searchTexts = rows.map(row => row.textContent.toLowerCase());
    const index = lunr(function () {
      this.ref('id');
      this.field('content');
      searchTexts.forEach((text, i) => this.add({ id: i, content: text }));
    });
    let debounceTimer;

    const filter = (q) => {
      if (q === '') {
        rows.forEach(row => { row.style.display = ''; });
        return;
      }
      let matchSet = new Set();
      try {
        const results = index.search(q);
        results.forEach(r => matchSet.add(parseInt(r.ref, 10)));
      } catch (_) {}
      if (matchSet.size === 0) {
        searchTexts.forEach((text, i) => {
          if (text.includes(q)) matchSet.add(i);
        });
      }
      rows.forEach((row, i) => {
        row.style.display = matchSet.has(i) ? '' : 'none';
      });
    };

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => filter(input.value.trim().toLowerCase()), 80);
    });
  });
});
