// Pathways Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const careerSearch = document.getElementById('career-search');
    const industryFilter = document.getElementById('industry-filter');
    const matchFilter = document.getElementById('match-filter');
    const growthFilter = document.getElementById('growth-filter');
    const salaryFilter = document.getElementById('salary-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const resetSearchBtn = document.getElementById('reset-search');
    const careerCards = document.querySelectorAll('.career-path-card');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noResults = document.getElementById('no-results');
    const pathwaysResults = document.querySelector('.pathways-results');

    // Initialize animation for cards
    initializeCardAnimations();

    // Event Listeners
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);
    resetSearchBtn.addEventListener('click', resetFilters);
    careerSearch.addEventListener('input', debounce(applyFilters, 500));

    // Functions
    function applyFilters() {
        // Show loading indicator
        loadingIndicator.style.display = 'flex';
        pathwaysResults.style.opacity = '0.5';
        noResults.style.display = 'none';

        // Simulate loading delay for better UX
        setTimeout(() => {
            const searchTerm = careerSearch.value.toLowerCase();
            const industry = industryFilter.value;
            const match = matchFilter.value;
            const growth = growthFilter.value;
            const salary = salaryFilter.value;

            let visibleCount = 0;

            careerCards.forEach(card => {
                // Get card data for filtering
                const title = card.querySelector('h3').textContent.toLowerCase();
                const cardIndustry = card.querySelector('.industry').textContent.toLowerCase();
                const matchPercentage = parseInt(card.querySelector('.match-percentage').textContent);
                const growthText = card.querySelector('.growth').classList.contains('high') ? 'high' : 
                                  card.querySelector('.growth').classList.contains('medium') ? 'medium' : 'low';
                const salaryText = card.querySelector('.salary').textContent.toLowerCase();
                const skills = Array.from(card.querySelectorAll('.skill-tag')).map(skill => skill.textContent.toLowerCase());
                const description = card.querySelector('.career-description').textContent.toLowerCase();

                // Check if card matches all filters
                const matchesSearch = searchTerm === '' || 
                                     title.includes(searchTerm) || 
                                     description.includes(searchTerm) || 
                                     skills.some(skill => skill.includes(searchTerm));
                
                const matchesIndustry = industry === 'all' || cardIndustry.includes(industry.toLowerCase());
                
                const matchesMatchPercentage = match === 'all' || 
                                              (match === '90' && matchPercentage >= 90) ||
                                              (match === '80' && matchPercentage >= 80) ||
                                              (match === '70' && matchPercentage >= 70) ||
                                              (match === '60' && matchPercentage >= 60);
                
                const matchesGrowth = growth === 'all' || growthText === growth;
                
                const matchesSalary = salary === 'all' || 
                                     (salary === 'high' && salaryText.includes('$100,000')) ||
                                     (salary === 'medium' && salaryText.includes('$70,000')) ||
                                     (salary === 'low' && salaryText.includes('$40,000')) ||
                                     (salary === 'entry' && parseInt(salaryText.match(/\$([\d,]+)/)[1].replace(',', '')) < 40000);

                // Show or hide card based on filter matches
                if (matchesSearch && matchesIndustry && matchesMatchPercentage && matchesGrowth && matchesSalary) {
                    card.style.display = 'flex';
                    visibleCount++;
                    // Reset animation
                    card.style.animation = 'none';
                    card.offsetHeight; // Trigger reflow
                    card.style.animation = null;
                } else {
                    card.style.display = 'none';
                }
            });

            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            pathwaysResults.style.opacity = '1';

            // Show no results message if needed
            if (visibleCount === 0) {
                noResults.style.display = 'flex';
            } else {
                noResults.style.display = 'none';
            }
        }, 800); // Simulate loading delay
    }

    function resetFilters() {
        // Reset all filter inputs
        careerSearch.value = '';
        industryFilter.value = 'all';
        matchFilter.value = 'all';
        growthFilter.value = 'all';
        salaryFilter.value = 'all';

        // Show loading indicator
        loadingIndicator.style.display = 'flex';
        pathwaysResults.style.opacity = '0.5';
        noResults.style.display = 'none';

        // Simulate loading delay for better UX
        setTimeout(() => {
            // Show all cards
            careerCards.forEach(card => {
                card.style.display = 'flex';
                // Reset animation
                card.style.animation = 'none';
                card.offsetHeight; // Trigger reflow
                card.style.animation = null;
            });

            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            pathwaysResults.style.opacity = '1';
            noResults.style.display = 'none';

            // Reinitialize animations
            initializeCardAnimations();
        }, 500);
    }

    function initializeCardAnimations() {
        careerCards.forEach((card, index) => {
            card.style.animationDelay = `${0.1 * (index + 1)}s`;
        });
    }

    // Utility function for debouncing
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
});