define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster');

	var uk999 = {

		requests: {
			'google.geocode.address': {
				apiRoot: '//maps.googleapis.com/',
				url: 'maps/api/geocode/json?address={zipCode}&key=AIzaSyC5PcCSqoS-9RGDg8zI6r811Pw1adGLJ_I',
				verb: 'GET',
				generateError: false,
				removeHeaders: [
					'X-Kazoo-Cluster-ID',
					'X-Auth-Token',
					'Content-Type'
				]
			}
		},

		subscribe: {
			'numbersPlus.uk999.renderPopup': 'e911Edit'
		},

		e911Edit: function(args) {
			console.log('uk999 pop up');
			var self = this,
				argsCommon = {
					success: function(dataNumber) {
						self.e911Render(dataNumber, args.accountId, args.callbacks);
					},
					number: args.phoneNumber
				};

			if (args.hasOwnProperty('accountId')) {
				argsCommon.accountId = args.accountId;
			}

			monster.pub('common.numbers.editFeatures', argsCommon);
		},


		e911Render: function(dataNumber, pAccountId, callbacks) {
			var self = this,
				accountId = pAccountId || self.accountId,
				popupHtml = $(self.getTemplate({
					name: 'dialog',
					data: self.e911Format(dataNumber.uk_999),
					submodule: 'uk999'
				})),
				popup;

				console.log('form loaded');
				console.log(self.e911Format(dataNumber.uk_999));

				console.log('data.data');
				console.log(dataNumber);

				if (dataNumber.hasOwnProperty('uk_999')) {
					console.log('found uk_999 data');
					if (dataNumber.uk_999.address_type === 'business') {
						console.log('business');
						$('#forenameGroup', popupHtml).hide();
						$('#bussuffixGroup', popupHtml).show();
					}
	
					else if (dataNumber.uk_999.address_type === 'residential') {
						console.log('residential');
						$('#forenameGroup', popupHtml).show();
						$('#bussuffixGroup', popupHtml).hide();
					}

				}

				else {
					console.log('no uk_999 data');
					$('#forenameGroup', popupHtml).hide();
					$('#bussuffixGroup', popupHtml).show();
				}

				console.log('after if');

				$('#address_type', popupHtml).change(function() {
				
					var $this = $(this);
					console.log($this);

					console.log('address type changed');
					
					if ($this.val() ===  'business') {
						console.log('business');
						$('#forenameGroup', popupHtml).hide();
						$('#bussuffixGroup', popupHtml).show();
					}
	
					else if ($this.val() ===  'residential') {
						console.log('residential');
						$('#forenameGroup', popupHtml).show();
						$('#bussuffixGroup', popupHtml).hide();
					}
					
				});
				

			monster.ui.validate(popupHtml, {
				rules: {
					notification_contact_emails: {
						listOf: 'email'
					}
				}
			});


			popupHtml.find('#addressPostcode').change(function() {
				console.log('find address');
				var zipCode = $(this).val();

				if (zipCode) {
					self.e911GetAddressFromZipCode({

						data: {
							zipCode: zipCode
						},
						success: function(results) {
							console.log('address found');
							if (!_.isEmpty(results)) {
								var length = results[0].address_components.length;

								//popupHtml.find('#locality').val(results[0].address_components[1].long_name);
								// Last component is country, before last is state, before can be county if exists or city if no county, so we had to change from 3 to length-2.
								//popupHtml.find('#region').val(results[0].address_components[length - 2].short_name);

								popupHtml.find('#addressThoroughfare').val(results[0].address_components[1].long_name);
								popupHtml.find('#addressLocality').val(results[0].address_components[length - 4].long_name + ', ' + results[0].address_components[length - 3].long_name);

							}
						},
						error: function(error) {
							console.error('Error getting address:', error);
						}

					});
				}
			});

			popupHtml.find('.inline_field > input').keydown(function() {
				popup.find('.gmap_link_div').hide();
			});

			/*
			popupHtml.find('#submit_btn').on('click', function(ev) {
				ev.preventDefault();

				if (!monster.ui.valid(popupHtml)) {
					return;
				}

				var e911FormData = self.e911Normalize(monster.ui.getFormData('e911'));

				_.extend(dataNumber, { e911: e911FormData });

				var callbackSuccess = function callbackSuccess(data) {
					cosnole.log('callbackSuccess');
					var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
						template = self.getTemplate({
							name: '!' + self.i18n.active().e911.successE911,
							data: {
								phoneNumber: phoneNumber
							},
							submodule: 'uk999'
						});

					monster.ui.toast({
						type: 'success',
						message: template
					});

					popup.dialog('close');

					callbacks.success && callbacks.success(data);
				};

				self.e911UpdateNumber(dataNumber.id, accountId, dataNumber, {
					success: function(data) {
						callbackSuccess(data);
					},
					multipleChoices: function(addresses) {
						cosnole.log('e911UpdateNumber');
						var templatePopupAddresses = $(self.getTemplate({
								name: 'addressesDialog',
								data: addresses,
								submodule: 'uk999'
							})),
							popupAddress;

						templatePopupAddresses.find('.address-option').on('click', function() {
							templatePopupAddresses.find('.address-option.active').removeClass('active');
							$(this).addClass('active');
							templatePopupAddresses.find('.save-address').removeClass('disabled');
						});

						templatePopupAddresses.find('.cancel-link').on('click', function() {
							popupAddress.dialog('close');
						});

						templatePopupAddresses.find('.save-address').on('click', function() {
							console.log('.save-address');
							if (templatePopupAddresses.find('.address-option').hasClass('active')) {
								var index = templatePopupAddresses.find('.address-option.active').data('id'),
									dataAddress = addresses.details[index];

								_.extend(dataNumber, { e911: dataAddress });

								self.e911UpdateNumber(dataNumber.id, accountId, dataNumber, {
									success: function(data) {
										popupAddress.dialog('close');

										callbackSuccess(data);
									}
								});
							}
						});

						popupAddress = monster.ui.dialog(templatePopupAddresses, {
							title: self.i18n.active().uk999.chooseAddressPopup.title
						});
					},
					invalidAddress: function(data) {
						monster.ui.alert('error', self.i18n.active().e911.invalidAddress);
					}
				});s
			});
			*/


			popupHtml.find('#submit_btn').on('click', function(ev) {

				console.log('button pressed');

				ev.preventDefault();

				if (!monster.ui.valid(popupHtml)) {
					return;
				}

				var uk999FormData = self.e911Normalize(monster.ui.getFormData('uk_999'));

				console.log(uk999FormData);

				_.extend(dataNumber, { uk_999: uk999FormData });

				console.log('log point');

				var callbackSuccess = function callbackSuccess(data) {
					console.log('callbackSuccess');
					var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
						template = self.getTemplate({
							name: '!' + self.i18n.active().e911.successE911,
							data: {
								phoneNumber: phoneNumber
							},
							submodule: 'uk999'
						});

					monster.ui.toast({
						type: 'success',
						message: template
					});

					popup.dialog('close');

					callbacks.success && callbacks.success(data);
				};

				console.log('log point 2');

				self.e911UpdateNumber(dataNumber.id, accountId, dataNumber, {
					success: function(data) {
						console.log('log point 3');
						console.log(data);
						callbackSuccess(data);
						console.log('log point 4');
					},
					multipleChoices: function(addresses) {
						cosnole.log('e911UpdateNumber');
						var templatePopupAddresses = $(self.getTemplate({
								name: 'addressesDialog',
								data: addresses,
								submodule: 'uk999'
							})),
							popupAddress;

						templatePopupAddresses.find('.address-option').on('click', function() {
							templatePopupAddresses.find('.address-option.active').removeClass('active');
							$(this).addClass('active');
							templatePopupAddresses.find('.save-address').removeClass('disabled');
						});

						templatePopupAddresses.find('.cancel-link').on('click', function() {
							popupAddress.dialog('close');
						});

						templatePopupAddresses.find('.save-address').on('click', function() {
							console.log('.save-address');
							if (templatePopupAddresses.find('.address-option').hasClass('active')) {
								var index = templatePopupAddresses.find('.address-option.active').data('id'),
									dataAddress = addresses.details[index];

								_.extend(dataNumber, { e911: dataAddress });

								self.e911UpdateNumber(dataNumber.id, accountId, dataNumber, {
									success: function(data) {
										popupAddress.dialog('close');

										callbackSuccess(data);
									}
								});
							}
						});

						popupAddress = monster.ui.dialog(templatePopupAddresses, {
							title: self.i18n.active().uk999.chooseAddressPopup.title
						});
					},
					invalidAddress: function(data) {
						monster.ui.alert('error', self.i18n.active().e911.invalidAddress);
					}
				});
			});

			popupHtml.find('#remove_e911_btn').on('click', function(e) {
				e.preventDefault();

				self.callApi({
					resource: 'numbers.list',
					data: {
						accountId: accountId
					},
					success: function(data, status) {
						var e911Count = _.countBy(data.data.numbers, function(number) {
							return (number.hasOwnProperty('features') && number.features.indexOf('uk_999') >= 0);
						}).true;

						if (e911Count > 1) {
							delete dataNumber.uk_999;

							self.e911UpdateNumber(dataNumber.id, accountId, dataNumber, {
								success: function(data) {
									var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
										template = self.getTemplate({
											name: '!' + self.i18n.active().e911.successE911,
											data: {
												phoneNumber: phoneNumber
											},
											submodule: 'uk999'
										});

									monster.ui.toast({
										type: 'success',
										message: template
									});

									popup.dialog('close');

									callbacks.success && callbacks.success(data);
								}
							});
						} else {
							monster.ui.alert(self.i18n.active().e911.lastE911Error);
						}
					}
				});
			});

			popupHtml.find('.cancel-link').on('click', function(event) {
				event.preventDefault();

				popup.dialog('close');
			});

			popup = monster.ui.dialog(popupHtml, {
				title: self.i18n.active().uk999.dialogTitle
			});

			// Fixing the position of the rotated text using its width
			var rotatedText = popup.find('#e911_rotated_text'),
				rotatedTextOffset = rotatedText.width() / 2;

			rotatedText.css({
				top: 40 + rotatedTextOffset + 'px',
				left: 25 - rotatedTextOffset + 'px'
			});
		},

		e911Format: function(data) {
			return _.merge({}, data, {
				notification_contact_emails: _
					.chain(data)
					.get('notification_contact_emails', [])
					.join(' ')
					.value()
			});
		},

		e911Normalize: function(data) {
			return _.merge({}, data, {
				notification_contact_emails: _
					.chain(data)
					.get('notification_contact_emails', '')
					.trim()
					.toLower()
					.split(' ')
					.reject(_.isEmpty)
					.uniq()
					.value()
			});
		},

		e911UpdateNumber: function(phoneNumber, accountId, data, callbacks) {
			var self = this;

			// The back-end doesn't let us set features anymore, they return the field based on the key set on that document.
			delete data.features;

			self.callApi({
				resource: 'numbers.update',
				data: {
					accountId: accountId,
					phoneNumber: phoneNumber,
					data: data,
					generateError: false
				},
				success: function(_data, status) {
					callbacks.success && callbacks.success(_data);
				},
				error: function(_data, status, globalHandler) {
					if (_data.error === '400') {
						if (data.message === 'multiple_choice') {
							callbacks.multipleChoices && callbacks.multipleChoices(_data.data.multiple_choice.e911);
						} else {
							callbacks.invalidAddress && callbacks.invalidAddress();
						}
					} else {
						globalHandler(_data, { generateError: true });
					}
				}
			});
		},

		e911GetAddressFromZipCode: function(args) {
			var self = this;

			monster.request({
				resource: 'google.geocode.address',
				data: args.data,
				success: function(data, status) {
					console.log('address success');
					args.hasOwnProperty('success') && args.success(data.results);
				},
				error: function(errorPayload, data, globalHandler) {
					console.log('address error');
					args.hasOwnProperty('error') ? args.error() : globalHandler(data, { generateError: true });
				}
			});
		}
	};

	return uk999;
});
