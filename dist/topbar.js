/* The assistant remains one click away; its secondary entry opens separately. */
(() => {
  const ai = document.querySelector('#ai-tools-menu');
  const more = document.querySelector('#workspace-utilities');
  document.addEventListener('click', event => {
    if (!ai.contains(event.target)) ai.open = false;
    if (event.target.closest('#ai-tools-menu > summary')) more.open = false;
    if (event.target.closest('#workspace-utilities > summary')) ai.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && ai.open) {
      ai.open = false;
      ai.querySelector('summary').focus();
    }
  });
})();
