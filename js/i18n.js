
const defaultLang = 'tr';
let currentLang = localStorage.getItem('lang') || defaultLang;
let translations = {};

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    await loadTranslations(currentLang);
    updateTranslations();
    renderLanguageSwitcher();
}

async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        translations = await response.json();
    } catch (error) {
        console.error(`Could not load translations for ${lang}:`, error);
    }
}

function updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const value = getNestedTranslation(translations, key);
        if (value) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = value;
            } else {
                element.innerHTML = value;
            }
        }
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = currentLang;
}

function getNestedTranslation(obj, key) {
    return key.split('.').reduce((o, i) => (o ? o[i] : null), obj);
}

async function setLanguage(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem('lang', lang);
    await loadTranslations(lang);
    updateTranslations();
    updateActiveSwitcher();
}

function renderLanguageSwitcher() {
    // Look for a container to inject the switcher, or append to nav
    // Adapting to existing navbar structure...
    // We will inject it into the desktop menu and mobile menu logic if needed.
    // For now, let's assume we add a container manually in HTML or find the nav.
    
    // We'll expose setLanguage globaly so it can be called from inline HTML if we want manually placed buttons
    window.setLanguage = setLanguage;
}

function updateActiveSwitcher() {
    // Visual feedback for active language
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === currentLang) {
            btn.classList.add('font-bold', 'text-white');
            btn.classList.remove('text-gray-400');
        } else {
            btn.classList.remove('font-bold', 'text-white');
            btn.classList.add('text-gray-400');
        }
    });
}
