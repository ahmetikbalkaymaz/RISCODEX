// Renders Riscodex Gündem from gundem/haberler.json, which a scheduled routine refreshes from the news desk.
// Views: the list (optionally one sector, "#s-enerji") and a single story ("#h-<id>").
(() => {
    const view = document.querySelector('[data-gundem]');
    if (!view) return;
    const updatedLine = document.getElementById('gundem-updated');
    let feed = null;
    let failed = false;
    let query = '';

    const strings = () => {
        const all = window.__landingTranslations || {};
        return (all[document.documentElement.lang] || all.tr || {}).gundem || {};
    };
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const safeUrl = (value) => (/^https?:\/\//i.test(value || '') ? value : '');
    const fold = (value) => String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
    const formatDate = (iso) => new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
    const route = () => decodeURIComponent(location.hash.replace(/^#/, ''));

    function matches(item) {
        if (!query) return true;
        const haystack = fold([item.title, item.spot, item.firm, item.alias, item.place, ...item.firms.map((firm) => `${firm.name} ${firm.ticker}`)].join(' '));
        return fold(query).split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
    }

    function meta(item, t) {
        return [formatDate(item.d), item.place, t.types?.[item.tur], item.abroad ? t.abroad : '']
            .filter(Boolean).map((part) => `<span>${esc(part)}</span>`).join('');
    }

    function renderList(sector) {
        const t = strings();
        const inSector = feed.items.filter((item) => !sector || item.sec === sector);
        const items = inSector.filter(matches);
        const sectors = Object.keys(t.sectors || {}).filter((key) => feed.items.some((item) => item.sec === key));
        const chip = (key, label, count) => `<a class="gundem-chip" href="${key ? `#s-${key}` : '#'}" aria-current="${(sector || '') === key ? 'true' : 'false'}">${esc(label)} <span>${count}</span></a>`;
        let lastDay = '';
        const rows = items.map((item) => {
            const day = item.d !== lastDay ? `<h2 class="gundem-day">${esc(formatDate(item.d))}</h2>` : '';
            lastDay = item.d;
            return `${day}<a class="gundem-item" href="#h-${esc(item.id)}"><span class="gundem-kicker">${esc(t.sectors?.[item.sec] || '')}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.spot)}</p><div class="gundem-meta">${meta(item, t)}</div></div></a>`;
        }).join('');
        view.innerHTML = `<div class="gundem-controls"><nav class="gundem-chips" aria-label="${esc(t.filters_label)}">${chip('', t.all, feed.items.length)}${sectors.map((key) => chip(key, t.sectors[key], feed.items.filter((item) => item.sec === key).length)).join('')}</nav>`
            + `<label class="gundem-search"><span class="sr-only">${esc(t.search_label)}</span><input type="search" id="gundem-search" value="${esc(query)}" placeholder="${esc(t.search)}" autocomplete="off"></label></div>`
            + `<p class="gundem-count" role="status">${items.length} ${esc(t.count)}</p>`
            + (rows || `<p class="gundem-state">${esc(t.empty)}</p>`);
        const search = document.getElementById('gundem-search');
        search.addEventListener('input', () => {
            query = search.value;
            const position = search.selectionStart;
            renderList(sector);
            const next = document.getElementById('gundem-search');
            next.focus();
            next.setSelectionRange(position, position);
        });
    }

    function renderStory(id) {
        const t = strings();
        const item = feed.items.find((entry) => entry.id === id);
        if (!item) {
            view.innerHTML = `<p class="gundem-state">${esc(t.not_found)} <a href="#">${esc(t.back)}</a></p>`;
            return;
        }
        const primary = safeUrl(item.url);
        const confirming = item.sources.filter((source) => safeUrl(source.url) && source.url !== item.url);
        view.innerHTML = `<article class="gundem-article"><div>
            <a class="gundem-back" href="#">← ${esc(t.back)}</a>
            <p class="gundem-kicker">${esc(t.sectors?.[item.sec] || '')}</p>
            <h1>${esc(item.title)}</h1>
            <p class="gundem-spot">${esc(item.spot)}</p>
            <div class="gundem-meta">${meta(item, t)}${item.srcType ? `<span>${esc(item.srcType)}</span>` : ''}</div>
            <div class="gundem-body">${item.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}</div>
            ${item.link ? `<div class="gundem-note"><h2>${esc(t.linked)}</h2><p>${esc(item.link)}</p></div>` : ''}
            ${item.correction ? `<div class="gundem-note is-correction"><h2>${esc(t.correction)}</h2><p>${esc(item.correction)}</p></div>` : ''}
            <div class="gundem-sources"><p><strong>${esc(t.source)}:</strong> ${primary ? `<a href="${esc(primary)}" target="_blank" rel="noopener">${esc(item.src)}</a>` : esc(item.src)}</p>
            ${confirming.length ? `<p><strong>${esc(t.confirmed)}:</strong> ${confirming.map((source) => `<a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.name)}</a>`).join(', ')}</p>` : ''}</div>
        </div><aside class="gundem-aside">
            ${item.facts.length ? `<div class="gundem-card"><h2>${esc(t.facts)}</h2><dl>${item.facts.map((fact) => `<div><dt>${esc(fact.k)}</dt><dd>${esc(fact.v)}</dd></div>`).join('')}</dl></div>` : ''}
            ${item.firms.length ? `<div class="gundem-card"><h2>${esc(t.companies)}</h2><ul>${item.firms.map((firm) => `<li><span>${esc(firm.name)}</span>${firm.ticker ? `<small>${esc(firm.ticker)}</small>` : ''}</li>`).join('')}</ul></div>` : ''}
        </aside></article>`;
        document.title = `${item.title} | Riscodex`;
    }

    function render() {
        const t = strings();
        if (failed) { view.innerHTML = `<p class="gundem-state">${esc(t.failed)}</p>`; return; }
        if (!feed) return;
        if (feed.updatedAt) updatedLine.textContent = `${t.updated}: ${formatDate(feed.updatedAt)} · ${feed.count} ${t.count}`;
        const current = route();
        if (current.startsWith('h-')) {
            renderStory(current.slice(2));
        } else {
            if (t.meta?.title) document.title = t.meta.title;
            renderList(current.startsWith('s-') ? current.slice(2) : '');
        }
    }

    window.addEventListener('hashchange', () => {
        render();
        const target = route().startsWith('h-') ? view : document.querySelector('.gundem-feed');
        if (route().startsWith('h-') || route().startsWith('s-') || !route()) target.scrollIntoView({ block: 'start' });
    });
    document.addEventListener('landing:language', render);

    fetch('haberler.json', { cache: 'no-cache' })
        .then((response) => { if (!response.ok) throw new Error(response.status); return response.json(); })
        .then((data) => { feed = { ...data, items: Array.isArray(data.items) ? data.items : [] }; })
        .catch(() => { failed = true; })
        .finally(() => {
            render();
            // A shared story link opens on the story, not on the page header.
            if (route().startsWith('h-')) view.scrollIntoView({ block: 'start' });
        });
})();
