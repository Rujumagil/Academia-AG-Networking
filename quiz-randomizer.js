(() => {
  'use strict';

  const OPTION_CONTAINERS = '.lesson-quiz-options, .utah-v2-exam-options';

  function shuffle(container) {
    if (!container || container.dataset.agShuffled === 'true') return;
    const options = [...container.children];
    if (options.length < 2) {
      container.dataset.agShuffled = 'true';
      return;
    }

    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    options.forEach(option => container.appendChild(option));
    container.dataset.agShuffled = 'true';
    container.dataset.shuffled = 'true';
  }

  function shuffleQuizOptions(root = document) {
    root.querySelectorAll?.(OPTION_CONTAINERS).forEach(shuffle);
  }

  shuffleQuizOptions();
  const observer = new MutationObserver(() => shuffleQuizOptions());
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_QUIZ_RANDOMIZER = {
    release: '20260824.83',
    shuffleQuizOptions
  };
})();
