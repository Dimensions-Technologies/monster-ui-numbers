define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster'),
		miscSettings = {};

	var numberPrepend = {
		requests: {
		},

		subscribe: {
			'dtNumbers.numberPrepend.renderPopup': 'numberPrependEdit'
		},
		numberPrependEdit: function(args) {
			var self = this,
				argsCommon = {
					success: function(dataNumber) {
						self.numberPrependRender(dataNumber, args.accountId, args.callbacks);
					},
					number: args.phoneNumber
				};

			// set variables for use elsewhere
			miscSettings = args.miscSettings;

			if (args.hasOwnProperty('accountId')) {
				argsCommon.accountId = args.accountId;
			}

			monster.pub('dtNumbers.editFeatures', argsCommon);
		},

		numberPrependRender: function(dataNumber, pAccountId, callbacks) {

			var self = this,
				accountId = pAccountId || self.accountId,
				popup_html = $(self.getTemplate({
					name: 'layout',
					data: dataNumber.prepend || {},
					submodule: 'numberPrepend'
				})),
				popup;

			popup_html.find('.save').on('click', function(ev) {

				ev.preventDefault();
				var prependFormData = monster.ui.getFormData('number_prepend');
				prependFormData.enabled = (prependFormData.name && prependFormData.name.length > 0) ? true : false;

				$.extend(true, dataNumber, { prepend: prependFormData });

				self.numberPrependUpdateNumber(dataNumber.id, accountId, dataNumber,
					function(data) {
						var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
							template = self.getTemplate({
								name: '!' + self.i18n.active().numberPrepend.successUpdate,
								data: {
									phoneNumber: phoneNumber
								},
								submodule: 'numberPrepend'
							});

						monster.pub('dtNumbers.pushFeatures', data);

						if (miscSettings.enableBottomToast) {
							monster.ui.toast({
								type: 'success',
								message: template,
								options: {
									positionClass: 'toast-bottom-right',
									timeOut: 3000,
									extendedTimeOut: 1000,
								}
							});
						} else {
							monster.ui.toast({
								type: 'success',
								message: template
							});
						};

						popup.dialog('close');

						callbacks.success && callbacks.success(data);
					},
					function(data) {
						callbacks.error && callbacks.error(data);
					}
				);
			});

			popup_html.find('.cancel-link').on('click', function(e) {
				e.preventDefault();
				popup.dialog('close');
			});

			popup = monster.ui.dialog(popup_html, {
				title: self.i18n.active().numberPrepend.dialogTitle
			});
		},

		numberPrependUpdateNumber: function(phoneNumber, accountId, data, success, error) {
			var self = this;

			// The back-end doesn't let us set features anymore, they return the field based on the key set on that document.
			delete data.features;

			self.callApi({
				resource: 'numbers.update',
				data: {
					accountId: accountId,
					phoneNumber: phoneNumber,
					data: data
				},
				success: function(_data, status) {
					success && success(_data);
				},
				error: function(_data, status) {
					error && error(_data);
				}
			});
		}
	};

	return numberPrepend;
});