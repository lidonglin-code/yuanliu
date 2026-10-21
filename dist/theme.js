/* Apply before styles paint; keep this visual preference separate from work data. */
(() => {
  const key = 'zhijian-theme';
  let current = 'dark';
  try { if (localStorage.getItem(key) === 'light') current = 'light'; } catch {}
  function apply(theme) {
    current = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = current;
    document.documentElement.style.colorScheme = current;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', current === 'light' ? '#f6f7fb' : '#090d17');
    const button = document.querySelector('#theme-toggle');
    if (button) {
      const label = current === 'dark' ? '切换为浅色主题' : '切换为深色主题';
      button.setAttribute('aria-label', label);
      button.title = label;
      const text = button.querySelector('[data-theme-label]');
      if (text) text.textContent = label;
      button.setAttribute('aria-pressed', String(current === 'light'));
    }
    document.dispatchEvent(new Event('themechange'));
  }
  apply(current);
  document.addEventListener('DOMContentLoaded', () => {
    apply(current);
    document.querySelector('#theme-toggle')?.addEventListener('click', () => {
      apply(current === 'dark' ? 'light' : 'dark');
      try { localStorage.setItem(key, current); } catch { /* Switching still works for this visit. */ }
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue === 'light' ? 'light' : 'dark');
  });
})();
