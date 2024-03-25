define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster');

	var uk999 = {

		/*
		requests: {
			'google.geocode.address': {
				apiRoot: '//maps.googleapis.com/',
				url: 'maps/api/geocode/json?address={zipCode}&key=',
				verb: 'GET',
				generateError: false,
				removeHeaders: [
					'X-Kazoo-Cluster-ID',
					'X-Auth-Token',
					'Content-Type'
				]
			}
		},
		*/

		subscribe: {
			'numbersPlus.uk999.renderPopup': 'uk999Edit'
		},

		uk999Edit: function(args) {
			var self = this,
				argsCommon = {
					success: function(dataNumber) {
						self.uk999Render(dataNumber, args.accountId, args.callbacks);
					},
					number: args.phoneNumber
				};

			if (args.hasOwnProperty('accountId')) {
				argsCommon.accountId = args.accountId;
			}

			monster.pub('common.numbers.editFeatures', argsCommon);
		},


		uk999Render: function(dataNumber, pAccountId, callbacks) {

			var self = this,
				accountId = pAccountId || self.accountId,
				popupHtml = $(self.getTemplate({
					name: 'dialog',
					data: self.uk999Format(dataNumber.dimension.uk_999),
					submodule: 'uk999'
				})),
				popup;

				if (dataNumber.dimension.hasOwnProperty('uk_999')) {
					if (dataNumber.dimension.uk_999.address_type === 'business') {
						$('#forenameGroup', popupHtml).hide();
						$('#bussuffixGroup', popupHtml).show();
					}
	
					else if (dataNumber.dimension.uk_999.address_type === 'residential') {
						$('#forenameGroup', popupHtml).show();
						$('#bussuffixGroup', popupHtml).hide();
					}

				}

				else {
					$('#forenameGroup', popupHtml).hide();
					$('#bussuffixGroup', popupHtml).show();
				}

				$('#address_type', popupHtml).change(function() {
				
					var $this = $(this);
					
					if ($this.val() ===  'business') {
						$(addressForename).val(null);
						$(addressName).val(null);
						$('#forenameGroup', popupHtml).hide();
						$('#bussuffixGroup', popupHtml).show();
					}
	
					else if ($this.val() ===  'residential') {
						$(addressName).val(null);
						$(addressBussuffix).val(null);
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

			/*
			popupHtml.find('#addressPostcode').change(function() {
				console.log('find address');
				var zipCode = $(this).val();

				if (zipCode) {
					self.uk999GetAddressFromZipCode({

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
			*/

			popupHtml.find('.inline_field > input').keydown(function() {
				popup.find('.gmap_link_div').hide();
			});

			popupHtml.find('#submit_btn').on('click', function(ev) {

				ev.preventDefault();

				if (!monster.ui.valid(popupHtml)) {
					return;
				}

				var uk999FormData = self.uk999Normalize(monster.ui.getFormData('uk_999'));

				_.extend(dataNumber, { dimension: { uk_999: uk999FormData }});

				var callbackSuccess = function callbackSuccess(data) {
					var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
						template = self.getTemplate({
							name: '!' + self.i18n.active().uk999.successUK999,
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

				// patch opposed to post so existing data within data.dimension is not removed
				self.uk999PatchNumber(dataNumber.id, accountId, dataNumber, {	
					success: function(data) {

						if (data.data.dimension.hasOwnProperty('uk_999') && !data.data.features.includes('uk_999')) {
							features = data.data.features || [];
							features.push('uk_999');
						}

						callbackSuccess(data);

					}
				});
			});


			popupHtml.find('#remove_uk999_btn').on('click', function(e) {
				e.preventDefault();

				self.callApi({
					resource: 'numbers.list',
					data: {
						accountId: accountId
					},
					success: function(data, status) {
						
						delete dataNumber.dimension.uk_999;

						self.uk999UpdateNumber(dataNumber.id, accountId, dataNumber, {
							success: function(data) {
								var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
									template = self.getTemplate({
										name: '!' + self.i18n.active().uk999.successUK999,
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

		uk999Format: function(data) {
			return _.merge({}, data, {
				notification_contact_emails: _
					.chain(data)
					.get('notification_contact_emails', [])
					.join(' ')
					.value()
			});
		},

		uk999Normalize: function(data) {
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

		uk999UpdateNumber: function(phoneNumber, accountId, data, callbacks) {
			
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
					globalHandler(_data, { generateError: true });
				}
			});
		},

		uk999PatchNumber: function(phoneNumber, accountId, data, callbacks) {

			console.log('patch number');
			console.log(data);

			var self = this;

			// The back-end doesn't let us set features anymore, they return the field based on the key set on that document.
			delete data.features;

			self.callApi({
				resource: 'numbers.patch',
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
					globalHandler(_data, { generateError: true });
				}
			});
		},

		uk999GetAddressFromZipCode: function(args) {
			var self = this;

			monster.request({
				resource: 'google.geocode.address',
				data: args.data,
				success: function(data, status) {
					args.hasOwnProperty('success') && args.success(data.results);
				},
				error: function(errorPayload, data, globalHandler) {
					args.hasOwnProperty('error') ? args.error() : globalHandler(data, { generateError: true });
				}
			});
		}
	};

	return uk999;
});
