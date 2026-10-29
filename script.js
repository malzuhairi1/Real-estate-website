const header = document.querySelector('[data-header]');
const nav = document.querySelector('[data-nav]');
const navToggle = document.querySelector('[data-nav-toggle]');
const year = document.querySelector('[data-year]');
const revealItems = document.querySelectorAll('[data-reveal]');
const parallaxImage = document.querySelector('[data-parallax]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const contactForms = document.querySelectorAll('[data-contact-form]');

// Sends engagement events to Google Analytics if it has loaded
const trackEvent = (name, params = {}) => {
    if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
    }
};

document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;

    if (!link) {
        return;
    }

    const href = link.getAttribute('href') || '';

    if (href.startsWith('tel:')) {
        trackEvent('phone_call_click', { link_text: link.textContent.trim() });
    } else if (href.includes('linkedin.com')) {
        trackEvent('linkedin_click', { link_url: href });
    } else if (href.startsWith('mailto:')) {
        trackEvent('email_click', { link_text: link.textContent.trim() });
    } else if (nav && nav.contains(link)) {
        trackEvent('nav_click', { link_text: link.textContent.trim() });
    }
});

if (year) {
    year.textContent = new Date().getFullYear();
}

const setHeaderState = () => {
    if (!header) {
        return;
    }

    header.classList.toggle('is-scrolled', window.scrollY > 24);
};

setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

const closeNav = () => {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation');
};

if (nav && navToggle) {
    navToggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
        navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    });

    nav.addEventListener('click', (event) => {
        if (event.target instanceof HTMLAnchorElement) {
            closeNav();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && nav.classList.contains('is-open')) {
            closeNav();
            navToggle.focus();
        }
    });
}

// Staggers sibling elements so they fade in one after another
revealItems.forEach((item) => {
    const siblings = Array.from(item.parentElement.children).filter((child) => child.hasAttribute('data-reveal'));
    const index = siblings.indexOf(item);

    if (index > 0) {
        item.style.setProperty('--delay', `${Math.min(index, 5) * 0.09}s`);
    }
});

if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealItems.forEach((item) => revealObserver.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
}

if (parallaxImage && !prefersReducedMotion) {
    let ticking = false;

    const updateParallax = () => {
        const rect = parallaxImage.parentElement.getBoundingClientRect();
        const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        parallaxImage.style.transform = `translate3d(0, ${progress * -6}%, 0)`;
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });

    updateParallax();
}

const getFormValue = (formData, key) => String(formData.get(key) || '').trim();

const buildMailtoFallback = (formData) => {
    const subject = 'Real Estate Website Message';
    const details = [
        ['Name', getFormValue(formData, 'name')],
        ['Email', getFormValue(formData, 'email')],
        ['Phone', getFormValue(formData, 'phone')],
        ['Message', getFormValue(formData, 'message')],
        ['Submitted from', window.location.href]
    ];
    const body = details
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n\n');

    return `mailto:mushtaqriad@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

contactForms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
        if (!form.checkValidity()) {
            return;
        }

        event.preventDefault();

        const formData = new FormData(form);
        const status = form.querySelector('[data-form-status]');
        const submitButton = form.querySelector('button[type="submit"]');
        const endpoint = form.getAttribute('data-endpoint');

        if (getFormValue(formData, '_honey')) {
            form.reset();
            return;
        }

        if (!endpoint || !window.fetch) {
            window.location.href = buildMailtoFallback(formData);
            return;
        }

        if (status) {
            status.textContent = 'Sending your message...';
            status.classList.remove('is-success', 'is-error');
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Form submission failed');
            }

            form.reset();

            if (status) {
                status.textContent = 'Thanks - your message was sent. I will get back to you directly.';
                status.classList.add('is-success');
            }

            trackEvent('contact_form_submit', { form_id: form.id || undefined });
        } catch (error) {
            if (status) {
                status.textContent = 'I could not send this automatically, so your email app is opening with the message filled in.';
                status.classList.add('is-error');
            }

            trackEvent('contact_form_fallback', { form_id: form.id || undefined });
            window.location.href = buildMailtoFallback(formData);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
});
