angular.module('segmentio', ['ng'])
    .factory('segmentio', ['$rootScope', '$window', '$location', '$log',
        function($rootScope, $window, $location, $log) {
            var service = {};

            // Create a temp queue for events fired before analytics loaded
            // but do not attempt to create 'analytics' object.
            var tempQueue = [];


            function flushTempQueue () {
                if (tempQueue.length) {
                    // Send the queue of pending events
                    $window.analytics.push.apply($window.analytics, tempQueue)
                    tempQueue.length = 0
                }
            }

            //  Analytics script is loaded callback.
            var analyticsLoaded = function() {
                flushTempQueue()
            }

            // Define a factory that generates wrapper methods to push arrays of
            // arguments onto our `analytics` queue, where the first element of the arrays
            // is always the name of the analytics.js method itself (eg. `track`).
            var methodFactory = function(type) {
                return function() {
                    var args = Array.prototype.slice.call(arguments, 0);
                    $log.debug('Call segmentio API with', type, args);

                    //Because we didn't overwrite the analytics object we can use
                    //its presence as a flag that segment.io has loaded.
                    if ($window.analytics) {
                        $log.debug('Segmentio API initialized, calling API');
                        $window.analytics[type].apply($window.analytics, args);
                    } else {
                        $log.debug('Segmentio API not yet initialized, queueing call');
                        tempQueue.push([type].concat(args));
                    }
                };
            };

            // Loop through analytics.js' methods and generate a wrapper method for each.
            var methods = ['identify', 'track', 'trackLink', 'trackForm', 'trackClick',
                'trackSubmit', 'page', 'pageview', 'ab', 'alias', 'ready', 'group'
            ];
            for (var i = 0; i < methods.length; i++) {
                service[methods[i]] = methodFactory(methods[i]);
            }

            // Listening to $viewContentLoaded event to track pageview
            $rootScope.$on('$viewContentLoaded', function() {
                if (service.location != $location.path()) {
                    service.location = $location.path();
                    service.pageview(service.location);
                }
            });

            /**
             * @description
             * Load Segment.io analytics script
             * @param apiKey The key API to use
             */
            service.load = function(apiKey) {
                // Create an async script element for analytics.js.
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = true;
                script.src = ('https:' === document.location.protocol ? 'https://' : 'http://') +
                    'd2dq2ahtl5zl1z.cloudfront.net/analytics.js/v1/' + apiKey + '/analytics.js';
                script.onload = analyticsLoaded

                // Find the first script element on the page and insert our script next to it.
                var firstScript = document.getElementsByTagName('script')[0];
                firstScript.parentNode.insertBefore(script, firstScript);
            };

            return service;
        }
    ]);
