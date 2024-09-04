define(function(require) {

	require('./uk999NtsFormatting');

	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster'),
		miscSettings = {};

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
			'dtNumbers.uk999.renderPopup': 'uk999Edit'
		},

		uk999Edit: function(args) {
			var self = this,
				argsCommon = {
					success: function(dataNumber) {
						self.uk999Render(dataNumber, args.accountId, args.callbacks);
					},
					number: args.phoneNumber
				};

			// set variables for use elsewhere
			miscSettings = args.miscSettings;

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

				monster.ui.tooltips(popupHtml);

				if (dataNumber.dimension.hasOwnProperty('uk_999')) {
					$('#addButton', popupHtml).hide();
				}
				
				else {
					$('#removeButton', popupHtml).hide();
					$('#updateButton', popupHtml).hide();
				}

				if (dataNumber.dimension.hasOwnProperty('uk_999')) {
					if (dataNumber.dimension.uk_999.address_type === 'business') {
						$('#forenameGroup', popupHtml).hide();
						$('#surnameGroup', popupHtml).hide();
						$('#businessNameGroup', popupHtml).show();
						$('#bussuffixGroup', popupHtml).show();
					}
	
					else if (dataNumber.dimension.uk_999.address_type === 'residential') {
						$('#forenameGroup', popupHtml).show();
						$('#surnameGroup', popupHtml).show();
						$('#businessNameGroup', popupHtml).hide();
						$('#bussuffixGroup', popupHtml).hide();
					}

				}

				else {
					$('#forenameGroup', popupHtml).hide();
					$('#surnameGroup', popupHtml).hide();
					$('#businessNameGroup', popupHtml).show();
					$('#bussuffixGroup', popupHtml).show();
				}

				$('#addressType', popupHtml).change(function() {
				
					var $this = $(this);
					
					if ($this.val() ===  'business') {
						$(addressForename).val(null);
						$(addressSurname).val(null);
						$(addressBusinessName).val(null);
						$('#forenameGroup', popupHtml).hide();
						$('#surnameGroup', popupHtml).hide();
						$('#businessNameGroup', popupHtml).show();
						$('#bussuffixGroup', popupHtml).show();
					}
	
					else if ($this.val() ===  'residential') {
						$(addressBusinessName).val(null);
						$(addressSurname).val(null);
						$(addressBussuffix).val(null);
						$('#forenameGroup', popupHtml).show();
						$('#surnameGroup', popupHtml).show();
						$('#businessNameGroup', popupHtml).hide();
						$('#bussuffixGroup', popupHtml).hide();
					}
					
				});

				$('#addressPostcode', popupHtml).change(function() {
				
					//var $this = $(this);

					var postcode = $(this).val();
					var postcodeRegex = /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9]?[A-Za-z])))) [0-9][A-Za-z]{2})$/;

					if (!postcodeRegex.test(postcode)) {

						monster.ui.alert('warning', self.i18n.active().uk999.invalidPostcode);
						
						$(addressPostcode).val(null);
					
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

				if ($(addressType).val() == 'business') {

					var businessName = $(addressBusinessName).val(),
						addressLine1 = $(addressPremises).val(),
						addressLine2 = $(addressThoroughfare).val(),
						locality = $(addressLocality).val(),
						postcode = $(addressPostcode).val();

					// check if all required fields have been populated
					var anyFieldIsNull = !businessName || !addressLine1 || !addressLine2 || !locality || !postcode;

					if (anyFieldIsNull) {
							
						monster.ui.alert('warning', self.i18n.active().uk999.addAddressErrorBusiness);

					}

					else {

						monster.ui.confirm(self.i18n.active().uk999.addAddress, function() { 

							uk999AddAddress('uk999_address_added');

						});

					}

				}

				else if ($(addressType).val() == 'residential') {

					var forename = $(addressForename).val(),
						surname = $(addressSurname).val(),
						addressLine1 = $(addressPremises).val(),
						addressLine2 = $(addressThoroughfare).val(),
						locality = $(addressLocality).val(),
						postcode = $(addressPostcode).val();

					// check if all required fields have been populated
					var anyFieldIsNull = !forename || !surname || !addressLine1 || !addressLine2 || !locality || !postcode;

					if (anyFieldIsNull) {
							
						monster.ui.alert('warning', self.i18n.active().uk999.addAddressErrorResidential);

					}

					else {

						monster.ui.confirm(self.i18n.active().uk999.addAddress, function() {

							uk999AddAddress('uk999_address_added');

						});

					}

				}

			});

			popupHtml.find('#update_btn').on('click', function(ev) {
				
				ev.preventDefault();
				
				monster.ui.confirm(self.i18n.active().uk999.updateAddress, function() { 
					
					if ($(addressType).val() == 'business') {
	
						var businessName = $(addressBusinessName).val(),
							addressLine1 = $(addressPremises).val(),
							addressLine2 = $(addressThoroughfare).val(),
							locality = $(addressLocality).val(),
							postcode = $(addressPostcode).val();
	
						// check if all required fields have been populated
						var anyFieldIsNull = !businessName || !addressLine1 || !addressLine2 || !locality || !postcode;
	
						if (anyFieldIsNull) {
								
							monster.ui.alert('warning', self.i18n.active().uk999.addAddressErrorBusiness);
	
						}
	
						else {
	
							uk999AddAddress('uk999_address_updated');
	
						}
	
					}
	
					else if ($(addressType).val() == 'residential') {
	
						var forename = $(addressForename).val(),
							surname = $(addressSurname).val(),
							addressLine1 = $(addressPremises).val(),
							addressLine2 = $(addressThoroughfare).val(),
							locality = $(addressLocality).val(),
							postcode = $(addressPostcode).val();
	
						// check if all required fields have been populated
						var anyFieldIsNull = !forename || !surname || !addressLine1 || !addressLine2 || !locality || !postcode;
	
						if (anyFieldIsNull) {
								
							monster.ui.alert('warning', self.i18n.active().uk999.addAddressErrorResidential);
	
						}
	
						else {
	
							uk999AddAddress('uk999_address_updated');
	
						}
	
					}
										
				});

			});
			
			function uk999AddAddress(addressAction) {

				if (!monster.ui.valid(popupHtml)) {
					return;
				}

				var uk999FormData,
					user = monster.apps.auth.currentUser;

				if ($(addressType).val() == 'business') {

					// perform find and replace using rules from findReplaceRules javascript file
					var formattedBusinessName = $(addressBusinessName).val();
						
					for (var find in findReplaceRules) {
						if (findReplaceRules.hasOwnProperty(find)) {
							var replace = findReplaceRules[find];
							formattedBusinessName = formattedBusinessName.replace(new RegExp('\\b' + find + '\\b', 'gi'), function(match) {
								// apply formatting to the replacement value
								return formatReplacement(replace);
							});
						}
					}
					
					function formatReplacement(replace) {
						// capitalize the replacement value
						return replace.charAt(0).toUpperCase() + replace.slice(1);
					}

					var uk999FormData = {
						address: { 
							forename: "",
							name: $(addressBusinessName).val(),
							bussuffix: $(addressBussuffix).val(),
							premises: $(addressPremises).val(),
							thoroughfare: $(addressThoroughfare).val(),
							locality: $(addressLocality).val(),
							postcode: $(addressPostcode).val()
						},
						address_formatted: { 
							forename: "",
							name: formattedBusinessName,
							bussuffix: $(addressBussuffix).val(),
							premises: $(addressPremises).val(),
							thoroughfare: $(addressThoroughfare).val(),
							locality: $(addressLocality).val(),
							postcode: $(addressPostcode).val()
						},
						address_type: "business",
						address_status: "",
						notification_contact_emails: $(notification_contact_emails).val(),
						created_by: {
							name: user.first_name + ' ' + user.last_name,
							email: user.email,
							date: new Date().toLocaleString()
						}			
					}

				}

				else if ($(addressType).val() == 'residential') {

					var uk999FormData = {
						address: {  
							forename: $(addressForename).val(),
							name: $(addressSurname).val(),
							bussuffix: "",
							premises: $(addressPremises).val(),
							thoroughfare: $(addressThoroughfare).val(),
							locality: $(addressLocality).val(),
							postcode: $(addressPostcode).val()
						},
						address_formatted: {
							forename: $(addressForename).val(),
							name: $(addressSurname).val(),
							bussuffix: "",
							premises: $(addressPremises).val(),
							thoroughfare: $(addressThoroughfare).val(),
							locality: $(addressLocality).val(),
							postcode: $(addressPostcode).val()
						},
						address_type: "residential",
						address_status: "",
						notification_contact_emails: $(notification_contact_emails).val(),
						created_by: {
							name: user.first_name + ' ' + user.last_name,
							email: user.email,
							date: new Date().toLocaleString()
						}	 
					}

				}

				var uk999NormalizedFormData = self.uk999Normalize(uk999FormData);

				_.extend(dataNumber, { dimension: { uk_999: uk999NormalizedFormData }});

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

						// webhook to external service
						if (miscSettings.enable999AddressAddedNotifications && addressAction == 'uk999_address_added' || miscSettings.enable999AddressUpdatedNotifications && addressAction == 'uk999_address_updated') {

							var resourceValue;

							if (addressAction == 'uk999_address_added') {
								resourceValue = 'notification.uk999.address.added'
							}
							if (addressAction == 'uk999_address_updated') {
								resourceValue = 'notification.uk999.address.updated'
							}

							var requestData = {
								account_id: self.accountId,
								action: addressAction,
								phone_number: dataNumber.id
							};
	
							if (miscSettings.includeAuthTokenWithinNotifications) {
								requestData.auth_token = monster.util.getAuthToken();
							}
	
							monster.request({
								resource: resourceValue,
								data: {
									data: requestData,
									removeMetadataAPI: true
								}
							});

						}

						monster.pub('dtNumbers.pushFeatures', data);
						callbackSuccess(data);

					}
				});

			};

			popupHtml.find('#remove_uk999_btn').on('click', function(e) {

				e.preventDefault();

				self.callApi({
					resource: 'account.get',
					data: {
						accountId: accountId
					},
					success: function(data) {

						if (data.data.hasOwnProperty('caller_id')) {
							if (data.data.caller_id.hasOwnProperty('emergency')) {
								// if number is set as account emergency caller id prevent removal of address
								if (dataNumber.id == data.data.caller_id.emergency.number) {
									monster.ui.alert('warning', self.i18n.active().uk999.removeAddressError);
								}
								else {
									uk999ConfirmRemoval();
								}
							}
							else {
								uk999ConfirmRemoval();
							}
						}
						else {
							uk999ConfirmRemoval();
						}

					}
				});

			});

			function uk999ConfirmRemoval() {

				monster.ui.confirm(self.i18n.active().uk999.removeAddress1 + '<br>' + self.i18n.active().uk999.removeAddress2, function() { 

					self.callApi({
						resource: 'numbers.list',
						data: {
							accountId: accountId
						},
						success: function(data, status) {
							
							delete dataNumber.dimension.uk_999;

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

							self.uk999UpdateNumber(dataNumber.id, accountId, dataNumber, {
								success: function(data) {

									// webhook to external service
									if (miscSettings.enable999AddressDeletedNotifications) {

										var requestData = {
											account_id: self.accountId,
											action: 'uk999_address_deleted',
											phone_number: dataNumber.id
										};
				
										if (miscSettings.includeAuthTokenWithinNotifications) {
											requestData.auth_token = monster.util.getAuthToken();
										}
				
										monster.request({
											resource: 'notification.uk999.address.deleted',
											data: {
												data: requestData,
												removeMetadataAPI: true
											}
										});

									}

									monster.pub('dtNumbers.pushFeatures', data);
									callbackSuccess(data);

								}

							});

						}
					});
				
				});		
				
			};

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

			// the back-end doesn't let us set features anymore, they return the field based on the key set on that document.
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
