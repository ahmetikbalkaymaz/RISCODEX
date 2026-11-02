// Riscodex Gündem on the company site. Same views as the news desk artifact, read from gundem/haberler.json,
// which a scheduled routine refreshes. Routes: "" home, "#<sector>", "#h-<id>" story, "#f-<firm>", "#ara/<query>",
// "#firmalar", "#projeler", "#takip", "#arsiv", "#yontem". The follow list and "seen" mark live in this browser only.
(() => {
    const SECTIONS = [
        { id: '', name: 'Ana sayfa' },
        { id: 'enerji', name: 'Enerji' },
        { id: 'madencilik', name: 'Madencilik' },
        { id: 'liman', name: 'Liman ve Denizcilik' },
        { id: 'altyapi', name: 'İnşaat ve Altyapı' },
        { id: 'kimya', name: 'Kimya ve Petrokimya' },
        { id: 'metal', name: 'Metal ve Çelik' },
        { id: 'imalat', name: 'İmalat' },
        { id: 'gida', name: 'Gıda ve Tarım' },
        { id: 'gayrimenkul', name: 'Lojistik ve Gayrimenkul' },
        { id: 'saglik', name: 'Sağlık ve İlaç' },
        { id: 'hizmet', name: 'Ticaret ve Hizmet' },
        { id: 'sigorta', name: 'Sigorta Sektörü' },
        { id: 'mevzuat', name: 'Mevzuat' },
        { id: 'projeler', name: 'Projeler' },
        { id: 'firmalar', name: 'Firmalar' },
        { id: 'takip', name: 'Takip Listem' }
    ];
    const SECNAME = Object.fromEntries(SECTIONS.map((s) => [s.id, s.name]));
    const SECTOR_KEYS = ['enerji', 'madencilik', 'liman', 'altyapi', 'kimya', 'metal', 'imalat', 'gida', 'gayrimenkul', 'saglik', 'hizmet', 'sigorta', 'mevzuat'];
    const TUR = { yatirim: 'Yeni yatırım', devreye: 'Devreye alma', kapasite: 'Kapasite artışı', izin: 'İzin ve lisans', ihale: 'İhale ve sözleşme', satinalma: 'Satın alma ve devir', satis: 'Tesis ve pay satışı', kapanis: 'Kapanış ve konkordato', finansman: 'Finansman', yapilanma: 'Yeniden yapılanma', duzenleme: 'Düzenleme' };
    const TRACKS = {
        tesis: [['plan', 'Planlama'], ['izin', 'Çevre ve izin'], ['sozlesme', 'İhale ve sözleşme'], ['insaat', 'İnşaat'], ['devreye', 'Devreye alma'], ['isletme', 'İşletmede']],
        islem: [['anlasma', 'Anlaşma'], ['onay', 'Onay'], ['tamam', 'Tamamlandı']]
    };
    const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const FOLLOW_KEY = 'rcx-gundem-takip';
    const SEEN_KEY = 'rcx-gundem-seen';
    const view = document.getElementById('view');

    let NEWS = [];
    let byId = {};
    let FIRMS = {};
    let loaded = false;
    let failed = false;
    let arsivTur = '';
    let projSec = '';

    const store = {
        get(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch { /* The page works without storage. */ } }
    };
    let follow = store.get(FOLLOW_KEY, '');
    let seen = store.get(SEEN_KEY, '');

    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const safeUrl = (value) => (/^https?:\/\//i.test(value || '') ? value : '#');
    const trl = (value) => (value || '').toLocaleLowerCase('tr-TR');
    const fold = (value) => trl(value).replace(/[çğıöşüâîû]/g, (c) => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c])).replace(/i̇/g, 'i');
    const slugify = (value) => fold(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fmtShort = (iso) => { const [, m, d] = iso.slice(0, 10).split('-'); return `${+d} ${MONTHS[+m - 1]}`; };
    const fmtLong = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${+d} ${MONTHS[+m - 1]} ${y}`; };
    const ts = (value) => { const time = Date.parse(value || ''); return Number.isNaN(time) ? 0 : time; };
    const href = (n) => `#h-${esc(n.id)}`;
    const sorted = (list) => list.slice().sort((a, b) => b.d.localeCompare(a.d) || ts(b.addedAt) - ts(a.addedAt));
    const firmsOf = (n) => (n.firms?.length ? n.firms : (n.firm ? [{ name: n.firm, ticker: '', slug: slugify(n.firm) }] : []));
    const firmSlug = (f) => f.slug || slugify(f.name);

    function stageInfo(key) {
        for (const track in TRACKS) {
            const idx = TRACKS[track].findIndex((step) => step[0] === key);
            if (idx >= 0) return { track, idx, label: TRACKS[track][idx][1] };
        }
        return null;
    }
    function buildFirms() {
        FIRMS = {};
        NEWS.forEach((n) => firmsOf(n).forEach((f, i) => {
            const key = firmSlug(f);
            if (!key) return;
            const entry = FIRMS[key] || (FIRMS[key] = { slug: key, name: f.name, ticker: f.ticker || '', items: [], main: 0 });
            if (!entry.ticker && f.ticker) entry.ticker = f.ticker;
            if (!entry.items.includes(n)) entry.items.push(n);
            if (i === 0) entry.main++;
        }));
    }
    const projKey = (n) => n.project?.slug || n.id;
    const projectItems = (n) => NEWS.filter((x) => projKey(x) === projKey(n)).sort((a, b) => a.d.localeCompare(b.d) || ts(a.addedAt) - ts(b.addedAt));

    const followTerms = () => follow.split(/\n|;|,|\t/).map((x) => trl(x.trim())).filter((x) => x.length >= 3);
    function isFollowed(n) {
        const terms = followTerms();
        if (!terms.length) return false;
        const haystack = trl(`${n.firm} ${firmsOf(n).map((f) => `${f.name} ${f.ticker}`).join(' ')} ${n.alias || ''} ${n.title}`);
        return terms.some((term) => haystack.includes(term));
    }
    const newestTs = () => NEWS.reduce((max, n) => Math.max(max, ts(n.addedAt)), 0);
    // Before the first "mark as read", the last two days of news count as new.
    function isNew(n) {
        if (seen) return ts(n.addedAt) > ts(seen);
        const top = newestTs();
        return top ? ts(n.addedAt) >= top - 2 * 86400000 : false;
    }
    const pills = (n) => (TUR[n.tur] ? `<span>${TUR[n.tur]}</span>` : '') + (n.abroad ? '<span>Yurt dışı</span>' : '')
        + (isNew(n) ? '<span class="flag new">Yeni</span>' : '') + (isFollowed(n) ? '<span class="flag mine">Takip ettiğiniz</span>' : '');

    function rowItem(n) {
        return `<a class="row" href="${href(n)}"><span class="d">${fmtLong(n.d)}</span>
            <div><h3>${esc(n.title)}</h3><p>${esc(n.spot)}</p>
            <div class="meta"><span class="kicker">${esc(SECNAME[n.sec] || '')}</span>${pills(n)}${n.place ? `<span>${esc(n.place)}</span>` : ''}${n.srcType ? `<span>${esc(n.srcType)}</span>` : ''}</div></div></a>`;
    }
    function dayGroups(items) {
        const groups = [];
        items.forEach((n) => { const last = groups.at(-1); if (last?.d === n.d) last.list.push(n); else groups.push({ d: n.d, list: [n] }); });
        return groups.map((g) => `<div class="block"><div class="blockhead"><h2>${fmtLong(g.d)}, ${DAYS[new Date(`${g.d}T12:00:00`).getDay()]}</h2></div><div class="rows">${g.list.map(rowItem).join('')}</div></div>`).join('');
    }
    function followRowsHtml() {
        const items = sorted(NEWS.filter(isFollowed));
        if (items.length) return items.map(rowItem).join('');
        return `<div class="state">${followTerms().length ? 'Listenizdeki firmalarla eşleşen haber yok.' : 'Henüz firma eklemediniz.'}</div>`;
    }
    function stepsHtml(n) {
        const info = stageInfo(n.stage);
        if (!info) return '';
        const steps = TRACKS[info.track];
        return `<div class="steps"><h2>${info.track === 'islem' ? 'İşlemin aşaması' : 'Projenin aşaması'}</h2><ol>${steps.map((step, i) => `<li class="${i < info.idx ? 'done' : i === info.idx ? 'cur' : ''}"${i === info.idx ? ' aria-current="step"' : ''}>${step[1]}</li>`).join('')}</ol></div>`;
    }

    function renderNav(route) {
        const current = route.startsWith('h-') ? (byId[route.slice(2)]?.sec ?? '') : route.startsWith('f-') ? 'firmalar' : route;
        document.getElementById('nav').innerHTML = SECTIONS.map((s) => {
            const count = s.id === 'takip' ? NEWS.filter(isFollowed).length : 0;
            return `<a href="#${s.id}"${current === s.id ? ' aria-current="page"' : ''}>${s.name}${count ? ` (${count})` : ''}</a>`;
        }).join('');
    }

    function renderHome() {
        const items = sorted(NEWS.filter((n) => !arsivTur || (arsivTur === 'abroad' ? n.abroad : n.tur === arsivTur)));
        const turs = Object.keys(TUR).filter((key) => NEWS.some((n) => n.tur === key));
        const chip = (key, label) => `<button type="button" class="chip" data-tur="${key}" aria-pressed="${arsivTur === key}">${label}</button>`;
        return `<section class="listhead"><h1 class="sr">Son haberler</h1>
            <div class="chips" role="group" aria-label="Gelişme türü">${chip('', 'Tümü')}${turs.map((key) => chip(key, TUR[key])).join('')}${NEWS.some((n) => n.abroad) ? chip('abroad', 'Yurt dışı') : ''}</div></section>
            ${items.length ? dayGroups(items) : '<div class="state">Bu seçimle eşleşen haber yok.</div>'}`;
    }
    function renderSection(sec) {
        const items = sorted(NEWS.filter((n) => n.sec === sec));
        return `<section class="listhead"><h1>${SECNAME[sec]}</h1></section>${items.length ? dayGroups(items) : '<div class="state">Bu bölümde henüz haber yok.</div>'}`;
    }
    function renderArchive() {
        const top = Math.max(...NEWS.map((n) => ts(n.d)));
        return `<section class="listhead"><h1>Son 30 gün</h1></section>${dayGroups(sorted(NEWS.filter((n) => ts(n.d) >= top - 30 * 86400000)))}`;
    }
    function renderMethod() {
        const sources = [
            ['Borsa şirketleri', 'Kamuyu Aydınlatma Platformu açıklamaları; açıklamanın asıl metni Foreks, YatırımX, Paratic gibi aktarım kaynaklarından da karşılaştırılır.'],
            ['Enerji', 'Enerji Piyasası Düzenleme Kurulu kararları ve duyuruları, Resmi Gazete’deki lisans ilanları ve acele kamulaştırma kararları, yenilenebilir enerji yarışmaları.'],
            ['Mevzuat', 'Resmi Gazete’de yayımlanan ve sanayi, enerji ve lojistik tesislerini ya da sigortacılığı etkileyen düzenlemeler.'],
            ['Birleşme ve devralmalar', 'Rekabet Kurulu kararları ve şirket açıklamaları.'],
            ['Çevre izinleri', 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı ile valiliklerin ÇED duyuruları.'],
            ['Kamu ve altyapı', 'Kamu kurumlarının büyük ihale ve imtiyaz duyuruları, yüklenicilerin sözleşme açıklamaları.'],
            ['Borsada işlem görmeyen şirketler', 'Şirket basın bültenleri, ulusal ve yerel basın, yabancı ana şirketlerin duyuruları.'],
            ['Sigorta sektörü', 'Düzenleyici kurum duyuruları, sigorta şirketlerinin açıklamaları ve sektör yayınları.']
        ];
        return `<article class="article single"><div>
            <div class="crumb"><a href="#">Ana sayfa</a></div>
            <h1>Yayın ilkeleri</h1>
            <p class="spot">Riscodex Gündem; sigorta brokerleri, sigorta ve reasürans şirketleri, risk yöneticileri ve iş dünyası için Türkiye’deki şirketlerin varlıklarını ve faaliyetlerini değiştiren gelişmeleri resmi kaynaklara dayanarak, yorum katmadan haberleştirir.</p>
            <div class="text">
                <p><strong>Nasıl derleniyor.</strong> Haberler, aşağıdaki kaynakları günde iki kez tarayan yapay zekâ destekli bir sistemle derlenir ve yazılır. Her haber yayımlanmadan önce ayrı bir doğrulama adımında kaynaklarıyla satır satır karşılaştırılır.</p>
                <p><strong>Her haber en az iki bağımsız kaynağa dayanır.</strong> Önceliği birincil kaynaklara veririz: şirketin kendi açıklaması, Resmi Gazete, ilgili kurumun kararı veya duyurusu. Şirket unvanı, açıklama tarihi, işlemin niteliği ve rakamlar iki kaynakta eşleşmeden haber yayımlanmaz. Doğrulanamayan gelişmeleri yayımlamayız.</p>
                <p><strong>Tarih, açıklamanın yapıldığı gündür.</strong> Rakamlar kaynaktaki haliyle verilir. Bir işlemin plan, karar, izin ya da tamamlanma aşamasında mı olduğu başlıkta açıkça belirtilir.</p>
                <p><strong>Hata düzeltme.</strong> Bir haberde hata fark edildiğinde haber düzeltilir ve altına ne değiştiğini anlatan bir düzeltme notu eklenir.</p>
                <p><strong>Kapsam.</strong> Yeni yatırımlar ve tesisler, devreye alma ve kapasite artışları, izin ve lisanslar, ihaleler ve büyük sözleşmeler, finansman, satın alma ve devirler, tesis satışları, kapanış ve konkordatolar; enerji, madencilik, liman ve denizcilik, inşaat ve altyapı, kimya, metal, imalat, gıda, lojistik ve gayrimenkul, sağlık sektörleri; sigorta sektörü ve ilgili mevzuat. Borsa fiyat haberleri ve yorumlar kapsam dışıdır. Hasar olayları Riscodex LocateLoss’ta yer alır.</p>
            </div>
            <div class="kunye"><h2>İzlediğimiz kaynaklar</h2><dl>${sources.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>
        </div></article>`;
    }

    function searchNews(q) {
        const tokens = fold(q).split(/\s+/).filter((t) => t.length >= 2);
        if (!tokens.length) return { firms: [], items: [] };
        const firms = Object.values(FIRMS).filter((f) => { const h = fold(`${f.name} ${f.ticker}`); return tokens.every((t) => h.includes(t)); })
            .sort((a, b) => b.main - a.main || b.items.length - a.items.length || a.name.localeCompare(b.name, 'tr'));
        const items = sorted(NEWS.filter((n) => {
            const h = fold([n.title, n.spot, n.firm, n.alias, n.place, firmsOf(n).map((f) => `${f.name} ${f.ticker}`).join(' ')].join(' '));
            return tokens.every((t) => h.includes(t));
        }));
        return { firms, items };
    }
    function renderSearch(q) {
        const { firms, items } = searchNews(q);
        const box = `<form class="bigsearch" id="bigSearch" role="search" autocomplete="off"><input type="search" id="bigSearchBox" value="${esc(q)}" placeholder="Firma, borsa kodu veya konu" aria-label="Haberlerde ara"><button type="submit">Ara</button></form>`;
        if (!q.trim()) return `<section class="listhead"><h1>Ara</h1>${box}<p><a class="textlink" href="#firmalar">Tüm firmalar</a></p></section>`;
        return `<section class="listhead"><h1>“${esc(q)}”</h1>${box}</section>
            ${firms.length ? `<section><h2 class="subhead">Firmalar</h2><div class="firmhits">${firms.slice(0, 12).map((f) => `<a class="firmhit" href="#f-${esc(f.slug)}"><b>${esc(f.name)}</b>${f.ticker ? `<span class="tick">${esc(f.ticker)}</span>` : ''}</a>`).join('')}</div></section>` : ''}
            <section><h2 class="subhead">Haberler</h2>${items.length ? `<div class="rows dated">${items.map(rowItem).join('')}</div>` : '<div class="state inline">Sonuç bulunamadı.</div>'}</section>`;
    }
    function followButton(firm, followed) {
        return `<button class="btn" type="button" id="followBtn" data-firm="${esc(firm)}">${followed ? 'Takip listenizde' : 'Bu firmayı takip listeme ekle'}</button>`;
    }
    function firmSide(title, firms) {
        return `<div class="sidelist firms-side"><h2>${title}</h2>${firms.map((f) => `<a href="#f-${esc(firmSlug(f))}"><span>${esc(f.name)}</span>${f.ticker ? `<span class="tick">${esc(f.ticker)}</span>` : ''}</a>`).join('')}</div>`;
    }
    function renderFirm(slug) {
        const firm = FIRMS[slug];
        if (!firm) return '<div class="state">Bu firma bulunamadı. <a href="#firmalar">Tüm firmalar</a></div>';
        const items = sorted(firm.items);
        const secs = [...new Set(items.map((n) => n.sec))].map((s) => SECNAME[s]).filter(Boolean);
        const co = {};
        items.forEach((n) => firmsOf(n).forEach((x) => { if (x.slug !== slug && FIRMS[x.slug]) co[x.slug] = (co[x.slug] || 0) + 1; }));
        const coList = Object.keys(co).sort((a, b) => co[b] - co[a]).slice(0, 8).map((key) => FIRMS[key]);
        return `<article class="article"><div>
            <div class="crumb"><a href="#">Ana sayfa</a><span>/</span><a href="#firmalar">Firmalar</a></div>
            <h1>${esc(firm.name)}</h1>
            <div class="firmmeta">${firm.ticker ? `<span>Borsa kodu <b>${esc(firm.ticker)}</b></span>` : ''}${secs.length ? `<span>${secs.map(esc).join(', ')}</span>` : ''}</div>
            <div class="rows dated">${items.map(rowItem).join('')}</div>
        </div><aside class="side">
            ${followButton(firm.name, followTerms().some((x) => trl(firm.name).includes(x)))}
            ${coList.length ? firmSide('Aynı haberlerde geçen şirketler', coList) : ''}
        </aside></article>`;
    }
    function renderFirmIndex() {
        const groups = {};
        Object.values(FIRMS).sort((a, b) => a.name.localeCompare(b.name, 'tr')).forEach((f) => {
            const letter = f.name.charAt(0).toLocaleUpperCase('tr-TR');
            (groups[letter] = groups[letter] || []).push(f);
        });
        return `<section class="listhead"><h1>Firmalar</h1></section>
            <div class="az">${Object.keys(groups).sort((a, b) => a.localeCompare(b, 'tr')).map((letter) => `<section><h2>${esc(letter)}</h2><ul>${groups[letter].map((f) => `<li><a href="#f-${esc(f.slug)}"><span>${esc(f.name)}</span><small>${esc(f.ticker)}</small></a></li>`).join('')}</ul></section>`).join('')}</div>`;
    }
    function renderProjects() {
        const latest = {};
        NEWS.forEach((n) => {
            if (!stageInfo(n.stage) || (projSec && n.sec !== projSec)) return;
            const key = projKey(n);
            const current = latest[key];
            if (!current || n.d > current.d || (n.d === current.d && ts(n.addedAt) > ts(current.addedAt))) latest[key] = n;
        });
        const all = Object.values(latest);
        const secs = SECTOR_KEYS.filter((key) => NEWS.some((n) => n.sec === key && stageInfo(n.stage)));
        const group = ([key, label]) => {
            const items = sorted(all.filter((n) => n.stage === key));
            if (!items.length) return '';
            return `<section class="stagegroup"><h2><i aria-hidden="true"></i>${label}</h2><div class="plist">${items.map((n) => `<a href="${href(n)}"><b>${esc(firmsOf(n)[0]?.name || n.firm)}</b><span>${esc(n.title)}</span><small>${fmtLong(n.d)}${n.place ? ` · ${esc(n.place)}` : ''}</small></a>`).join('')}</div></section>`;
        };
        return `<section class="listhead"><h1>Projeler</h1>
            <div class="selrow"><label for="projSec">Sektör</label><select id="projSec"><option value="">Tümü</option>${secs.map((key) => `<option value="${key}"${projSec === key ? ' selected' : ''}>${SECNAME[key]}</option>`).join('')}</select></div></section>
            <div class="pipeline"><p class="trackhead">Tesis ve yatırımlar</p>${TRACKS.tesis.map(group).join('')}<p class="trackhead">Satın alma, satış ve devirler</p>${TRACKS.islem.map(group).join('')}</div>`;
    }
    function renderFollow() {
        return `<section class="follow"><div>
            <div class="listhead"><h1>Takip Listem</h1></div>
            <label for="followBox" class="kicker">Firmalar</label>
            <textarea id="followBox" spellcheck="false" placeholder="Şişecam&#10;Akfen&#10;Reysaş">${esc(follow)}</textarea>
            <p class="hint">Her satıra bir firma. Liste bu tarayıcıda saklanır.</p>
        </div><div class="rows" id="followRows">${followRowsHtml()}</div></section>`;
    }
    function renderArticle(id) {
        const n = byId[id];
        if (!n) return '<div class="state">Bu haber bulunamadı. <a href="#">Ana sayfaya dönün.</a></div>';
        const firmKey = trl(n.firm).split(' ')[0];
        const sameFirm = NEWS.filter((x) => x.id !== n.id && trl(x.firm).split(' ')[0] === firmKey);
        const sameSec = sorted(NEWS.filter((x) => x.id !== n.id && x.sec === n.sec && !sameFirm.includes(x)));
        const related = sorted(sameFirm).concat(sameSec).slice(0, 5);
        const confirming = (n.sources || []).filter((s) => s.url !== n.url);
        const source = `<a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener">${esc(n.src)}</a>`;
        const history = projectItems(n);
        return `<article class="article"><div>
            <div class="crumb"><a href="#">Ana sayfa</a><span>/</span><a href="#${esc(n.sec)}">${esc(SECNAME[n.sec])}</a></div>
            <h1>${esc(n.title)}</h1>
            <p class="spot">${esc(n.spot)}</p>
            <div class="meta lead-meta"><time>${fmtLong(n.d)}</time>${pills(n)}${n.place ? `<span>${esc(n.place)}</span>` : ''}${n.srcType ? `<span>${esc(n.srcType)}</span>` : ''}</div>
            ${stepsHtml(n)}
            <p class="srcline srcfirst">Kaynak belgesi: ${source}</p>
            <div class="text">${(n.body || []).map((p) => `<p>${esc(p)}</p>`).join('')}</div>
            ${history.length > 1 ? `<div class="history"><h2>${esc(n.project?.name || 'Proje geçmişi')}</h2><ol>${history.map((x) => { const info = stageInfo(x.stage); return `<li class="${x.id === n.id ? 'me' : ''}"><small>${fmtLong(x.d)}${info ? `<br>${info.label}` : ''}</small><a href="${href(x)}">${esc(x.title)}</a></li>`; }).join('')}</ol></div>` : ''}
            ${n.link ? `<div class="related-note"><h2>Bağlantılı gelişme</h2><p>${esc(n.link)}</p></div>` : ''}
            <p class="srcline">Kaynak: ${source}${confirming.length ? ` · Teyit: ${confirming.map((s) => `<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(', ')}` : ''}</p>
            ${n.correction ? `<p class="srcline"><strong>Düzeltme:</strong> ${esc(n.correction)}</p>` : ''}
        </div><aside class="side">
            ${n.facts?.length ? `<div class="kunye"><h2>Künye</h2><dl>${n.facts.map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}</dl></div>` : ''}
            ${firmsOf(n).length ? firmSide('Haberdeki şirketler', firmsOf(n)) : ''}
            ${followButton(n.firm, isFollowed(n))}
            ${related.length ? `<div class="sidelist"><h2>İlgili haberler</h2>${related.map((r) => `<a href="${href(r)}">${esc(r.title)}</a>`).join('')}</div>` : ''}
        </aside></article>`;
    }

    let tickerItems = [];
    let tickerIndex = 0;
    let tickerTimer = null;
    function showTicker() {
        if (!tickerItems.length) return;
        const n = tickerItems[tickerIndex % tickerItems.length];
        document.getElementById('tkTime').textContent = fmtShort(n.d);
        const link = document.getElementById('tkLink');
        link.textContent = n.title;
        link.href = `#h-${n.id}`;
    }
    function renderTicker() {
        tickerItems = sorted(NEWS).slice(0, 8);
        tickerIndex = 0;
        showTicker();
        if (!tickerTimer && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            tickerTimer = setInterval(() => { tickerIndex++; showTicker(); }, 6000);
        }
    }
    function renderBell() {
        const fresh = sorted(NEWS.filter(isNew));
        const badge = document.getElementById('badge');
        badge.textContent = fresh.length;
        badge.hidden = fresh.length === 0;
        document.getElementById('panelList').innerHTML = fresh.length
            ? fresh.map((n) => `<li><a href="${href(n)}"><small>${fmtLong(n.d)} · ${esc(SECNAME[n.sec])}</small><span>${esc(n.title)}</span></a></li>`).join('')
            : '<li class="empty">Yeni haber yok.</li>';
    }

    const route = () => decodeURIComponent((location.hash || '').replace(/^#/, ''));

    // Visits are counted with Umami (no cookies). Stories open inside this page, so each view is reported as
    // its own address: /gundem/haber/<id>, /gundem/sektor/<id>, /gundem/firma/<slug>, /gundem/<page>.
    const track = (...args) => { try { window.umami?.track(...args); } catch { /* Counting never breaks the page. */ } };
    let lastRoute = null;
    let lastUrl = '';
    function viewPath(r) {
        if (r.startsWith('h-')) return `/gundem/haber/${r.slice(2, 200)}`;
        if (r.startsWith('f-')) return `/gundem/firma/${r.slice(2, 200)}`;
        if (r === 'ara' || r.startsWith('ara/')) return '/gundem/ara';
        if (SECTOR_KEYS.includes(r)) return `/gundem/sektor/${r}`;
        if (SECNAME[r] || r === 'arsiv' || r === 'yontem') return `/gundem/${r}`;
        return '/gundem/';
    }
    function trackView(r) {
        if (r === lastRoute) return;
        lastRoute = r;
        const url = viewPath(r);
        const referrer = lastUrl ? `${location.origin}${lastUrl}` : document.referrer;
        lastUrl = url;
        track((props) => ({ ...props, url, title: document.title, referrer }));
        const q = r.startsWith('ara/') ? r.slice(4).trim() : '';
        if (q) track('Arama', { q: q.slice(0, 100) });
    }

    function render() {
        const r = route();
        renderNav(r);
        document.title = 'Riscodex Gündem';
        if (failed) { view.innerHTML = '<div class="state">Haberlere şu an ulaşılamıyor. Lütfen biraz sonra yeniden deneyin.</div>'; return; }
        if (!loaded) { view.innerHTML = '<div class="state">Haberler yükleniyor…</div>'; return; }
        if (!NEWS.length) { view.innerHTML = '<div class="state">Henüz haber eklenmedi.</div>'; return; }
        if (r.startsWith('h-')) {
            view.innerHTML = renderArticle(r.slice(2));
            if (byId[r.slice(2)]) document.title = `${byId[r.slice(2)].title} | Riscodex Gündem`;
        } else if (r === 'arsiv') view.innerHTML = renderArchive();
        else if (r === 'yontem') view.innerHTML = renderMethod();
        else if (r === 'takip') view.innerHTML = renderFollow();
        else if (r === 'firmalar') view.innerHTML = renderFirmIndex();
        else if (r === 'projeler') view.innerHTML = renderProjects();
        else if (r === 'ara' || r.startsWith('ara/')) view.innerHTML = renderSearch(r.slice(4));
        else if (r.startsWith('f-')) view.innerHTML = renderFirm(r.slice(2));
        else if (r && SECNAME[r]) view.innerHTML = renderSection(r);
        else view.innerHTML = renderHome();
        bindView();
        trackView(r);
    }
    function bindView() {
        const sectorSelect = document.getElementById('projSec');
        sectorSelect?.addEventListener('change', () => { projSec = sectorSelect.value; render(); });
        const bigSearch = document.getElementById('bigSearch');
        if (bigSearch) {
            const box = document.getElementById('bigSearchBox');
            if (!box.value) box.focus();
            bigSearch.addEventListener('submit', (event) => { event.preventDefault(); location.hash = `ara/${encodeURIComponent(box.value.trim())}`; });
        }
        const followBox = document.getElementById('followBox');
        if (followBox) {
            let timer;
            followBox.addEventListener('input', () => {
                follow = followBox.value;
                store.set(FOLLOW_KEY, follow);
                clearTimeout(timer);
                timer = setTimeout(() => { document.getElementById('followRows').innerHTML = followRowsHtml(); renderNav(route()); }, 250);
            });
        }
        const followBtn = document.getElementById('followBtn');
        followBtn?.addEventListener('click', () => {
            const firm = followBtn.dataset.firm;
            if (!followTerms().some((x) => trl(firm).includes(x))) {
                follow = (follow.trim() ? `${follow.trim()}\n` : '') + firm;
                store.set(FOLLOW_KEY, follow);
                track('Takip listesine ekle', { firma: firm.slice(0, 100) });
            }
            render();
        });
    }

    const today = new Date();
    document.getElementById('today').textContent = `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}, ${DAYS[today.getDay()]}`;
    const bell = document.getElementById('bell');
    const panel = document.getElementById('panel');
    const closePanel = () => { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); };
    bell.addEventListener('click', () => { const open = panel.hidden; panel.hidden = !open; bell.setAttribute('aria-expanded', String(open)); });
    document.getElementById('markRead').addEventListener('click', () => {
        seen = new Date(Math.max(newestTs(), Date.now())).toISOString();
        store.set(SEEN_KEY, seen);
        renderBell();
        render();
    });
    panel.addEventListener('click', (event) => { if (event.target.closest('a')) closePanel(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) { closePanel(); bell.focus(); } });
    document.addEventListener('click', (event) => {
        if (!panel.hidden && !panel.contains(event.target) && !bell.contains(event.target)) closePanel();
        const chip = event.target.closest('[data-tur]');
        if (chip) { arsivTur = chip.dataset.tur; render(); }
        const source = event.target.closest('.srcline a[target="_blank"]');
        if (source) track('Kaynak linki', { haber: route().slice(2, 200), kaynak: source.textContent.slice(0, 100) });
    });
    document.getElementById('searchForm').addEventListener('submit', (event) => {
        event.preventDefault();
        location.hash = `ara/${encodeURIComponent(document.getElementById('searchBox').value.trim())}`;
    });
    window.addEventListener('hashchange', () => { closePanel(); render(); window.scrollTo(0, 0); });
    render();

    fetch('haberler.json', { cache: 'no-cache' })
        .then((response) => { if (!response.ok) throw new Error(response.status); return response.json(); })
        .then((data) => {
            NEWS = (Array.isArray(data.items) ? data.items : []).filter((n) => n.id && n.d);
            byId = Object.fromEntries(NEWS.map((n) => [n.id, n]));
            buildFirms();
            loaded = true;
            renderTicker();
            renderBell();
        })
        .catch(() => { failed = true; document.getElementById('tkLink').textContent = 'Haber akışına ulaşılamıyor'; })
        .finally(render);
})();
