define(function(require) {
	var $ = require('jquery'),
		monster = require('monster');

	var app = {
		name: 'dt-numbers',

		css: [ 'app' ],

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
			
			monster.pub('dtNumbers.render', {
				container: numberManager,
				callbackAfterRender: function(numberControl) {
					parent
						.empty()
						.append(numberControl);
				}
			});
		}
	};

	return app;
});

