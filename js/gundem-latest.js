// Shows the newest Gündem headlines on the homepage. Without JS, or if the feed fails, the card keeps its link to Gündem.
(() => {
    const list = document.querySelector('[data-gundem-latest]');
    const updated = document.querySelector('[data-gundem-updated]');
    if (!list || !('fetch' in window)) return;
    const SHOWN = 3;
    let feed = null;

    const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'tr');
    const copy = () => window.__landingTranslations?.[lang()]?.platform?.gundem || {};
    const ts = (iso) => Date.parse(iso || '') || 0;
    const formatDate = (iso, options) => new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : 'tr-TR', options)
        .format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));

    function render() {
        const items = feed.items
            .filter((n) => n && n.id && n.title && /^\d{4}-\d{2}-\d{2}/.test(n.d || ''))
            .sort((a, b) => b.d.localeCompare(a.d) || ts(b.addedAt) - ts(a.addedAt))
            .slice(0, SHOWN);
        if (!items.length) return;
        list.replaceChildren(...items.map((n) => {
            const link = document.createElement('a');
            link.href = `gundem/#h-${encodeURIComponent(n.id)}`;
            link.dataset.umamiEvent = 'Ana sayfadan haber';
            link.dataset.umamiEventHaber = n.id.slice(0, 200);
            const date = document.createElement('time');
            date.dateTime = n.d.slice(0, 10);
            date.textContent = formatDate(n.d.slice(0, 10), { day: 'numeric', month: 'short' });
            const title = document.createElement('span');
            title.textContent = n.title;
            link.append(date, title);
            const item = document.createElement('li');
            item.append(link);
            return item;
        }));
        const template = copy().updated;
        if (updated && template && ts(feed.updatedAt)) {
            updated.textContent = template
                .replace('{count}', String(feed.count ?? feed.items.length))
                .replace('{date}', formatDate(feed.updatedAt, { day: 'numeric', month: 'long' }));
            updated.hidden = false;
        }
        list.closest('.product-demo')?.classList.add('is-animated');
    }

    fetch('gundem/haberler.json', { cache: 'no-cache' })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
            if (!data || !Array.isArray(data.items)) return;
            feed = data;
            render();
        })
        .catch(() => { /* The fallback link to Gündem stays. */ });
    // Dates and the update line follow the language toggle.
    document.addEventListener('landing:language', () => { if (feed) render(); });
})();
