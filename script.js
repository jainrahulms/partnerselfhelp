/* ==========================================================================
   Azure Marketplace Partner Resources — script.js
   Mobile navigation, active-section highlighting, card filtering,
   scroll reveal and back-to-top. No dependencies.
   ========================================================================== */
(function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('DOMContentLoaded', function () {
        initNavigation();
        initScrollEffects();
        initExternalLinks();
        initPartnerImage();
        initReveal();
        initBackToTop();
    });

    /* ---------- Mobile navigation ---------- */
    function initNavigation() {
        var hamburger = document.querySelector('.hamburger');
        var menu = document.querySelector('.nav-menu');
        if (!hamburger || !menu) return;

        // Make the hamburger an accessible button without changing the markup
        menu.id = menu.id || 'primary-menu';
        hamburger.setAttribute('role', 'button');
        hamburger.setAttribute('tabindex', '0');
        hamburger.setAttribute('aria-label', 'Toggle navigation menu');
        hamburger.setAttribute('aria-controls', menu.id);
        hamburger.setAttribute('aria-expanded', 'false');

        function setOpen(open) {
            hamburger.classList.toggle('active', open);
            menu.classList.toggle('active', open);
            document.body.classList.toggle('nav-open', open);
            hamburger.setAttribute('aria-expanded', String(open));
        }

        function toggle() { setOpen(!menu.classList.contains('active')); }

        hamburger.addEventListener('click', toggle);
        hamburger.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });

        // Close when a link is chosen
        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () { setOpen(false); });
        });

        // Close on Escape or outside click
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menu.classList.contains('active')) {
                setOpen(false);
                hamburger.focus();
            }
        });
        document.addEventListener('click', function (e) {
            if (menu.classList.contains('active') &&
                !menu.contains(e.target) && !hamburger.contains(e.target)) {
                setOpen(false);
            }
        });

        // Reset when resizing back to desktop
        window.addEventListener('resize', debounce(function () {
            if (window.innerWidth > 768) setOpen(false);
        }, 150));
    }

    /* ---------- Navbar shadow + active link on scroll ---------- */
    function initScrollEffects() {
        var navbar = document.querySelector('.navbar');
        var navLinks = Array.prototype.slice.call(
            document.querySelectorAll('.nav-menu a[href^="#"]')
        );
        var sections = navLinks
            .map(function (a) { return document.querySelector(a.getAttribute('href')); })
            .filter(Boolean);

        function onScroll() {
            var y = window.pageYOffset || document.documentElement.scrollTop;
            if (navbar) navbar.classList.toggle('scrolled', y > 10);

            var offset = (navbar ? navbar.offsetHeight : 0) + 40;
            var current = null;
            sections.forEach(function (sec) {
                if (!sec.classList.contains('is-hidden') && sec.offsetTop - offset <= y) {
                    current = sec.id;
                }
            });
            navLinks.forEach(function (a) {
                var active = a.getAttribute('href') === '#' + current;
                a.classList.toggle('active', active);
                if (active) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
        }

        window.addEventListener('scroll', throttle(onScroll, 100), { passive: true });
        onScroll();
    }

    /* ---------- Open external links consistently in a new tab ---------- */
    function initExternalLinks() {
        document.querySelectorAll('a[href^="http"]').forEach(function (a) {
            if (a.hostname && a.hostname !== window.location.hostname) {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    /* ---------- Hide the partner image block if the image is missing ---------- */
    function initPartnerImage() {
        var img = document.querySelector('.partner-image');
        if (!img) return;
        var section = img.closest('.partner-image-section');
        function hide() { if (section) section.classList.add('is-hidden'); }
        if (img.complete && img.naturalWidth === 0) hide();
        img.addEventListener('error', hide);
    }

    /* ---------- Card filtering (called from Quick Actions buttons) ---------- */
    function filterCards(category) {
        var cards = document.querySelectorAll('.card[data-category]');
        var sections = document.querySelectorAll('main .section');
        var showAll = !category || category === 'all';

        cards.forEach(function (card) {
            var match = showAll || card.getAttribute('data-category') === category;
            card.classList.toggle('is-hidden', !match);
            card.classList.remove('fade-in');
            if (match && !prefersReducedMotion) {
                void card.offsetWidth; // restart animation
                card.classList.add('fade-in');
            }
            // Filtered cards should be visible immediately
            revealNow(card);
        });

        // Hide sections that have no visible cards
        var firstVisible = null;
        sections.forEach(function (sec) {
            var hasVisible = sec.querySelector('.card[data-category]:not(.is-hidden)');
            sec.classList.toggle('is-hidden', !hasVisible);
            if (hasVisible && !firstVisible) firstVisible = sec;
            if (hasVisible) {
                sec.querySelectorAll('.reveal').forEach(revealNow);
            }
        });

        // Highlight the active button
        document.querySelectorAll('.action-btn').forEach(function (btn) {
            var handler = btn.getAttribute('onclick') || '';
            var isActive = handler.indexOf("'" + (showAll ? 'all' : category) + "'") !== -1;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });

        // Bring the results into view
        if (firstVisible) {
            firstVisible.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'start'
            });
        }
    }

    // Exposed globally for the inline onclick handlers in the markup
    window.filterCards = filterCards;

    /* ---------- Scroll reveal ---------- */
    function initReveal() {
        if (prefersReducedMotion || !('IntersectionObserver' in window)) return;

        var targets = document.querySelectorAll(
            '.section-title, .section-description, .card, .quick-actions h2, .action-buttons, .footer-section'
        );
        document.documentElement.classList.add('js-reveal');

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    observer.unobserve(entry.target);
                    revealNow(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        targets.forEach(function (el) {
            el.classList.add('reveal');
            // Stagger cards within each grid
            if (el.classList.contains('card') && el.parentElement) {
                var index = Array.prototype.indexOf.call(el.parentElement.children, el);
                el.style.transitionDelay = Math.min(index % 4, 3) * 80 + 'ms';
            }
            observer.observe(el);
        });
    }

    // Show an element, then drop the reveal classes so its normal hover
    // transitions (e.g. card lift) work without delay afterwards.
    function revealNow(el) {
        if (!el.classList.contains('reveal') || el.classList.contains('revealed')) return;
        el.classList.add('revealed');
        var delay = parseInt(el.style.transitionDelay, 10) || 0;
        setTimeout(function () {
            el.classList.remove('reveal', 'revealed');
            el.style.transitionDelay = '';
        }, 700 + delay);
    }

    /* ---------- Back to top button ---------- */
    function initBackToTop() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'back-to-top';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
        document.body.appendChild(btn);

        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });

        window.addEventListener('scroll', throttle(function () {
            btn.classList.toggle('visible', window.pageYOffset > 600);
        }, 150), { passive: true });
    }

    /* ---------- Helpers ---------- */
    function throttle(fn, wait) {
        var last = 0, timer = null;
        return function () {
            var now = Date.now(), remaining = wait - (now - last);
            if (remaining <= 0) {
                last = now;
                fn();
            } else if (!timer) {
                timer = setTimeout(function () {
                    last = Date.now();
                    timer = null;
                    fn();
                }, remaining);
            }
        };
    }

    function debounce(fn, wait) {
        var timer;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(fn, wait);
        };
    }
})();
