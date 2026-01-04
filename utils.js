/**
 * Utility Functions for Wall-Mounted Box Visualizer
 */

// Easing functions for smooth animation
// t: current time (0 to 1)
const Easing = {
    // Linear (no easing)
    linear: t => t,
    
    // Cubic Ease In Out - Slow start, fast middle, slow end
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    
    // Quadratic Ease Out - Fast start, slow end
    easeOutQuad: t => 1 - (1 - t) * (1 - t)
};

// Helper: Interpolate between two values
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Helper: Clamp value between min and max
function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

// Helper: Convert degrees to radians
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Helper: Smooth Step function for animation phases
// t: current progressive time (0 to 1)
// start: phase start time (0 to 1)
// end: phase end time (0 to 1)
function smoothStep(t, start, end) {
    if (t < start) return 0;
    if (t > end) return 1;
    return (t - start) / (end - start);
}
