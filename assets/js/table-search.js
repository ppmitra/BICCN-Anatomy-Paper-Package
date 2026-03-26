(function () {
  var TABLE_CONFIG = {
    's4-full': {
      hide: { exact: ['QC', 'Comments', 'Metadata Submission'] }
    },
    's4-allen': {
      hide: {
        exact: ['Download Link', 'Visualization Link'],
        regex: [/^Soma_[XYZ]\(/]
      }
    },
    's4-local': {
      hide: { exact: ['QC', 'Metadata Submission', 'Comments'] }
    },
    's6': {
      rename: { 'R24 Name': 'Imaging Database', 'R24 Link': 'Imaging Datalink' }
    }
  };

  function columnHidden(name, hideRules) {
    if (!hideRules) return false;
    var n = String(name).trim();
    if (hideRules.exact) {
      for (var i = 0; i < hideRules.exact.length; i++) {
        if (hideRules.exact[i] === n) return true;
      }
    }
    if (hideRules.regex) {
      for (var j = 0; j < hideRules.regex.length; j++) {
        if (hideRules.regex[j].test(n)) return true;
      }
    }
    return false;
  }

  function applyColumnConfig(headerRow, dataRows, cfg) {
    if (!cfg) return { headers: headerRow, rows: dataRows };
    var rename = cfg.rename || {};
    var hide = cfg.hide;
    var keep = [];
    var i;
    for (i = 0; i < headerRow.length; i++) {
      var orig = String(headerRow[i]).trim();
      if (columnHidden(orig, hide)) continue;
      keep.push(i);
    }
    var newHeaders = keep.map(function (idx) {
      var o = String(headerRow[idx]).trim();
      return rename[o] !== undefined ? rename[o] : o;
    });
    var newRows = dataRows.map(function (row) {
      return keep.map(function (idx) {
        return row[idx] != null ? row[idx] : '';
      });
    });
    return { headers: newHeaders, rows: newRows };
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (inQuotes) {
        field += c;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else if (c === '\r') {
        if (text[i + 1] !== '\n') {
          row.push(field);
          field = '';
          rows.push(row);
          row = [];
        }
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function isURL(s) {
    return typeof s === 'string' && (s.indexOf('http://') === 0 || s.indexOf('https://') === 0);
  }

  function renderCell(val) {
    const s = escapeHtml(String(val == null ? '' : val));
    if (isURL(s)) {
      const display = s.length > 60 ? s.slice(0, 60) + '…' : s;
      return '<a href="' + escapeHtml(s) + '" target="_blank" rel="noopener">' + escapeHtml(display) + '</a>';
    }
    return s;
  }

  function buildTable(headerRow, dataRows) {
    const thead = document.createElement('thead');
    const headerTr = document.createElement('tr');
    headerRow.forEach(function (h) {
      const th = document.createElement('th');
      th.textContent = h;
      headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);

    const tbody = document.createElement('tbody');
    dataRows.forEach(function (row) {
      const tr = document.createElement('tr');
      tr.className = 'data-row';
      row.forEach(function (cell) {
        const td = document.createElement('td');
        td.innerHTML = renderCell(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    const table = document.createElement('table');
    table.className = 'data-table';
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  function initSearch(wrapper) {
    const input = wrapper.querySelector('.table-search-input');
    const rows = Array.from(wrapper.querySelectorAll('.data-row'));
    if (!input || !rows.length) return;

    input.disabled = false;
    const searchTexts = rows.map(function (row) { return row.textContent.toLowerCase(); });
    const index = lunr(function () {
      this.ref('id');
      this.field('content');
      searchTexts.forEach(function (text, i) {
        this.add({ id: i, content: text });
      }, this);
    });
    let debounceTimer;

    function filter(q) {
      if (q === '') {
        rows.forEach(function (row) { row.style.display = ''; });
        return;
      }
      var matchSet = new Set();
      try {
        index.search(q).forEach(function (r) { matchSet.add(parseInt(r.ref, 10)); });
      } catch (_) {}
      if (matchSet.size === 0) {
        searchTexts.forEach(function (text, i) {
          if (text.indexOf(q) !== -1) matchSet.add(i);
        });
      }
      rows.forEach(function (row, i) {
        row.style.display = matchSet.has(i) ? '' : 'none';
      });
    }

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        filter(input.value.trim().toLowerCase());
      }, 80);
    });
  }

  function loadAndRender(wrapper) {
    const src = wrapper.getAttribute('data-src');
    if (!src) return;

    wrapper.removeAttribute('data-src');
    const container = wrapper.querySelector('.table-scroll-container');
    if (!container) return;

    const configKey = wrapper.getAttribute('data-table-config');
    const colCfg = configKey && TABLE_CONFIG[configKey] ? TABLE_CONFIG[configKey] : null;

    fetch(src)
      .then(function (r) { return r.text(); })
      .then(function (text) {
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const rows = parseCSV(text);
        if (rows.length < 2) {
          container.innerHTML = '<p class="table-error">No data or invalid CSV.</p>';
          return;
        }
        let headerRow = rows[0];
        let dataRows = rows.slice(1);
        const out = applyColumnConfig(headerRow, dataRows, colCfg);
        headerRow = out.headers;
        dataRows = out.rows;
        container.innerHTML = '';
        container.appendChild(buildTable(headerRow, dataRows));
        initSearch(wrapper);
      })
      .catch(function () {
        container.innerHTML = '<p class="table-error">Failed to load table data.</p>';
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var wrappersWithData = [];
    document.querySelectorAll('.searchable-table-wrapper').forEach(function (wrapper) {
      if (wrapper.hasAttribute('data-src')) {
        wrappersWithData.push(wrapper);
      } else {
        initSearch(wrapper);
      }
    });

    if (wrappersWithData.length === 0) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var wrapper = entry.target;
          observer.unobserve(wrapper);
          loadAndRender(wrapper);
        });
      },
      { rootMargin: '200px', threshold: 0 }
    );

    wrappersWithData.forEach(function (wrapper) {
      observer.observe(wrapper);
    });
  });
})();
