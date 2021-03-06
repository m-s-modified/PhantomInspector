/*jslint node: true, nomen: true, unparam: true*/
/*global phantom*/

(function () {
    'use strict';

    var system     = require('system'),
        configFile = system.args[1] || './config',
        config     = require(configFile).setting,
        _          = require('underscore'),
        // util       = require('util'),
        webpage    = require('webpage'),
        async      = require('async'),
        asyncStack = [],
        timeout    = 1000,
        userAgents;

    userAgents = {
        'iPhone': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) '
            + 'AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25'
    };

    _(config).each(function (setting, key, config) {

        function process(callback) {

            var page     = webpage.create(),
                networks = [];

            if (setting.userAgent) {
                page.settings.userAgent  = userAgents[setting.userAgent] || setting.userAgent;
            }
            if (setting.viewportSize) {
                page.viewportSize  = setting.viewportSize;
            }
            if (setting.paperSize) {
                page.paperSize  = setting.paperSize;
            }
            if (setting.userName) {
                page.settings.userName  = setting.userName;
            }
            if (setting.password) {
                page.settings.password  = setting.password;
            }

            function onOpen() {
                if (setting.onOpen) {
                    if (_.isFunction(setting.onOpen)) {
                        setting.onOpen(page, networks, setting);
                    } else {
                        _(setting.onOpen).each(function (value, i) {
                            value(page, networks, setting);
                        });
                    }
                }
            }

            function pageTimeout() {

                if (setting.timeout) {
                    if (_.isFunction(setting.timeout)) {
                        setting.timeout(page, networks, setting);
                    } else {
                        _(setting.timeout).each(function (value, i) {
                            value(page, networks, setting);
                        });
                    }
                }


                if (setting.capture) {
                    page.render(setting.capture);
                }
            }

            function resourceReceived(response) {

                if (response.stage === 'end') { return; }

                networks.push(response);
            }

            function pageOpen(status) {

                if (status !== 'success') {
                    console.log('FAIL to load the address');
                    console.log(setting.url);
                    console.log('STATUS: ' + status);

                    page.close();
                    callback();

                    return;
                }

                onOpen();

                setTimeout(function () {
                    pageTimeout();
                    page.close();
                    callback();
                }, timeout);
            }

            // page.onResourceRequested = function (request) {};
            page.onResourceReceived = resourceReceived;
            page.open(setting.url, pageOpen);
        }

        asyncStack.push(process);
    });

    asyncStack.push(function (callback) {
        phantom.exit();
        callback();
    });

    async.series(asyncStack);
}());