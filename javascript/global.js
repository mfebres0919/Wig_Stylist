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

})();
