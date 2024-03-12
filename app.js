define(function(require) {
	var $ = require('jquery'),
		monster = require('monster');

	var app = {
		name: 'numbers-plus',

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

			console.log('load');

			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		initApp: function(callback) {

			console.log('initApp');

			var self = this;

			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});
		},

		render: function(parent) {

			console.log('render');

			var self = this,
				parent = parent || $('#monster_content');

			var numberManager = $(self.getTemplate({
				name: 'app'
			}));
			
			monster.pub('numbersPlus.render', {
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

