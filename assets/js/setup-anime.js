document.addEventListener('DOMContentLoaded', function () {

    const ANIM_DURATION = 2000;
    const ANIM_DELAY = 80;
    // Wait for DOM to be fully loaded and verify anime is available
    if (typeof window.anime === 'undefined') {
        console.error('Anime.js library not loaded');
        return;
    }

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