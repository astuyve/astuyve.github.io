// Dark Mode Toggle Functionality
(function() {
	'use strict';

	// Check for saved dark mode preference or default to light mode
	const darkModePreference = localStorage.getItem('darkMode');
	const isDarkMode = darkModePreference === 'enabled';

	// Apply dark mode on page load if previously enabled
	if (isDarkMode) {
		document.body.classList.add('dark-mode');
	}

	// Wait for DOM to be ready
	function init() {
		const darkModeToggle = document.getElementById('dark-mode-toggle');

		if (!darkModeToggle) {
			console.warn('Dark mode toggle not found');
			return;
		}

		// Update icon based on current mode
		function updateIcon() {
			const isDark = document.body.classList.contains('dark-mode');
			if (isDark) {
				darkModeToggle.classList.remove('fa-moon-o');
				darkModeToggle.classList.add('fa-sun-o');
			} else {
				darkModeToggle.classList.remove('fa-sun-o');
				darkModeToggle.classList.add('fa-moon-o');
			}
			darkModeToggle.setAttribute('aria-label',
				isDark ? 'Switch to light mode' : 'Switch to dark mode'
			);
		}

		// Set initial icon
		updateIcon();

		// Toggle dark mode on click
		darkModeToggle.addEventListener('click', function(e) {
			e.preventDefault();
			document.body.classList.toggle('dark-mode');

			// Save preference to localStorage
			if (document.body.classList.contains('dark-mode')) {
				localStorage.setItem('darkMode', 'enabled');
			} else {
				localStorage.setItem('darkMode', 'disabled');
			}

			// Update icon
			updateIcon();
		});
	}

	// Initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
