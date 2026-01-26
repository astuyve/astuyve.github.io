// Create a seamless opacity overlay that transitions smoothly
$(document).ready(function() {
	// Add overlay divs to banner and profile section
	if ($('#banner .opacity-overlay').length === 0) {
		$('#banner').prepend('<div class="opacity-overlay"></div>');
	}
	if ($('.wrapper.style1 .opacity-overlay').length === 0) {
		$('.wrapper.style1').prepend('<div class="opacity-overlay"></div>');
	}

	// No need to wrap Stuyvenberg anymore - keeping it simple
});

$(window).on('scroll', function() {
	var scrollTop = $(window).scrollTop();
	var windowHeight = $(window).height();

	// Get section positions
	var bannerTop = $('#banner').offset() ? $('#banner').offset().top : 0;
	var bannerHeight = $('#banner').outerHeight() || 0;
	var profileTop = $('.wrapper.style1').offset() ? $('.wrapper.style1').offset().top : 0;
	var profileHeight = $('.wrapper.style1').outerHeight() || 0;

	// Reduce the scroll range to make opacity increase faster (use 70% of total height)
	var totalHeight = (bannerHeight + profileHeight) * 0.7;

	// Calculate position in the combined sections (0 to 1)
	var progress = (scrollTop - bannerTop) / totalHeight;
	progress = Math.max(0, Math.min(1, progress));

	// Opacity ranges from 0.50 to 1.00
	var opacity = 0.50 + (progress * 0.50);

	// Apply the same opacity to both overlays for seamless transition
	$('#banner .opacity-overlay, .wrapper.style1 .opacity-overlay').css('opacity', opacity);
});

// Trigger on page load
$(window).trigger('scroll');
