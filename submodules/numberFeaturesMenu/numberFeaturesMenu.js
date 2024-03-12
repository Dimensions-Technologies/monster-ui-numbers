define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster');

	return {

		requests: {},

		subscribe: {
			'numbersPlus.numberFeaturesMenu.render': 'numberFeaturesMenuRender'
		},

		
		numberFeaturesMenuRender: function(args) {
			console.log('numbers features');
			
			var self = this,
				numberData = args.numberData,
				uk999Enabled = args.uk999Enabled,
				uk999EnabledNumber = args.uk999EnabledNumber,
				phoneNumber = numberData.hasOwnProperty('phoneNumber') ? numberData.phoneNumber : numberData.id;
				
				// if uk_999_enable is present and true push into features_avaialble
				if (uk999Enabled === true && !numberData.features_available.includes('uk_999')) {
					features = numberData.features_available || [];
					features.push('uk_999');
				}

				// if uk_999_enable is present and true push into features_avaialble
				if (uk999EnabledNumber === true && !numberData.features.includes('uk_999')) {
					features = numberData.features || [];
					features.push('uk_999');
				}
				
				template = $(self.getTemplate({
					name: 'dropdown',
					data: self.numberFeaturesMenuFormatData(numberData),
					submodule: 'numberFeaturesMenu'
				}));

			self.numberFeaturesMenuBindEvents(template, phoneNumber, args.afterUpdate);

			console.log('number detail');
			console.log(numberData);

			args.target.append(template);
		},
		
		numberFeaturesMenuFormatData: function(numberData) {
			var features = monster.util.getNumberFeatures(numberData),
				hasMessagingFeature = _.some(['sms', 'mms'], function(feature) {
					return _.includes(features, feature);
				});

			return {
				features: _.concat(features, hasMessagingFeature ? ['messaging'] : [])
			};
		},

		numberFeaturesMenuBindEvents: function(template, phoneNumber, afterUpdate) {
			var self = this,
				featureEvents = {
					'failover': 'common.failover.renderPopup',
					'cnam': 'common.callerId.renderPopup',
					'e911': 'common.e911.renderPopup',
					'uk999': 'numbersPlus.uk999.renderPopup',
					'prepend': 'numbersPlus.numberPrepend.renderPopup',
					'rename-carrier': 'common.numberRenameCarrier.renderPopup',
					'messaging': 'common.numberMessaging.renderPopup'
				},
				args = {
					phoneNumber: phoneNumber,
					callbacks: {
						success: function(data) {
							afterUpdate && afterUpdate(data.data.features, template);

							console.log(data.data.features);
							console.log(template);

							console.log('! log point !');
						}
					}
				};

			_.forEach(featureEvents, function(event, feature) {
				template.find('.' + feature + '-number').on('click', function() {
					//console.log('on click');
					// We add this at the moment of the event because in some cases, we bind the events before it's adding to a parent,
					// which means the account-section might not be loaded yet if we bound it before the event happened.
					if ($(this).parents('.account-section').length) {
						args.accountId = template.parents('.account-section').data('id');
					}

					monster.pub(event, args);
				});
			});

			template.find('.sync-number').on('click', function() {
				var accountId = $(this).parents('.account-section').length
					? template.parents('.account-section').data('id')
					: self.accountId;

				self.numbersSyncOne(phoneNumber, accountId, function() {
					monster.ui.toast({
						type: 'success',
						message: self.getTemplate({
							name: '!' + self.i18n.active().numberFeaturesMenu.syncSuccess,
							data: {
								number: monster.util.formatPhoneNumber(phoneNumber)
							}
						})
					});
				});
			});
		},

		numbersSyncOne: function(number, accountId, callback) {
			var self = this;

			self.callApi({
				resource: 'numbers.syncOne',
				data: {
					accountId: accountId,
					number: number
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		}
	};
});
