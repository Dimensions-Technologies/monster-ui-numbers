define(function(require) {
	var $ = require('jquery'),
		monster = require('monster'),
		miscSettings = {};

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
			'en-US': { customCss: false },
			'fr-FR': { customCss: false },
			'ru-RU': { customCss: false }
		},

		requests: {
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

				function() {

					// check whitelable doc for dimension configuration for app
					if (monster.config.whitelabel.hasOwnProperty('dimension')) {

						var data;
						data = monster.config.whitelabel;
						
						if (data.dimension.hasOwnProperty('dt_numbers')) {

							if (data.dimension.dt_numbers.hasOwnProperty('miscSettings')) {	

								data.dimension.dt_numbers.miscSettings.forEach(function(action) {
									miscSettings[action] = true;
								});

							}													

						}

						// log to console if enabled
						if (miscSettings.enableConsoleLogging) {
							console.log('miscSettings:', miscSettings);
						}

					}

				},
			
				monster.pub('dtNumbers.render', {
					container: numberManager,
					callbackAfterRender: function(numberControl) {
						parent
							.empty()
							.append(numberControl);
					},
					miscSettings
				})

			]);


		}
	};

	return app;
});

