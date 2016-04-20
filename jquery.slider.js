/**
 * jQuery Slider v2.7
 *
 * @author Dymyw <dymayongwei@163.com>
 * @since 2013-12-12
 * @version 2015-05-21
 */

(function($) {
    /**
     * plugin definition
     *
     * @param {array|string} configs
     * @returns {object}
     */
    $.fn.slider = function(configs) {
        if ('object' === typeof configs) {
            return this.each(function() {
                new $.slider(this, configs);
            });
        } else {
            var $slider = this.data('slider');
            switch (configs) {
                case 'resize':
                    $slider.resize(); break;
                case 'stop':
                    $slider.stop(); break;
                case 'start':
                    $slider.start(); break;
            }
        }
    };

    /**
     * plugin defaults - added as a property on our plugin function
     *
     * @param {selector} items              slide items
     * @param {integer} border              slide items border
     * @param {float} view                  numbers can be see
     * @param {float} skip                  every time the number of slide
     * @param {float} offset                offset per slide, just for slide effect
     * @param {integer} current             the current group, according to the skip
     * @param {boolean} loop                traditional loop
     * @param {boolean} circle              circle loop
     * @param {integer} auto                automatic slide time interval, in milliseconds
     * @param {integer} speed               time from one to another, in milliseconds
     * @param {boolean} touch               whether bind touch events, true or false
     * @param {object} dynamic              dynamic access view number, according to the screen width
     * @param {string} effect               slider effect, slide or fade
     * @param {selector} previous           click to display the previous
     * @param {selector} next               click to display the next
     * @param {string} disabled_class       loop & circle is false, previous and next selectors will add the class
     * @param {selector} nav                click to display the corresponding one
     * @param {function} before             callback function
     * @param {function} after              callback function
     * @param {function} get_items          callback function
     * @param {function} item_template      when call the get_items(), use the template for items
     * @param {function} cloneAfter         callback function, call after clone
     * @param {function} initAfter          callback function, call after init
     */
    $.fn.slider.defaults = {
        // slider options
        items: 'li',
        border: 0,
        view: 1,
        skip: 1,
        offset: 0,
        current: 0,
        loop: false,
        circle: false,
        auto: 0,
        speed: 300,
        touch: true,
        dynamic: {},
        effect: 'slide',    // slide | fade

        // slider selectors
        previous: '',
        next: '',
        disabled_class: '',
        nav: '',

        // callback api
        before: function() {},
        after: function() {},
        get_items: function() {},
        item_template: function() {}, // '<li><img src="{0}" data-src="{1}" /></li>'
        cloneAfter: function() {},
        initAfter: function() {}
    };

    /**
     * slider object instance
     *
     * @param {object} container
     * @param {array} configs
     */
    $.slider = function(container, configs) {
        var $slider = $(container);

        // making options public
        $slider.options = $.extend({}, $.fn.slider.defaults, configs);
        // store a reference to the slider object
        $.data(container, 'slider', $slider);

        // open test mode or not
        var __debug = false;

        // global vars
        var width, itemWidth, slideWidth, offsetWidth,
            $items = $slider.children($slider.options.items),
            itemLength = $items.length,
            group = Math.ceil(itemLength / $slider.options.skip),
            screenGroup = $slider.options.view / $slider.options.skip,
            current = parseInt($slider.options.current),
            msGesture = window.navigator && window.navigator.msPointerEnabled && window.MSGesture,
            touch = !!("ontouchstart" in window) || window.navigator.msMaxTouchPoints > 0,
            loadItems = true,
            cloneItems = true,
            first = true,
            delay = $slider.options.auto || 0, auto = null;

        if ($slider.options.effect === 'fade') {
            $slider.options.loop = true;
        }

        // container data-*
        $slider.attr('data-view', $slider.options.view);
        $slider.attr('data-offset', $slider.options.offset);
        $slider.attr('data-current', current);
        $slider.attr('data-effect', $slider.options.effect);
        $slider.attr('data-loop', $slider.options.loop);
        $slider.attr('data-circle', $slider.options.circle);

        // initialize
        var _init = function() {
            // get the parentNode width
            width = $(container.parentNode).css('width');
            if (!width || width.indexOf('%') !== -1) {
                width = container.parentNode.getBoundingClientRect().width || container.parentNode.offsetWidth;
            }
            width = parseInt(width);

            /**
             * The idea
             *
             *          |       Screen      |
             *  0  1  2 | 3  4  5 | 6  7  8 | 9  10  11
             *          |  screenGroup = 2  |
             *          |one group|
             *          | current |
             *
             *              itemLength = 12
             *  view = 6    skip = 3    screenGroup = 2
             *              group = 4
             */

            // dynamic -- view
            if (!$.isEmptyObject($slider.options.dynamic)) {
                $slider.options.view = _getDynamicView(width);
            }
            if ($slider.options.view === 1 || $slider.data('view') === $slider.options.view) {
                current = $slider.data('current');
            } else {
                current = 0;
            }
            screenGroup = $slider.options.view / $slider.options.skip;

            // only once clone items
            if (itemLength >= $slider.options.view) {
                $slider.options.effect = $slider.data('effect');
//                $slider.options.loop = ('false' === $slider.attr('data-loop')) ? false : true;
                $slider.options.circle = ('false' === $slider.attr('data-circle')) ? false : true;
                if (cloneItems && $slider.options.effect === 'slide') {
                    _cloneItems();
                }
            }

            // set container width
            itemWidth = Math.floor(width / $slider.options.view);
            slideWidth = itemWidth * $slider.options.skip;
            offsetWidth = itemWidth * $slider.attr('data-offset');
            $slider.css({width: itemWidth * itemLength + 'px'});
            for (var i = 0; i < itemLength; i++) {
                var $item = $items.eq(i);

                // set item width and item group index
                $item.css({width: itemWidth - 2 * $slider.options.border + 'px'});

                if ($slider.options.effect === 'slide') {
                    if (!$item.hasClass('slider-clone')) {
                        var index = Math.floor(i / $slider.options.skip) - 1;
                        $item.attr('data-index', index);
                    }
                } else if ($slider.options.effect === 'fade') {
                    var index = Math.floor(i / $slider.options.skip);
                    $item.attr('data-index', index);
                    $item.css({left: -index * width});
                    if (index !== current) {
                        $item.css({
                            opacity: 0,
                            visibility: 'hidden'
                        });
                    }
                }
            }

            // set container left
            if ($slider.options.effect === 'slide') {
                $slider.css({left: ((current + 1) * -slideWidth + offsetWidth) + 'px'});
            }

            // selectors bind event
            _initSelectors();

            _loadFn($slider.options.initAfter($slider));
        };

        // clone items append to before and after, reset $items and itemLength
        var _cloneItems = function() {
            // remove all clone items
            $items.remove('.slider-clone');
            $items = $slider.children($slider.options.items);
            itemLength = $items.length;

            for (var i = 0; i < $slider.options.skip; i++) {
                $slider.prepend(
                        $items.eq(itemLength - 1 - i)
                        .clone(true)
                        .addClass('slider-clone')
                        .css('min-height', '1px')
                );
            }
            for (var i = 0; i < $slider.options.view; i++) {
                $slider.append(
                        $items.eq(i)
                        .clone(true)
                        .addClass('slider-clone')
                        .css('min-height', '1px')
                );
            }
            $items = $slider.children($slider.options.items);
            itemLength = $items.length;

            // callback function cloneAfter
            if (first) {
                _loadFn($slider.options.cloneAfter($slider));
                first = false;
            }
            // only once
            cloneItems = false;
        };

        var inProcessing = false;
        var watchedEvent = false;
        var _initSelectors = function() {
            // previous selector
            if ($slider.options.previous) {
                $($slider.options.previous).unbind('click').click(function() {
                    if (loadItems) {
                        _loadItems();
                    }

                    // setup flags to prevent event duplication
                    $slider.stop();
                    watchedEvent = touch;

                    // quickly click several times
                    if (!inProcessing) {
                        $slider.prev();
                    }
                });
            }

            // next selector
            if ($slider.options.next) {
                $($slider.options.next).unbind('click').click(function() {
                    if (loadItems) {
                        _loadItems();
                    }

                    // setup flags to prevent event duplication
                    $slider.stop();
                    watchedEvent = touch;

                    // quickly click several times
                    if (!inProcessing) {
                        $slider.next();
                    }
                });
            }

            // add disabled class
            if ($slider.options.previous && $slider.options.disabled_class && false === $slider.options.loop && false === $slider.options.circle) {
                0 === current ? $($slider.options.previous).addClass($slider.options.disabled_class) : $($slider.options.previous).removeClass($slider.options.disabled_class);
            }
            if ($slider.options.next && $slider.options.disabled_class && false === $slider.options.loop && false === $slider.options.circle) {
                (group - screenGroup) === current ? $($slider.options.next).addClass($slider.options.disabled_class) : $($slider.options.next).removeClass($slider.options.disabled_class);
            }

            // nav selector
            if ($slider.options.nav) {
                $($slider.options.nav).eq(current).addClass('current').siblings().removeClass();

                $($slider.options.nav).unbind('click').click(function() {
                    if (loadItems) {
                        _loadItems();
                    }

                    // stop auto slide, slide to the requested one
                    $slider.stop();
                    watchedEvent = touch;

                    if (!inProcessing) {
                        _slide($(this).index($($slider.options.nav).selector));
                    }
                });
            }
        };

        var _slide = function(to, speed) {
            // do nothing if already on requested slide
            if (to === current) {
                return;
            }

            // slide speed
            var slideSpeed = (speed && speed < $slider.options.speed) ? speed : $slider.options.speed;

            inProcessing = true;

            // callback function before
            _loadFn($slider.options.before($slider));

            if ($slider.options.effect === 'slide') {
                $slider.animate({left: ((to + 1) * -slideWidth + offsetWidth) + 'px'}, slideSpeed);
                if ($slider.options.circle) {
                    if (to === group) {
                        $slider.animate({left: (-slideWidth + offsetWidth) + 'px'}, 0);
                        current = 0;
                    } else if (-1 === to) {
                        $slider.animate({left: (group * -slideWidth + offsetWidth) + 'px'}, 0);
                        current = group - 1;
                    } else {
                        current = to;
                    }
                } else {
                    current = to;
                }
            } else if ($slider.options.effect === 'fade') {
                $slider.find($slider.options.items + "[data-index=" + to + "]").css({visibility: 'visible'}).animate({
                    opacity: 1
                }, $slider.options.speed);
                $slider.find($slider.options.items + "[data-index=" + current + "]").animate({
                    opacity: 0
                }, $slider.options.speed, '', function() {
                    $(this).css({visibility: 'hidden'});
                });

                current = to;
            }

            // add data-current for dynamic
            $.data(container, 'current', current);

            // callback function after
            _loadFn($slider.options.after($slider));

            // if auto slide, continue after the end of selector event
            if ($slider.options.auto && watchedEvent) {
                $slider.start();
                watchedEvent = false;
            }

            // selectors bind event
            _initSelectors();

            setTimeout(function() {
                inProcessing = false;
            }, $slider.options.speed);
        };

        var _circle = function(index) {
            return (group + (index % group)) % group;
        };

        var _loadFn = function(fn) {
            setTimeout(function() {
                fn;
            }, 0);
        };

        var _getDynamicView = function(width) {
            for (var i in $slider.options.dynamic) {
                var temp = $slider.options.dynamic[i].split(',');
                var from = ('' === temp[0]) ? 0 : temp[0];
                var to = ('' === temp[1]) ? 10000 : temp[1];

                if (width >= from && width <= to) {
                    return i;
                    break;
                }
            }
        };

        var _loadItems = function() {
            loadItems = false;
            var items = $slider.options.get_items();
            if ('object' === typeof items) {
                var itemString = '';
                var patt = /\{\d+\}/g;
                for (var i in items) {
                    itemString += _regExpReplace($slider.options.item_template(), items[i], patt);
                }

                // change html and bind event
                $slider.html(itemString);
                group = items.length;
                if ($slider.options.effect === 'slide') {
                    _cloneItems();
                }
                _init();
                if (touch && $slider.options.touch) {
                    if (!msGesture) {
                        container.addEventListener('touchstart', bindTouchEvent, false);
                    }
                }
            }
        };

        var _regExpReplace = function(str, arr, patt) {
            while ((result = patt.exec(str)) != null)  {
                var tmp = result.toString().slice(1, -1);
                if(typeof arr[tmp] !== 'undefined') {
                    str = str.replace(result.toString(), arr[tmp]);
                } else {
                    str = str.replace(result.toString(), arr);
                }
            }

            return str;
        };

        $slider.prev = function(speed) {
            if ($slider.options.loop) {
                _slide(_circle(current - 1), speed);
            } else if (($slider.options.circle && current > -1) || current) {
                _slide(current - 1, speed);
            }
        };

        $slider.next = function(speed) {
            if ($slider.options.loop) {
                _slide(_circle(current + 1), speed);
            } else if (($slider.options.circle && current < group) || current < group - screenGroup) {
                _slide(current + 1, speed);
            }
        };

        $slider.start = function() {
            if (null === auto) {
                delay = $slider.options.auto || 0;
                auto = setInterval($slider.next, delay);
            }
        };

        $slider.stop = function() {
            if (auto) {
                delay = 0;
                clearInterval(auto);
                auto = null;
            }
        };

        $slider.resize = function() {
            // stop auto slide, slide to the requested one
            if (auto) {
                $slider.stop();
                watchedEvent = false;
            }

            // if dynamic reset the view, need to reclone, remove all clone items
            $items.remove('.slider-clone');
            $items = $slider.children($slider.options.items);
            itemLength = $items.length;
            cloneItems = true;
            _init();

            if ($slider.options.auto) {
                $slider.start();
            }
        };

        // bind touch event
        var startTouch = false,
            startPos, isScrolling, delta;
        var bindTouchEvent = {
            handleEvent: function(event) {
                switch (event.type) {
                    case 'touchstart':
                        this.start(event);
                        break;

                    case 'touchmove':
                        this.move(event);
                        break;

                    case 'touchend':
                        this.end();
                        break;
                }
            },

            start: function(event) {
                startTouch = true;
                $slider.stop();

                if (startTouch) {
                    var touchs = event.changedTouches[0];

                    startPos = {
                        x: touchs.pageX,
                        y: touchs.pageY,
                        // store time to determine touch duration
                        time: +new Date
                    };
                    if (loadItems) {
                        _loadItems();
                    }

                    $slider.stop();
                    watchedEvent = true;

                    // used for testing first move event
                    isScrolling = undefined;

                    // reset delta and end measurements
                    delta = {};

                    // attach touchmove and touchend listeners
                    container.addEventListener('touchmove', this, false);
                    container.addEventListener('touchend', this, false);
                }
            },

            move: function(event) {
                if (startTouch) {
                    // ensure swiping with one touch and not pinching
                    if (event.touches.length > 1 || event.scale && event.scale !== 1) {
                        return;
                    }

                    var touchs = event.changedTouches[0];
                    delta = {
                        x: touchs.pageX - startPos.x,
                        y: touchs.pageY - startPos.y
                    };

                    // determine if scrolling test has run - one time test
                    if ('undefined' === typeof isScrolling) {
                        isScrolling = !!(isScrolling || Math.abs(delta.x) < Math.abs(delta.y));
                    }

                    if (!isScrolling) {
                        event.preventDefault();

                        $slider.animate({left: (delta.x + (current + 1) * -slideWidth + offsetWidth) + 'px'}, 0);
                    }
                }
            },

            end: function() {
                startTouch = false;

                // measure duration
                var duration = +new Date - startPos.time;

                // determine if slide attempt triggers next/prev slide
                var isValidSlide =
                        Number(duration) < 250              // if slide duration is less than 250ms
                        && Math.abs(delta.x) > 20           // and if slide amt is greater than 20px
                        || Math.abs(delta.x) > width / 4;   // or if slide amt is greater than 1/4 the width

                // speed * 0.85, add touchSpeed to eliminate the delay effect
//                var touchSpeed = (width - Math.abs(delta.x)) * duration / Math.abs(delta.x) * 0.5;
                var touchSpeed = 360;

                if (!isScrolling) {
                    if (isValidSlide) {
                        delta.x > 0 ? $slider.prev(touchSpeed) : $slider.next(touchSpeed);
                    } else {
                        $slider.animate({left: ((current + 1) * -slideWidth + offsetWidth) + 'px'}, touchSpeed);
                    }
                }

                // kill touchmove and touchend event listeners until touchstart called again
                container.removeEventListener('touchmove', this, false);
                container.removeEventListener('touchend', this, false);
            }
        };

        // initialize
        _init();

        // auto slide
        if (delay) {
            $slider.start();
            $slider.parent().on('mouseenter', function() {
                $slider.stop();
            }).on('mouseleave', function() {
                $slider.start();
            });
        }

        // bind touch event
        if (touch && $slider.options.touch) {
            if (!msGesture) {
                container.addEventListener('touchstart', bindTouchEvent, false);
            } else {
                // windows
            }
        }
    };
})(jQuery);
