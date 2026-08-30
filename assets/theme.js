/* ==================================================================
   THEME — shared by every page.

   Applies the saved theme on load, wires the nav toggle, and stamps
   the footer year. Pages that need to react to a theme change (the
   bracket redraws its connector lines) listen for "themechange" on
   the document.
   ================================================================== */
(function(){
  const THEME_KEY = "hidden-cup.theme";
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>';
  const SUN  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M19.1 4.9l-1.9 1.9M6.8 17.2l-1.9 1.9"/></svg>';
  const toggle = document.querySelector("#themeToggle");

  function applyTheme(mode){
    document.documentElement.setAttribute("data-theme", mode);
    if(toggle) toggle.innerHTML = mode === "night" ? MOON : SUN;
    try{ localStorage.setItem(THEME_KEY, mode); }catch(e){}
    document.dispatchEvent(new CustomEvent("themechange", { detail:{ mode } }));
  }

  if(toggle) toggle.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "night" ? "parchment" : "night");
  });

  let saved = null;
  try{ saved = localStorage.getItem(THEME_KEY); }catch(e){}
  applyTheme(saved === "parchment" ? "parchment" : "night");

  const year = document.querySelector("#year");
  if(year) year.textContent = new Date().getFullYear();
})();
