// Reveal on scroll
(function(){
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));
})();

// Subtle parallax for hero decor
(function(){
  const decor = document.querySelectorAll('.decor');
  if (!decor.length) return;
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 10;
    const y = (e.clientY / window.innerHeight - 0.5) * 10;
    decor.forEach((d, i) => {
      d.style.transform = `translate(${x * (i+1)}px, ${y * (i+1)}px)`;
    });
  });
})();
