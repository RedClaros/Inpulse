document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const planCards = document.querySelectorAll('.plan-card');
    const billingToggle = document.getElementById('billing-cycle-checkbox');

    // Function to update prices based on the toggle state
    function updatePrices() {
        const isAnnual = billingToggle.checked;
        
        planCards.forEach(card => {
            const priceSpan = card.querySelector('.price span:first-child');
            const pricePeriod = card.querySelector('.price-period');
            
            const monthlyPrice = card.dataset.monthlyPrice;
            const annualPrice = card.dataset.annualPrice;

            if (isAnnual) {
                priceSpan.textContent = `$${Math.round(annualPrice / 12)}`; // Show monthly equivalent for annual
                pricePeriod.textContent = '/ month (billed annually)';
            } else {
                priceSpan.textContent = `$${monthlyPrice}`;
                pricePeriod.textContent = '/ month';
            }
        });
    }

    // Add event listener to the toggle switch
    if (billingToggle) {
        billingToggle.addEventListener('change', updatePrices);
    }

    // Selection logic
    planCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            planCards.forEach(c => {
                c.classList.remove('selected');
            });

            card.classList.add('selected');
        });
    });

    // Initialize prices on page load
    updatePrices();
});
