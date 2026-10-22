// Easing equation, borrowed from jQuery easing plugin
// http://gsgd.co.uk/sandbox/jquery/easing/
jQuery.easing.easeOutQuart = function (x, t, b, c, d) {
	return -c * ((t=t/d-1)*t*t*t - 1) + b;
};

jQuery(function( $ ){

				
	// TOC, shows how to scroll the whole window
	$('a.mainlink').click(function(){//$.scrollTo works EXACTLY the same way, but scrolls the whole screen
		$.scrollTo( this.hash, 2500, { duration:2000 });
		$(this.hash).find('span.message').text( this.title );
		return false;
	}); 
	
	/**
	 * Most jQuery.localScroll's settings, actually belong to jQuery.ScrollTo, check it's demo for an example of each option.
	 * @see http://flesler.demos.com/jquery/scrollTo/
	 * You can use EVERY single setting of jQuery.ScrollTo, in the settings hash you send to jQuery.LocalScroll.
	 */
	
	// The default axis is 'y', but in this demo, I want to scroll both
	// You can modify any default like this
	$.localScroll.defaults.axis = 'x';
	
	// Scroll initially if there's a hash (#something) in the url 
	$.localScroll.hash({
		target: '#portprojects', // Could be a selector or a jQuery object too.
		duration:1500,
		axis: 'x'
	});
	

	$('#portnav').localScroll({
		target: '#portprojects', // could be a selector or a jQuery object too.
		queue:true,
		duration:1000,
		hash:false,
		axis: 'x',
		onBefore:function( e, anchor, $target ){
			// The 'this' is the settings object, can be modified
		},
		onAfter:function( anchor, settings ){
			// The 'this' contains the scrolled element (#content)
		}
	});
	
	/*$(document).ready(function () {
    	$(".firstproject").addClass("highlighted");
	});	*/
	
	$("a.portlink").hover(
      function () {
        $(this).css("background-position","top right");
      },
	  function () {
        $(this).css("background-position","top left");
      }
    );
	
	$("a.portlink").click(function () { 
		$('#portnav li').removeClass("highlighted");
		$(this).parent("li").addClass("highlighted");
    });
	
});
