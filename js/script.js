/* =========================================================
   Zoho Global Variables (required)
========================================================= */
window.$zoho = window.$zoho || {};
$zoho.salesiq = $zoho.salesiq || { ready: function () { } };

// Global Intl-Tel-Input storage
window.itiInstances = {};


/* =========================================================
   CUSTOM FIELD VALIDATION
========================================================= */
const NAME_REGEX = /^[A-Za-z\s\.]+$/;
const PHONE_REGEX = /^\d{7,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function addError(input, msg) {
    let container = input.parentElement;
    if (container.classList.contains("iti")) container = container.parentElement;

    let err = container.querySelector(".custom-input-error");
    if (!err) {
        err = document.createElement("div");
        err.className = "custom-input-error";
        err.style.cssText = "color:red;font-size:12px;margin-top:4px;font-weight:600;";
        container.appendChild(err);
    }
    err.textContent = msg;
    input.classList.add("error-field");
}

function removeError(input) {
    input.classList.remove("error-field");
    let container = input.parentElement;
    if (container.classList.contains("iti")) container = container.parentElement;

    const err = container.querySelector(".custom-input-error");
    if (err) err.remove();
}

function customValidateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    let valid = true;

    const name = form.querySelector('input[name="SingleLine"]');
    const email = form.querySelector('input[name="Email"]');
    const phone = form.querySelector('input[name="PhoneNumber_countrycode"]');

    if (!name.value.trim() || !NAME_REGEX.test(name.value.trim())) {
        addError(name, "Name can contain letters only.");
        valid = false;
    } else removeError(name);

    // Only validate email if the user actually typed something
    if (email.value.trim() !== "") {
        if (!EMAIL_REGEX.test(email.value.trim())) {
            addError(email, "Enter a valid email.");
            valid = false;
        } else {
            removeError(email);
        }
    } else {
        removeError(email);
    }

    const cleanPhone = phone.value.replace(/\D/g, "");
    if (!cleanPhone || !PHONE_REGEX.test(cleanPhone)) {
        addError(phone, "Enter a valid phone number.");
        valid = false;
    } else removeError(phone);

    return valid;
}


/* =========================================================
   PHONE INPUT INITIALIZATION
========================================================= */
function initPhoneInput(id) {
    const input = document.getElementById(id);
    if (input && window.intlTelInput) {
        // If this input is inside the popup, attach the dropdown to the popup
        // container so it is clipped inside the popup; otherwise append to body.
        const popupContainer = input.closest('.popup-box');
        const dropdownTarget = popupContainer || document.body;

        const iti = window.intlTelInput(input, {
            separateDialCode: true,
            nationalMode: false,
            initialCountry: "in",
            // Show these six countries as suggestions at the top
            preferredCountries: ["in", "us", "ae", "sg", "au", "gb"],
            autoPlaceholder: "polite",
            dropdownContainer: dropdownTarget,
            utilsScript:
                "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js",
        });
        window.itiInstances[id] = iti;

        // Scoped repositioning shim:
        // When the dropdown opens (flag clicked), the plugin may append the
        // list to <body>. In some environments the computed placement can
        // still be off when inside popups. This listener nudges the list to
        // align with the input and ensures it sits above overlays.
        const repositionDropdown = () => {
            try {
                const rect = input.getBoundingClientRect();
                // Find the visible country list (intl-tel-input may create multiple)
                let list = Array.from(document.querySelectorAll('.iti__country-list'))
                    .find(l => l.offsetParent !== null) || document.querySelector('.iti__country-list');
                if (!list) return;

                // If the input is inside a popup, keep the list inside that popup
                // so it is clipped; otherwise ensure it's attached to <body>.
                const popup = input.closest('.popup-box');
                if (popup) {
                    if (list.parentElement !== popup) popup.appendChild(list);
                } else {
                    if (list.parentElement !== document.body) document.body.appendChild(list);
                }
                if (!list) return;

                // Use fixed positioning so it's placed relative to the viewport
                // (avoids ancestor stacking/scroll issues).
                if (popup) {
                    // position absolute relative to popup so it will be clipped
                    const pRect = popup.getBoundingClientRect();
                    const left = Math.max(8, Math.round(rect.left - pRect.left));
                    const top = Math.round(rect.bottom - pRect.top);
                    list.style.setProperty('position', 'absolute', 'important');
                    list.style.setProperty('left', left + 'px', 'important');
                    list.style.setProperty('top', top + 'px', 'important');
                    list.style.setProperty('min-width', Math.max(rect.width, 260) + 'px', 'important');
                    list.style.setProperty('max-height', (Math.max(120, popup.clientHeight - top - 20)) + 'px', 'important');
                    list.style.setProperty('overflow-y', 'auto', 'important');
                    list.style.setProperty('z-index', '9999', 'important');
                    list.style.setProperty('transform', 'none', 'important');
                } else {
                    // position fixed relative to viewport to escape stacking contexts
                    list.style.setProperty('position', 'fixed', 'important');
                    list.style.setProperty('left', Math.max(8, Math.round(rect.left)) + 'px', 'important');
                    list.style.setProperty('top', Math.round(rect.bottom) + 'px', 'important');
                    list.style.setProperty('min-width', Math.max(rect.width, 260) + 'px', 'important');
                    list.style.setProperty('z-index', '2147483647', 'important');
                    list.style.setProperty('transform', 'none', 'important');
                }
            } catch (e) {
                // swallow errors silently — shim is best-effort
            }
        };

        // Attach a click listener on the wrapper so when the user clicks the flag
        // we reposition shortly after the plugin opens the list.
        const wrapper = input.closest('.iti');
        if (wrapper) {
            wrapper.addEventListener('click', (e) => {
                if (e.target.closest('.iti__selected-flag') || e.target.closest('.iti__selected-dial-code')) {
                    // Run after plugin toggles visibility
                    setTimeout(repositionDropdown, 20);
                }
            });
        }

        // Reposition on window changes if the list is open
        window.addEventListener('resize', () => setTimeout(repositionDropdown, 50));
        window.addEventListener('scroll', () => setTimeout(repositionDropdown, 50));

        // Global fixed-position hack removed.
        // Rationale: forcing `.iti--container` to `position: fixed` globally
        // caused misalignment inside popups and prevented the intl-tel-input
        // library from computing correct dropdown placement. Let the
        // plugin manage positioning; CSS ensures the dropdown remains on top.

        input.addEventListener("countrychange", () => {
            const dial = iti.getSelectedCountryData().dialCode;
            const form = input.closest("form");
            if (form) {
                const cc = form.querySelector('input[name="PhoneNumber_countrycodeval"]');
                if (cc) cc.value = "+" + dial.replace("+", "");
            }
        });
    }
}


/* =========================================================
   FINAL ***ZOHO SUBMISSION FUNCTION***
========================================================= */
window.customValidateAndSubmit = function (formId) {
    const form = document.getElementById(formId);

    // 1) Custom validation
    if (!customValidateForm(formId)) return false;

    // 2) Collect phone details
    const inputId = formId === "heroForm" ? "heroMobile" : "popupMobile";
    const iti = window.itiInstances[inputId];

    let dialCode = "91";
    let cleanNumber = "";

    if (iti) {
        dialCode = iti.getSelectedCountryData().dialCode || "91";
        cleanNumber = document.getElementById(inputId).value.replace(/\D/g, "");
    } else {
        cleanNumber = form
            .querySelector('input[name="PhoneNumber_countrycode"]')
            .value.replace(/\D/g, "");
    }

    dialCode = dialCode.replace("+", "");

    // *** REQUIRED by Zoho ***
    const cc = form.querySelector('input[name="PhoneNumber_countrycodeval"]');
    if (cc) cc.value = "+" + dialCode;

    const phoneField = form.querySelector('input[name="PhoneNumber_countrycode"]');
    if (phoneField) phoneField.value = cleanNumber;

    // 3) OPTIONAL full phone backup field
    const fullPhone = form.querySelector('input[name="PhoneNumber"]');
    if (fullPhone) fullPhone.value = "+" + dialCode + cleanNumber;

    // 4) Allow form to POST normally to Zoho
    return true;
};


/* =========================================================
   DOM READY
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initPhoneInput("heroMobile");
    initPhoneInput("popupMobile");



    /* MOBILE MENU ANIMATION LOGIC */
    const toggle = document.getElementById("menuToggle");
    const mobileMenu = document.getElementById("mobileMenu");

    if (toggle && mobileMenu) {
        toggle.addEventListener("click", () => {
            const isOpen = mobileMenu.classList.contains("open");

            mobileMenu.classList.toggle("open", !isOpen);
            toggle.classList.toggle("active", !isOpen);

            // Icon switch
            toggle.textContent = isOpen ? "☰" : "×";
        });

        // Close menu when clicking any menu link
        document.querySelectorAll("#mobileMenu a").forEach((a) => {
            a.addEventListener("click", () => {
                mobileMenu.classList.remove("open");
                toggle.classList.remove("active");
                toggle.textContent = "☰";
            });
        });
    }

    /* ANIMATIONS */
    const revealObs = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible", "reveal-visible");
                    revealObs.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1 }
    );
    document
        .querySelectorAll(".reveal, .premium-list, .g-item")
        .forEach((el) => revealObs.observe(el));

    /* ACCORDION */
    document.querySelectorAll(".accordion-header").forEach((header) => {
        header.addEventListener("click", () => {
            const card = header.parentElement;
            const body = header.nextElementSibling;
            const open = card.classList.contains("active");

            document.querySelectorAll(".accordion-card").forEach((c) => {
                c.classList.remove("active");
                c.querySelector(".accordion-body").style.maxHeight = null;
            });

            if (!open) {
                card.classList.add("active");
                body.style.maxHeight = body.scrollHeight + "px";
            }
        });
    });

    /* AMENITY CARD PARALLAX */
    document.querySelectorAll(".amenity-card").forEach((card) => {
        card.addEventListener("mousemove", (e) => {
            const r = card.getBoundingClientRect();
            card.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -20}deg`);
            card.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 20}deg`);
        });
        card.addEventListener("mouseleave", () => {
            card.style.setProperty("--rx", "0deg");
            card.style.setProperty("--ry", "0deg");
        });
    });
});


/* =========================================================
   POPUP LOGIC
========================================================= */
const popupOverlay = document.getElementById("popupOverlay");
const popupClose = document.getElementById("popupClose");
const popupBox = document.querySelector(".popup-box");   // ⭐ NEW LINE
let popupOpened = false,
    popupDismissed = false;

function showPopup(force = false) {
    if (!popupOverlay || popupOpened) return;
    if (popupDismissed && !force) return;

    popupOverlay.style.display = "flex";
    popupOpened = true;

    // ⭐ Trigger underline animation
    popupBox.classList.add("active");

    // If any intl-tel-input lists are open, reposition them
    setTimeout(() => {
        try {
            const lists = document.querySelectorAll('.iti__country-list');
            lists.forEach((l) => {
                const related = document.querySelector('#popupMobile') || document.querySelector('#heroMobile');
                if (related) {
                    const rect = related.getBoundingClientRect();
                    l.style.setProperty('position', 'fixed', 'important');
                    l.style.setProperty('left', Math.max(8, Math.round(rect.left)) + 'px', 'important');
                    l.style.setProperty('top', Math.round(rect.bottom) + 'px', 'important');
                    l.style.setProperty('min-width', Math.max(rect.width, 260) + 'px', 'important');
                    l.style.setProperty('z-index', '2147483647', 'important');
                    l.style.setProperty('transform', 'none', 'important');
                    if (l.parentElement !== document.body) document.body.appendChild(l);
                }
            });
        } catch (e) { }
    }, 30);
}

function closePopup() {
    popupOverlay.style.display = "none";
    popupOpened = false;
    popupDismissed = true;

    // ⭐ Reset animation so it can run again next time
    popupBox.classList.remove("active");
}

popupClose?.addEventListener("click", closePopup);

popupOverlay?.addEventListener("click", (e) => {
    if (e.target === popupOverlay) closePopup();
});

document.querySelectorAll(".enquire-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        showPopup(true);
    })
);


setTimeout(showPopup, 3000);

document.addEventListener("mouseout", (e) => {
    if (e.clientY < 15 && !popupOpened && !popupDismissed) showPopup(true);
});

/* SCROLL TO TOP */
const scrollBtn = document.getElementById("scrollTopBtn");
window.addEventListener("scroll", () =>
    scrollBtn?.classList.toggle("show", window.scrollY > 300)
);
scrollBtn?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
);

/* =========================================================
   SCROLL SPY
========================================================= */
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".desktop-menu a, .mobile-menu a");

window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        // Offset of 120px to trigger highlight slightly before the section hits top
        if (pageYOffset >= sectionTop - 120) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach((link) => {
        link.classList.remove("active");
        if (link.getAttribute("href").includes(current)) {
            link.classList.add("active");
        }
    });
});


/* =========================================================
   MOBILE PRICE 3D CYLINDER & ARROW LOGIC
========================================================= */
// Lightweight RAF-throttle helper for scroll-driven updates
function rafThrottle(fn) {
    let ticking = false;
    return function (...args) {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(() => {
                fn.apply(this, args);
                ticking = false;
            });
        }
    };
}

document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".price-grid");
    const cards = document.querySelectorAll(".price-card");
    const prevBtn = document.querySelector(".prev-arrow");
    const nextBtn = document.querySelector(".next-arrow");

    if (!container || !cards.length) return;

    // 1. Function to Calculate 3D Classes
    const updateCylinderEffect = () => {
        const containerCenter = container.getBoundingClientRect().left + container.offsetWidth / 2;

        let closestCard = null;
        let minDistance = Infinity;

        cards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.left + rect.width / 2;
            const distance = Math.abs(containerCenter - cardCenter);

            card.classList.remove("active-card", "prev-card", "next-card");

            if (distance < minDistance) {
                minDistance = distance;
                closestCard = card;
            }
        });

        if (closestCard) {
            closestCard.classList.add("active-card");
            const prev = closestCard.previousElementSibling;
            const next = closestCard.nextElementSibling;
            if (prev) prev.classList.add("prev-card");
            if (next) next.classList.add("next-card");
        }
    };

    // 2. Arrow Button Logic
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener("click", () => {
            container.scrollBy({ left: -280, behavior: "smooth" });
        });

        nextBtn.addEventListener("click", () => {
            container.scrollBy({ left: 280, behavior: "smooth" });
        });
    }

    // 3. Run on Scroll & Init (throttled via rAF for smoother animations)
    container.addEventListener("scroll", rafThrottle(updateCylinderEffect));

    // Safety check added here
    setTimeout(() => {
        if (cards.length > 0) {
            const cardWidth = cards[0].offsetWidth;
            container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
            updateCylinderEffect();
        }
    }, 100);
});


/* =========================================================
   FLOOR PLAN 3D LOGIC
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

    // --- 1. Setup Variables ---
    const fContainer = document.querySelector(".floor-grid");
    const fCards = document.querySelectorAll(".floor-card");
    const fPrevBtn = document.querySelector(".floor-prev");
    const fNextBtn = document.querySelector(".floor-next");

    if (!fContainer || !fCards.length) return;

    // --- 2. Calculate 3D Classes ---
    const updateFloorCylinder = () => {
        const center = fContainer.getBoundingClientRect().left + fContainer.offsetWidth / 2;
        let closest = null;
        let minDist = Infinity;

        fCards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.left + rect.width / 2;
            const dist = Math.abs(center - cardCenter);

            card.classList.remove("active-card", "prev-card", "next-card");

            if (dist < minDist) {
                minDist = dist;
                closest = card;
            }
        });

        if (closest) {
            closest.classList.add("active-card");
            const prev = closest.previousElementSibling;
            const next = closest.nextElementSibling;
            if (prev) prev.classList.add("prev-card");
            if (next) next.classList.add("next-card");
        }
    };

    // --- 3. Arrow Logic ---
    if (fPrevBtn && fNextBtn) {
        fPrevBtn.addEventListener("click", () => {
            fContainer.scrollBy({ left: -280, behavior: "smooth" });
        });
        fNextBtn.addEventListener("click", () => {
            fContainer.scrollBy({ left: 280, behavior: "smooth" });
        });
    }

    // --- 4. Run on Scroll & Init (throttled via rAF for smoother animations) ---
    fContainer.addEventListener("scroll", rafThrottle(updateFloorCylinder));

    // Safety check added here
    setTimeout(() => {
        if (fCards.length > 0) {
            fContainer.scrollLeft = (fContainer.scrollWidth - fContainer.clientWidth) / 2;
            updateFloorCylinder();
        }
    }, 100);
});


/* =========================================================
   GALLERY 3D CYLINDER LOGIC
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const gContainer = document.querySelector(".premium-gallery");
    const gItems = document.querySelectorAll(".g-item");
    const gPrevBtn = document.querySelector(".gallery-prev");
    const gNextBtn = document.querySelector(".gallery-next");

    if (!gContainer || !gItems.length) return;

    // 1. Arrow Click Logic
    if (gPrevBtn && gNextBtn) {
        gPrevBtn.addEventListener("click", () => {
            gContainer.scrollBy({ left: -280, behavior: "smooth" });
        });

        gNextBtn.addEventListener("click", () => {
            gContainer.scrollBy({ left: 280, behavior: "smooth" });
        });
    }

    // 2. Cylinder Effect Logic
    const updateGalleryCylinder = () => {
        // Only run on mobile
        if (window.innerWidth > 900) return;

        const center = gContainer.getBoundingClientRect().left + gContainer.offsetWidth / 2;
        let closest = null;
        let minDist = Infinity;

        gItems.forEach((item) => {
            const rect = item.getBoundingClientRect();
            const itemCenter = rect.left + rect.width / 2;
            const dist = Math.abs(center - itemCenter);

            item.classList.remove("active-card", "prev-card", "next-card");

            if (dist < minDist) {
                minDist = dist;
                closest = item;
            }
        });

        if (closest) {
            closest.classList.add("active-card");
            const prev = closest.previousElementSibling;
            const next = closest.nextElementSibling;
            if (prev) prev.classList.add("prev-card");
            if (next) next.classList.add("next-card");
        }
    };

    // 3. Run on Scroll & Init (throttled via rAF for smoother animations)
    gContainer.addEventListener("scroll", rafThrottle(updateGalleryCylinder));

    // Safety check added here
    setTimeout(() => {
        if (window.innerWidth <= 900 && gItems.length > 0) {
            gContainer.scrollLeft = 100;
            updateGalleryCylinder();
        }
    }, 100);
});

// ============================================================
// Google Review Counter – Scroll Trigger + Smooth Animation
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const counterEl = document.getElementById("reviewCounter");
    if (!counterEl) return; // Safe exit

    const finalValue = 780;
    let hasAnimated = false; // To avoid re-triggering

    // Smooth count-up animation
    function animateCounter() {
        const duration = 1200; // total time in ms
        const startTime = performance.now();

        function update(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out curve

            counterEl.textContent = Math.floor(easedProgress * finalValue);

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counterEl.textContent = finalValue; // Snap to final
            }
        }

        requestAnimationFrame(update);
    }

    // Trigger when Trust Section enters viewport
    const trustSection = document.querySelector(".trust-section");

    if (trustSection) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated) {
                        hasAnimated = true;
                        animateCounter();
                    }
                });
            },
            { threshold: 0.3 } // triggers when 30% of section is visible
        );

        observer.observe(trustSection);
    }
});

/* =========================================================
   FINAL FAQ LOGIC — CLEAN + FIXED FOR YOUR CSS
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const faqSection = document.querySelector("#faq");
    if (!faqSection) return;

    const cards = Array.from(faqSection.querySelectorAll(".accordion-card"));
    const readMoreBtn = document.getElementById("faqToggleBtn");
    const askBtn = faqSection.querySelector(".enquire-btn");

    if (!cards.length || !readMoreBtn || !askBtn) return;

    /* -------- GROUP FAQS -------- */
    const firstSet = cards.slice(0, 5);
    const secondSet = cards.slice(5, 8);
    const finalSet = cards.slice(8);

    /* -------- HIDE ALL EXCEPT FIRST 5 -------- */
    secondSet.forEach(c => c.classList.add("faq-hidden"));
    finalSet.forEach(c => c.classList.add("faq-hidden"));

    askBtn.classList.add("faq-ask-hidden");

    let stage = 0;

    /* =========================================================
       READ MORE / SHOW LESS LOGIC
    ========================================================== */
    readMoreBtn.addEventListener("click", () => {

        // Stage 0 → Show 6–8
        if (stage === 0) {
            secondSet.forEach(c => {
                c.classList.remove("faq-hidden");
                c.classList.add("faq-revealed");
            });
            stage = 1;
            return;
        }

        // Stage 1 → Show ALL + Ask Btn
        if (stage === 1) {
            finalSet.forEach(c => {
                c.classList.remove("faq-hidden");
                c.classList.add("faq-revealed");
            });

            askBtn.classList.remove("faq-ask-hidden");
            readMoreBtn.textContent = "Show Less";

            stage = 2;
            return;
        }

        /* --- Stage 2 → Collapse to first 5 --- */
        if (stage === 2) {

            // Hide 6–12 completely
            secondSet.forEach(card => {
                card.classList.remove("faq-revealed");
                card.classList.add("faq-hidden");
            });

            finalSet.forEach(card => {
                card.classList.remove("faq-revealed");
                card.classList.add("faq-hidden");
            });

            // EXTRA FIX — remove any leftover reveal class
            [...secondSet, ...finalSet].forEach(card => {
                card.classList.remove("faq-revealed");
                card.classList.add("faq-hidden");
            });

            askBtn.classList.add("faq-ask-hidden");
            readMoreBtn.textContent = "Read more";

            faqSection.scrollIntoView({ behavior: "smooth" });

            stage = 0;
            return;
        }
    });

    /* =========================================================
       ACCORDION OPEN / CLOSE — CLEAN + MATCHES CSS
    ========================================================== */

    cards.forEach(card => {
        const header = card.querySelector(".accordion-header");

        header.addEventListener("click", () => {
            const isOpen = card.classList.contains("active");

            // Close all
            cards.forEach(c => c.classList.remove("active"));

            // Open selected
            if (!isOpen) {
                card.classList.add("active");
            }
        });
    });

});
