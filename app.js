define(function(require) {
	var $ = require('jquery'),
		monster = require('monster'),
		miscSettings = {},
		defaultCountryCode = null,
		numberStateToggleCarriers = {},
		allowedCarriers = {},
		notificationSettings = {};

	var app = {
		name: 'dt-numbers',

		css: [ 'app', 'numbers' ],

		subModules: [
			'numbers',
			'numberFeaturesMenu',
			'numberPrepend',
			'uk999'
		],

		i18n: {
			'en-US': { customCss: false }
		},

		requests: {
			'notification.number.added': {
				apiRoot: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.numberAdded?.apiRoot,
				url: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.numberAdded?.url,
                verb: 'POST',
                generateError: false,
                removeHeaders: [
                    'X-Kazoo-Cluster-ID',
                    'X-Auth-Token'
                ]
            },
			'notification.number.deleted': {
				apiRoot: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.numberDeleted?.apiRoot,
				url: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.numberDeleted?.url,
                verb: 'POST',
                generateError: false,
                removeHeaders: [
                    'X-Kazoo-Cluster-ID',
                    'X-Auth-Token'
                ]
            },
			'notification.number.enabled': {
				apiRoot: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.numberEnabled?.apiRoot,
				url: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.numberEnabled?.url,
                verb: 'POST',
                generateError: false,
                removeHeaders: [
                    'X-Kazoo-Cluster-ID',
                    'X-Auth-Token'
                ]
            },
			'notification.number.disabled': {
				apiRoot: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.numberDisabled?.apiRoot,
				url: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.numberDisabled?.url,
                verb: 'POST',
                generateError: false,
                removeHeaders: [
                    'X-Kazoo-Cluster-ID',
                    'X-Auth-Token'
                ]
            },
			'notification.uk999.address.added': {
				apiRoot: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.uk999AddressAdded?.apiRoot,
				url: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.uk999AddressAdded?.url,
                verb: 'POST',
                generateError: false,
                removeHeaders: [
                    'X-Kazoo-Cluster-ID',
                    'X-Auth-Token'
                ]
            },
			'notification.uk999.address.updated': {
				apiRoot: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.uk999AddressUpdated?.apiRoot,
				url: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.uk999AddressUpdated?.url,
                verb: 'POST',
                generateError: false,
                removeHeaders: [
                    'X-Kazoo-Cluster-ID',
                    'X-Auth-Token'
                ]
            },
			'notification.uk999.address.deleted': {
				apiRoot: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.uk999AddressDeleted?.apiRoot,
				url: monster.config.whitelabel.dimension?.dt_numbers?.notificationSettings?.uk999AddressDeleted?.url,
                verb: 'POST',
                generateError: false,
                removeHeaders: [
                    'X-Kazoo-Cluster-ID',
                    'X-Auth-Token'
                ]
            }
		},

		subscribe: {
		},

		load: function(callback) {

			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		initApp: function(callback) {

			var self = this;

			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});
		},

		render: function(parent) {

			var self = this,
				parent = parent || $('#monster_content');

			var numberManager = $(self.getTemplate({
				name: 'app'
			}));

			monster.waterfall([

				function(callback) {

					// check whitelable doc for dimension configuration for app
					if (monster.config.whitelabel.hasOwnProperty('dimension')) {

						var data;
						data = monster.config.whitelabel;
						
						if (data.dimension.hasOwnProperty('dt_numbers')) {

							if (data.dimension.dt_numbers.hasOwnProperty('miscSettings')) {
								miscSettings = data.dimension.dt_numbers.miscSettings;
							}

							if (data.dimension.dt_numbers.hasOwnProperty('defaultCountryCode')) {	
								defaultCountryCode = data.dimension.dt_numbers.defaultCountryCode
							}

							if (data.dimension.dt_numbers.hasOwnProperty('numberStateToggleCarriers')) {	
								numberStateToggleCarriers = data.dimension.dt_numbers.numberStateToggleCarriers;
							}

							if (data.dimension.dt_numbers.hasOwnProperty('allowedCarriers')) {	
								allowedCarriers = Object.keys(data.dimension.dt_numbers.allowedCarriers).filter(carrier => data.dimension.dt_numbers.allowedCarriers[carrier]);
							}

							if (data.dimension.dt_numbers.hasOwnProperty('notificationSettings')) {	
								notificationSettings = data.dimension.dt_numbers.notificationSettings;
							}

						}

						// log to console if enabled
						if (miscSettings.enableConsoleLogging) {
							console.log('miscSettings:', miscSettings);
							console.log('defaultCountryCode', defaultCountryCode);
							console.log('numberStateToggleCarriers', numberStateToggleCarriers);
							console.log('allowedCarriers', allowedCarriers);
							console.log('notificationSettings', notificationSettings);
						}

						callback()

					} else {
						callback()
					}

				},

				function() {

					monster.pub('dtNumbers.render', {
						container: numberManager,
						callbackAfterRender: function(numberControl) {
							parent
								.empty()
								.append(numberControl);
						},
						miscSettings,
						defaultCountryCode,
						numberStateToggleCarriers,
						allowedCarriers,
						notificationSettings
					})

				}

			]);


		}
	};

	return app;
});