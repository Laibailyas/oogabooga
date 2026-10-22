/* Existing merchandise behavior, initialized once for each visited page. */
(function () {
  'use strict';
  function tshirt(scope) {
    const track = document.getElementById('tsCarouselTrack'), dots = document.querySelectorAll('.ts-dot');
    if (!track) return;
    let current = 0;
    const on = (el, type, fn) => scope ? scope.listen(el, type, fn) : el.addEventListener(type, fn);
    function goTo(index) {
      current = (index + 3) % 3; track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    }
    on(document.getElementById('tsPrev'), 'click', () => goTo(current - 1));
    on(document.getElementById('tsNext'), 'click', () => goTo(current + 1));
    dots.forEach((dot, i) => on(dot, 'click', () => goTo(i)));
    if (scope) { const advance = () => { goTo(current + 1); scope.timeout(advance, 6000); }; scope.timeout(advance, 6000); }
    else setInterval(() => goTo(current + 1), 6000);
  }
  window.tsSubmitWaitlist = function (event, product) {
    event.preventDefault();
    const input = event.target.querySelector('input[type="email"]'), email = input ? input.value : '';
    alert(`🎉 You're on the list for "${product}"!\n\nWe'll send an early-access link to ${email} 24 hours before launch.`);
    if (input) input.value = '';
  };
  window.selectColour = function (colour) {
    document.querySelectorAll('.variant-card[data-colour]').forEach(card => card.classList.toggle('selected', card.dataset.colour === colour));
    const img = document.getElementById('plushieHeroImg');
    if (img && ['emerald', 'coral', 'midnight'].includes(colour)) img.src = new URL('assets/images/shop/plushie.png', new URL('./', location.href)).href;
  };
  window.plushieSubmit = function (event) {
    event.preventDefault();
    const input = event.target.querySelector('input[type="email"]'), email = input ? input.value : '';
    alert(`🧸 You're reserved!\n\nWe'll send an early-access link to:\n${email}\n\n24 hours before the Ooga Monster Plushie goes on sale publicly.`);
    if (input) input.value = '';
  };
  window.OogaMerchPages = { mount: (key, scope) => { if (key === 'tshirt') tshirt(scope); } };
})();
