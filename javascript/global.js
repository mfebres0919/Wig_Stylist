/* ==========================================================================
   HAIR BY JORDAN — global.js
   Site-wide behaviour: sticky header, mobile drawer, services dropdown, and
   back-to-top. Loaded with `defer`, so the DOM is parsed before this runs.

   Homepage-only behaviour belongs in javascript/script.js, not here.
   ========================================================================== */

(function () {
  'use strict';

  var header     = document.getElementById('siteHeader');
  var navToggle  = document.getElementById('navToggle');
  var nav        = document.getElementById('primaryNav');
  var scrim      = document.getElementById('navScrim');
  var backToTop  = document.getElementById('backToTop');

  /* The one place the desktop breakpoint is defined in JS. Keep it in step
     with the 64em nav query in global.css. */
  var desktopQuery = window.matchMedia('(min-width: 64em)');


  /* ========================================================================
     1. STICKY HEADER
     Fades in the blurred backdrop once the page leaves the very top.
     ======================================================================== */

  function updateHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  }


  /* ========================================================================
     2. BACK TO TOP
     Shows after roughly half a viewport of scrolling.
     ======================================================================== */

  function updateBackToTop() {
    if (!backToTop) return;
    backToTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.5);
  }

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      /* Respect the OS reduced-motion setting rather than always smooth-scrolling. */
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }


  /* ========================================================================
     3. SCROLL LISTENER
     One listener driving both, throttled to the frame rate so scrolling never
     queues more work than the browser can paint.
     ======================================================================== */

  var ticking = false;

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      updateHeader();
      updateBackToTop();
      ticking = false;
    });
  }, { passive: true });

  updateHeader();
  updateBackToTop();


  /* ========================================================================
     4. MOBILE DRAWER
     ======================================================================== */

  function isMenuOpen() {
    return !!nav && nav.classList.contains('is-open');
  }

  function openMenu() {
    if (!nav || !navToggle) return;

    nav.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('has-menu-open');

    if (scrim) {
      scrim.hidden = false;
      /* Next frame, so the browser registers hidden:false before the class
         change — otherwise the fade has nothing to transition from. */
      window.requestAnimationFrame(function () {
        scrim.classList.add('is-visible');
      });
    }
  }

  function closeMenu(options) {
    if (!nav || !navToggle) return;

    var returnFocus = !options || options.returnFocus !== false;

    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('has-menu-open');

    closeAllDropdowns();

    if (scrim) {
      scrim.classList.remove('is-visible');
      /* Wait out the fade before pulling it from the accessibility tree. */
      window.setTimeout(function () {
        if (!isMenuOpen()) scrim.hidden = true;
      }, 350);
    }

    if (returnFocus) navToggle.focus();
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      if (isMenuOpen()) {
        closeMenu({ returnFocus: false });
      } else {
        openMenu();
      }
    });
  }

  if (scrim) {
    scrim.addEventListener('click', function () {
      closeMenu({ returnFocus: false });
    });
  }

  /* Tapping a destination should close the drawer behind you. */
  if (nav) {
    nav.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (link && isMenuOpen()) closeMenu({ returnFocus: false });
    });
  }


  /* ========================================================================
     5. SERVICES DROPDOWN
     On phones this is the only way to open the submenu. On desktop CSS already
     opens it on hover and focus-within; the click toggle stays available so
     keyboard and touch-laptop users aren't locked out.
     ======================================================================== */

  var dropdownParents = Array.prototype.slice.call(
    document.querySelectorAll('[data-dropdown]')
  );

  function closeAllDropdowns(except) {
    dropdownParents.forEach(function (parent) {
      if (parent === except) return;
      var toggle = parent.querySelector('.primary-nav__toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  }

  dropdownParents.forEach(function (parent) {
    var toggle = parent.querySelector('.primary-nav__toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      closeAllDropdowns(parent);
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });

  /* A click anywhere else on the page closes an open desktop panel. */
  document.addEventListener('click', function (event) {
    if (!desktopQuery.matches) return;
    if (event.target.closest('[data-dropdown]')) return;
    closeAllDropdowns();
  });


  /* ========================================================================
     6. KEYBOARD
     ======================================================================== */

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    if (isMenuOpen()) {
      closeMenu();
      return;
    }

    /* Otherwise close an open dropdown and hand focus back to its trigger. */
    var openToggle = document.querySelector('.primary-nav__toggle[aria-expanded="true"]');
    if (openToggle) {
      openToggle.setAttribute('aria-expanded', 'false');
      openToggle.focus();
    }
  });

  /* Keep focus inside the drawer while it's open. */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || !isMenuOpen() || !nav) return;

    var focusable = nav.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    var first = focusable[0];
    var last  = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });


  /* ========================================================================
     7. BREAKPOINT CHANGE
     Crossing into desktop while the drawer is open would otherwise leave the
     body scroll-locked and the scrim stranded on screen.
     ======================================================================== */

  function handleBreakpointChange(event) {
    if (!event.matches) return;
    if (isMenuOpen()) closeMenu({ returnFocus: false });
    closeAllDropdowns();
  }

  if (typeof desktopQuery.addEventListener === 'function') {
    desktopQuery.addEventListener('change', handleBreakpointChange);
  } else {
    /* Safari < 14 */
    desktopQuery.addListener(handleBreakpointChange);
  }


  /* ========================================================================
     8. CAROUSELS
     The scrolling itself is native overflow + CSS scroll-snap, so swipe,
     trackpad, and keyboard already work with JS off. This only wires up the
     arrows and the photo counter, and keeps them in sync with whatever the
     user does to the scroller directly.
     ======================================================================== */

  function initCarousel(root) {
    var viewport = root.querySelector('[data-carousel-viewport]');
    if (!viewport) return;

    var prev    = root.querySelector('[data-carousel-prev]');
    var next    = root.querySelector('[data-carousel-next]');
    var current = root.querySelector('[data-carousel-current]');
    var total   = root.querySelector('[data-carousel-total]');

    var track = viewport.firstElementChild;
    var items = track ? Array.prototype.slice.call(track.children) : [];
    if (!items.length) return;

    function pad(n) { return n < 10 ? '0' + n : String(n); }
    if (total) total.textContent = pad(items.length);

    /* Measured rather than assumed: card width changes with the breakpoint,
       and the gap is whatever the stylesheet says it is. */
    function step() {
      if (items.length < 2) return items[0].getBoundingClientRect().width;
      return items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().left;
    }

    function index() {
      var w = step();
      return w > 0 ? Math.round(viewport.scrollLeft / w) : 0;
    }

    function sync() {
      var i = index();
      /* A sub-pixel gap can leave scrollLeft a hair under the true maximum,
         so treat "within 2px of the end" as the end. */
      var atStart = viewport.scrollLeft <= 2;
      var atEnd   = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 2;

      if (prev) prev.disabled = atStart;
      if (next) next.disabled = atEnd;
      if (current) current.textContent = pad(Math.min(i + 1, items.length));
    }

    function go(dir) {
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      viewport.scrollBy({ left: dir * step(), behavior: reduced ? 'auto' : 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });

    var ticking = false;
    viewport.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { sync(); ticking = false; });
    }, { passive: true });

    /* The services row stops being a scroller at 48em, so the arrow states
       have to be recomputed when the layout changes. */
    window.addEventListener('resize', sync);
    sync();
  }

  Array.prototype.slice.call(document.querySelectorAll('[data-carousel]'))
    .forEach(initCarousel);


  /* ========================================================================
     9. ACTIVE SECTION
     Highlights the nav link for whichever section the reader is in.
     IntersectionObserver rather than a scroll handler: the browser does the
     hit-testing off the main thread.
     ======================================================================== */

  /* Includes the Services item, which is a <button> with no href because it
     also toggles the submenu — it carries data-section instead. */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.primary-nav__link[href^="#"], .primary-nav__link[data-section]')
  );

  if (navLinks.length && 'IntersectionObserver' in window) {

    var linkFor = {};
    var sections = [];

    navLinks.forEach(function (link) {
      var id = link.dataset.section ||
               (link.getAttribute('href') || '').replace('#', '');
      if (!id) return;
      var section = document.getElementById(id);
      if (!section) return;          /* sections not built yet */
      linkFor[id] = link;
      sections.push(section);
    });

    function setActive(id) {
      navLinks.forEach(function (link) { link.classList.remove('is-active'); });
      if (linkFor[id]) linkFor[id].classList.add('is-active');
    }

    var visible = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      /* Whichever tracked section currently covers the most of the band wins,
         so short sections next to tall ones still get their turn. */
      var bestId = null, bestRatio = 0;
      Object.keys(visible).forEach(function (id) {
        if (visible[id] > bestRatio) { bestRatio = visible[id]; bestId = id; }
      });

      if (bestId) setActive(bestId);
    }, {
      /* A band across the middle of the viewport, below the fixed header. */
      rootMargin: '-45% 0px -45% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    sections.forEach(function (section) { observer.observe(section); });
  }


  /* ========================================================================
     10. FAQ
     A vertical tablist of categories, each panel an accordion. Tabs follow the
     WAI-ARIA pattern: one tab in the tab order at a time, arrow keys move
     between them.
     ======================================================================== */

  Array.prototype.slice.call(document.querySelectorAll('[data-faq]')).forEach(function (faq) {

    var tabs = Array.prototype.slice.call(faq.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function selectTab(tab, moveFocus) {
      tabs.forEach(function (other) {
        var isTarget = other === tab;
        other.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        /* Roving tabindex: only the selected tab is reachable by Tab, so the
           tablist is one stop rather than five. */
        other.setAttribute('tabindex', isTarget ? '0' : '-1');

        var panel = document.getElementById(other.getAttribute('aria-controls'));
        if (panel) panel.hidden = !isTarget;
      });

      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { selectTab(tab, false); });

      tab.addEventListener('keydown', function (event) {
        var i = tabs.indexOf(tab);
        var next = null;

        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (event.key === 'Home') next = tabs[0];
        else if (event.key === 'End') next = tabs[tabs.length - 1];
        else return;

        event.preventDefault();
        selectTab(next, true);
      });
    });

    /* Accordion: one answer open per panel, matching the closed-by-default
       look of the rest of the page. */
    Array.prototype.slice.call(faq.querySelectorAll('.faq-panel')).forEach(function (panel) {
      var triggers = Array.prototype.slice.call(panel.querySelectorAll('.faq-item__trigger'));

      triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          var wasOpen = trigger.getAttribute('aria-expanded') === 'true';
          triggers.forEach(function (other) { other.setAttribute('aria-expanded', 'false'); });
          trigger.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
        });
      });
    });
  });

})();
