// app.js
document.addEventListener('DOMContentLoaded', () => {
    const score = 85;
    const badge = getBadge(score);

    document.getElementById('product-score').textContent = score;
    document.getElementById('product-badge').textContent = badge;

    // Function to determine badge based on score
    function getBadge(score) {
        if (score >= 70) return 'Gold';
        if (score >= 40) return 'Silver';
        return 'Bronze';
    }
});
