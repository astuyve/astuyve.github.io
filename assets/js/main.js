/*
	Spectral by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	skel
		.breakpoints({
			xlarge:	'(max-width: 1680px)',
			large:	'(max-width: 1280px)',
			medium:	'(max-width: 980px)',
			small:	'(max-width: 736px)',
			xsmall:	'(max-width: 480px)'
		});

	$(function() {

		var	$window = $(window),
			$body = $('body'),
			$wrapper = $('#page-wrapper'),
			$banner = $('#banner'),
			$header = $('#header');

		// Disable animations/transitions until the page has loaded.
			$body.addClass('is-loading');

			$window.on('load', function() {
				window.setTimeout(function() {
					$body.removeClass('is-loading');
				}, 100);
			});

		// Mobile?
			if (skel.vars.mobile)
				$body.addClass('is-mobile');
			else
				skel
					.on('-medium !medium', function() {
						$body.removeClass('is-mobile');
					})
					.on('+medium', function() {
						$body.addClass('is-mobile');
					});

		// Fix: Placeholder polyfill.
			$('form').placeholder();

		// Prioritize "important" elements on medium.
			skel.on('+medium -medium', function() {
				$.prioritize(
					'.important\\28 medium\\29',
					skel.breakpoint('medium').active
				);
			});

		// Scrolly.
			$('.scrolly')
				.scrolly({
					speed: 1500,
					offset: $header.outerHeight()
				});

		// Menu.
			$('#menu')
				.append('<a href="#menu" class="close"></a>')
				.appendTo($body)
				.panel({
					delay: 500,
					hideOnClick: true,
					hideOnSwipe: true,
					resetScroll: true,
					resetForms: true,
					side: 'right',
					target: $body,
					visibleClass: 'is-menu-visible'
				});

		// Header.
			if (skel.vars.IEVersion < 9)
				$header.removeClass('alt');

			if ($banner.length > 0
			&&	$header.hasClass('alt')) {

				$window.on('resize', function() { $window.trigger('scroll'); });

				$banner.scrollex({
					bottom:		$header.outerHeight() + 1,
					terminate:	function() { $header.removeClass('alt'); },
					enter:		function() { $header.addClass('alt'); },
					leave:		function() { $header.removeClass('alt'); }
				});

			}

	});

})(jQuery);

// Make entire blog card clickable
$(document).ready(function() {
	$('.spotlight').each(function() {
		var $card = $(this);
		var $link = $card.find('.content h2 a.link');
		
		if ($link.length) {
			var href = $link.attr('href');
			
			$card.css('cursor', 'pointer');
			
			$card.on('click', function(e) {
				// Don't trigger if clicking on a link directly
				if ($(e.target).is('a') || $(e.target).closest('a').length) {
					return;
				}
				window.location.href = href;
			});
		}
	});
});

// Smooth opacity transition on scroll
$(window).on('scroll', function() {
	var scrollTop = $(window).scrollTop();
	var windowHeight = $(window).height();
	
	// Calculate opacity based on scroll position
	// Start at 0.5 (50%) and increase to 0.95 (95%) as user scrolls
	var maxScroll = windowHeight * 1.5; // Transition completes after scrolling 1.5x viewport height
	var opacity = 0.50 + (scrollTop / maxScroll) * 0.45; // 0.50 to 0.95
	
	// Clamp opacity between 0.50 and 0.95
	opacity = Math.min(Math.max(opacity, 0.50), 0.95);
	
	// Apply to banner
	$('#banner').css('background', 'linear-gradient(rgba(255, 255, 255, ' + opacity + '), rgba(255, 255, 255, ' + opacity + ')), url("../../assets/images/banner.jpg")');
	$('#banner').css('background-size', 'cover');
	$('#banner').css('background-position', 'center center');
	$('#banner').css('background-attachment', 'fixed');
	
	// Apply to profile section
	$('.wrapper.style1').css('background', 'linear-gradient(rgba(255, 255, 255, ' + opacity + '), rgba(255, 255, 255, ' + opacity + ')), url("../../assets/images/banner.jpg")');
	$('.wrapper.style1').css('background-size', 'cover');
	$('.wrapper.style1').css('background-position', 'center center');
	$('.wrapper.style1').css('background-attachment', 'fixed');
});

// Trigger once on page load
$(window).trigger('scroll');
