document.addEventListener('DOMContentLoaded', function () {

    const ANIM_DURATION = 2000;
    const ANIM_DELAY = 80;
    // Wait for DOM to be fully loaded and verify anime is available
    if (typeof window.anime === 'undefined') {
        console.error('Anime.js library not loaded');
        return;
    }

    // Get all huge-text elements
    const hugeTexts = document.querySelectorAll('.huge-text');

    hugeTexts.forEach(textElement => {
        // Split text into words and wrap each in a span
        const text = textElement.textContent;
        textElement.textContent = '';

        text.split('').forEach(word => {
            const span = document.createElement('span');
            span.textContent = word;
            span.style.opacity = '0';
            textElement.appendChild(span);
        });

        // Animate each character when the div is in view
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                // First show the element
                textElement.style.opacity = '1';
                window.anime({
                    targets: textElement.querySelectorAll('span'),
                    opacity: [.5, 1],
                    duration: 140,
                    delay: window.anime.stagger(10, { from: 10, to: 100, random: true }),
                    easing: 'easeInOutSine'
                });
                observer.disconnect();
            }
        });
        observer.observe(textElement);
    });

    // Animate every project inside project-line when it's in view
    const projectLines = document.querySelectorAll('.project-container');
    projectLines.forEach(projectLine => {
        const projectItems = projectLine.querySelectorAll('.project');
        projectItems.forEach((item, index) => {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    window.anime({
                        targets: item,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: 2000,
                        delay: 50 + (index * 50) // Stagger each project by .5s
                    });
                    observer.disconnect();
                }
            });
            observer.observe(item);
        });
    });

    // Animate every service inside service-container when it's in view
    const serviceContainer = document.querySelector('.service-container');
    if (serviceContainer) {
        const serviceItems = serviceContainer.querySelectorAll('.service-card');
        serviceItems.forEach((item, index) => {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    window.anime({
                        targets: item,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: ANIM_DURATION,
                        delay: ANIM_DELAY + (index * ANIM_DELAY) // Stagger each project by .5s
                    });
                    observer.disconnect();
                }
            });
            observer.observe(item);
        });
    }

    // Animate every team inside team-container when it's in view
    const teamContainers = document.querySelectorAll('.team-container');
    teamContainers.forEach(teamContainer => {
        const teamItems = teamContainer.querySelectorAll('.team-card');
        teamItems.forEach((item, index) => {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    window.anime({
                        targets: item,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: ANIM_DURATION,
                        delay: ANIM_DELAY + (index * ANIM_DELAY)
                    });
                    observer.disconnect();
                }
            });
            observer.observe(item);
        });
    });
});