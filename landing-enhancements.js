(() => {
  'use strict';

  const CLEAN_LANDING_IMAGES = {
    academy: 'https://static.wixstatic.com/media/11f124_b15578e5070d4270a41bbd44310e5370~mv2.png',
    community: 'https://static.wixstatic.com/media/11f124_0d0860da13cb4235b3429d945c18a6b5~mv2.png',
    courses: [
      'https://static.wixstatic.com/media/11f124_5a9d6fd7f2054172943aab4260f3cfe7~mv2.png',
      'https://static.wixstatic.com/media/11f124_da720acf43f245949d576644333f7c91~mv2.png',
      'https://static.wixstatic.com/media/11f124_c63895cf900f4f9b9624c7a576ca7caf~mv2.png',
      'https://static.wixstatic.com/media/11f124_7860b768bbab446db851d96e3160dbe0~mv2.png',
      'https://static.wixstatic.com/media/11f124_ccf34ce39f5340af92182617f784b464~mv2.png'
    ]
  };

  const academyImage = document.querySelector('.academy-showcase > img');
  if (academyImage) {
    academyImage.src = CLEAN_LANDING_IMAGES.academy;
    academyImage.alt = 'Academia AG: aprender también es parte de crecer';
  }

  const communityImage = document.querySelector('.community-showcase-media img');
  if (communityImage) {
    communityImage.src = CLEAN_LANDING_IMAGES.community;
    communityImage.alt = 'Más que conexiones, somos tu comunidad';
  }

  document.querySelectorAll('.course-selector-grid .course-select-image img').forEach((image, index) => {
    const replacement = CLEAN_LANDING_IMAGES.courses[index];
    if (replacement) image.src = replacement;
  });
})();
