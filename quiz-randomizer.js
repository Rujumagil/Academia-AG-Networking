(() => {
  'use strict';

  function shuffleQuizOptions(root = document) {
    root.querySelectorAll?.('.lesson-quiz-options:not([data-shuffled="true"])').forEach(container => {
      const options = [...container.children];
      for (let i = options.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      options.forEach(option => container.appendChild(option));
      container.dataset.shuffled = 'true';
    });
  }

  shuffleQuizOptions();
  const observer = new MutationObserver(() => shuffleQuizOptions());
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
})();
