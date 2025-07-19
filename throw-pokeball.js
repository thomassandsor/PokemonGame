// Pokeball Throw Sequence Logic
// Handles swipe/drag gesture and animation for Pokeball throw

class PokeballThrow {
    constructor(options) {
        this.pokeballElem = options.pokeballElem;
        this.targetElem = options.targetElem;
        this.onThrow = options.onThrow;
        this.isDragging = false;
        this.startY = 0;
        this.init();
    }

    init() {
        this.pokeballElem.addEventListener('touchstart', this.handleStart.bind(this));
        this.pokeballElem.addEventListener('touchmove', this.handleMove.bind(this));
        this.pokeballElem.addEventListener('touchend', this.handleEnd.bind(this));
        // Desktop fallback
        this.pokeballElem.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));
    }

    handleStart(e) {
        this.isDragging = true;
        this.startY = (e.touches ? e.touches[0].clientY : e.clientY);
        this.pokeballElem.style.transition = 'none';
    }

    handleMove(e) {
        if (!this.isDragging) return;
        const y = (e.touches ? e.touches[0].clientY : e.clientY);
        const deltaY = this.startY - y;
        if (deltaY > 0) {
            this.pokeballElem.style.transform = `translateY(${-deltaY}px)`;
        }
    }

    handleEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        const endY = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
        const deltaY = this.startY - endY;
        // Threshold for successful throw
        if (deltaY > 100) {
            this.animateThrow();
        } else {
            this.pokeballElem.style.transition = 'transform 0.3s';
            this.pokeballElem.style.transform = 'translateY(0)';
        }
    }

    animateThrow() {
        // Animate Pokeball flying to target
        this.pokeballElem.style.transition = 'transform 0.5s cubic-bezier(.42,1.5,.58,1)';
        this.pokeballElem.style.transform = 'translateY(-250px) scale(0.7)';
        setTimeout(() => {
            this.pokeballElem.style.opacity = '0';
            if (typeof this.onThrow === 'function') {
                this.onThrow();
            }
        }, 500);
    }
}

window.PokeballThrow = PokeballThrow;
