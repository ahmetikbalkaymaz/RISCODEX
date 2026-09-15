(() => {
    const buttons = [...document.querySelectorAll('[data-step]')];
    const panels = [...document.querySelectorAll('.step-panel')];
    function selectStep(index, focusPanel = false) {
        if (!panels[index]) return;
        buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        panels.forEach((panel, i) => { panel.hidden = i !== index; });
        document.getElementById('step-count').textContent = `0${index + 1} / 03`;
        if (focusPanel) panels[index].focus({ preventScroll: true });
    }
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => selectStep(index));
        button.addEventListener('keydown', (event) => {
            let next;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = buttons.length - 1;
            if (next === undefined) return;
            event.preventDefault();
            selectStep(next);
            buttons[next].focus({ preventScroll: true });
        });
    });
    document.querySelectorAll('[data-next]').forEach((button) => {
        button.addEventListener('click', () => selectStep(Number(button.dataset.next), true));
    });
})();
