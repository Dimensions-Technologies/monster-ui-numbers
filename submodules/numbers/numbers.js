define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		async = require('async'),
		monster = require('monster'),
		uk999Enabled = false,
		uk999EnabledNumbers,
		carrierDisabledNumbers,
		allowedCarriers = [],
		miscSettings = {},
		defaultCountryCode = null,
		numberStateToggleCarriers = {},
		notificationSettings = {};

	var dtNumbers = {

		requests: {
		},

		
		subscribe: {
			'dtNumbers.dialogSpare': 'numbersDialogSpare',
			'dtNumbers.render': 'numbersRender',
			'dtNumbers.refresh': 'numbersRefresh',
			'dtNumbers.numbersFeaturesMenu': 'numbersDisplayFeaturesMenu',
			'dtNumbers.getListFeatures': 'numbersGetFeatures',
			'dtNumbers.editFeatures': 'numbersEditFeatures',
			'dtNumbers.getCarriersModules': 'numbersGetCarriersModules',
			'dtNumbers.numberDetails.renderPopup': 'numberGetDetails',
			'dtNumbers.pushFeatures': 'pushFeatures'
		},
		
		/* Arguments:
		** container: jQuery Div
		** callbackAfterRender: callback executed once we rendered the number control
		** viewType: default to 'pbx', can be set to 'pbx', basically changes the view from Number Manager to SmartPBX the if set to 'pbx'
		*/

		numbersDisplayFeaturesMenu: function(arrayNumbers, parent, callback) {

			var self = this;

			_.each(arrayNumbers, function(number) {

				var uk999EnabledNumber = false, 
					carrierEnabledNumber = true;

				if (number.state === 'port_in' || number.used_by === 'mobile') {
					return;
				}

				if (uk999EnabledNumbers.data.numbers.hasOwnProperty(number.phoneNumber)) {
					// The phoneNumber exists in uk999EnabledNumbers.data.numbers
					uk999EnabledNumber = true;
				} else {
					// The phoneNumber does not exist in uk999EnabledNumbers.data.numbers
					uk999EnabledNumber = false;
				}

				if (carrierDisabledNumbers.data.numbers.hasOwnProperty(number.phoneNumber)) {
					// The phoneNumber exists in uk999EnabledNumbers.data.numbers
					carrierEnabledNumber = false;
				}
				
				var numberDiv = parent.find('[data-phonenumber="' + number.phoneNumber + '"]'),
					args = {
						target: numberDiv.find('.number-options'),
						numberData: number,
						uk999Enabled: uk999Enabled,
						uk999EnabledNumber: uk999EnabledNumber,
						carrierEnabledNumber: carrierEnabledNumber,
						afterUpdate: function(features) {
							//monster.ui.highlight(numberDiv);
							//monster.ui.paintNumberFeaturesIcon(features, numberDiv.find('.features'));
							self.paintNumberFeaturesIcon(features, numberDiv.find('.features'));
						},
						miscSettings: miscSettings
					};
					
				monster.pub('dtNumbers.numberFeaturesMenu.render', args);
			});

			callback && callback();

		},

		numbersRender: function(pArgs) {

			var self = this,
				args = pArgs || {},
				container = args.container || $('#monster_content'),
				callbackAfterRender = args.callbackAfterRender,
				viewType = args.viewType || 'manager'

			// set variables for use elsewhere
			miscSettings = args.miscSettings;
			defaultCountryCode = args.defaultCountryCode;
			numberStateToggleCarriers = args.numberStateToggleCarriers;
			allowedCarriers = args.allowedCarriers;
			notificationSettings = args.notificationSettings;

			monster.waterfall([

				function(callback) {
					// check if 'uk_999_enabled' exists and is true on account doc
					self.callApi({
						resource: 'account.get',
						data: {
							accountId: self.accountId
						},
						success: function(data) {
							if (data.data.hasOwnProperty('dimension')) {
								uk999Enabled = (data.data.dimension.hasOwnProperty('uk_999_enabled') && data.data.dimension.uk_999_enabled == true) ? true : false;
								callback(null);
							} else {
								uk999Enabled = false;
								callback(null);
							}
						}
					});
				},

				function(callback) {
					// get numbers which have uk_999 data on number document
					self.callApi({
						resource: 'numbers.get',
						data: {
							accountId: self.accountId,
							phoneNumber: '',
							filters: {
								"has_key": "dimension.uk_999",
								"paginate": "false"
							}
						},
						success: function(data) {
							uk999EnabledNumbers = data;
							callback(null);
						}
					});
				},

				function(callback) {
					// get numbers disabled numbers
					self.callApi({
						resource: 'numbers.get',
						data: {
							accountId: self.accountId,
							phoneNumber: '',
							filters: {
								"filter_dimension.number_state": "disabled",
								"paginate": "false"
							}
							
						},
						success: function(data) {
							carrierDisabledNumbers = data;
							callback(null);
						}
					});
				},

				function() {
					self.numbersGetData(viewType, function(data) {
						data.viewType = viewType;
						data = self.numbersFormatData(data);

						var numbersView = $(self.getTemplate({
								name: 'layout',
								data: {
									...data,
									miscSettings: miscSettings
								},
								submodule: 'numbers'
							})),
							usedView = $(self.getTemplate({
								name: 'used',
								data: data,
								submodule: 'numbers'
							})),
							arrayNumbers = data.listAccounts.length ? data.listAccounts[0].usedNumbers : [];
					
						//self.numbersDisplayFeaturesMenu(arrayNumbers, usedView, () => {
						
						// number features menu on used numbers
						self.numbersDisplayFeaturesMenu(arrayNumbers, usedView);

						// used numbers 
						numbersView.find('.list-numbers[data-type="used"]').append(usedView);

						self.numbersGetFeatures();

						self.numbersRenderSpare({
							parent: numbersView,
							dataNumbers: {
								...data,
								miscSettings: miscSettings
							}
						});
						
						// call again to render uk_999 in ui
						self.numbersRenderSpare({
							parent: numbersView,
							dataNumbers: {
								...data,
								miscSettings: miscSettings
							}
						});
						
						// call new render function to draw features
						self.numbersRenderUsed({
							parent: numbersView,
							dataNumbers: {
								...data,
								miscSettings: miscSettings
							}
						});

						self.numbersRenderExternal({
							parent: numbersView,
							dataNumbers: {
								...data,
								miscSettings: miscSettings
							}
						});

						self.numbersBindEvents(numbersView, data);

						container
							.empty()
							.append(numbersView);

						setTimeout(function() {
							var viewType = container.find('.half-box.selected').data('type');

							container.find('.list-numbers[data-type="' + viewType + '"] .search-custom input').focus();
						});

						callbackAfterRender && callbackAfterRender(container);
			
					});
				}
			]);
		},

		numbersRefresh: function(pArgs) {

			var self = this,
				args = pArgs || {},
				container = args.container || $('#monster_content'),
				callbackAfterRender = args.callbackAfterRender,
				viewType = args.viewType || 'manager'
			
			self.numbersGetData(viewType, function(data) {
				data.viewType = viewType;
				data = self.numbersFormatData(data);
								
				var numbersView = $(self.getTemplate({
						name: 'layout',
						data: {
							...data,
							miscSettings: miscSettings
						},
						submodule: 'numbers'
					})),
					usedView = $(self.getTemplate({
						name: 'used',
						data: data,
						submodule: 'numbers'
					})),

					arrayNumbers = data.listAccounts.length ? data.listAccounts[0].usedNumbers : [];

				//self.numbersDisplayFeaturesMenu(arrayNumbers, usedView, () => {
				
				// number features menu on used numbers
				self.numbersDisplayFeaturesMenu(arrayNumbers, usedView);

				// used numbers 
				numbersView.find('.list-numbers[data-type="used"]').append(usedView);

				self.numbersGetFeatures();

				self.numbersRenderSpare({
					parent: numbersView,
					dataNumbers: data
				});
				
				// call again to render uk_999 in ui
				self.numbersRenderSpare({
					parent: numbersView,
					dataNumbers: data
				});

				// call new render function to draw features
				self.numbersRenderUsed({
					parent: numbersView,
					dataNumbers: data
				});

				self.numbersRenderExternal({
					parent: numbersView,
					dataNumbers: data
				});

				self.numbersBindEvents(numbersView, data);

				container
					.empty()
					.append(numbersView);

				setTimeout(function() {
					var viewType = container.find('.half-box.selected').data('type');

					container.find('.list-numbers[data-type="' + viewType + '"] .search-custom input').focus();
				});
				
				callbackAfterRender && callbackAfterRender(container);

			});

		},

		//_util
		numbersFormatNumber: function(value) {
			var self = this;

			if ('used_by' in value) {
				value.friendlyUsedBy = self.i18n.active().numbers[value.used_by];
			}

			return value;
		},

		numbersFormatData: function(data) {
			var self = this,
				mapAccounts = {},
				templateLists = _.merge({
					spareNumbers: [],
					usedNumbers: []
				}, _.pick(data.numbers, [
					'externalNumbers'
				])),
				templateData = {
					hideBuyNumbers: monster.config.whitelabel.hasOwnProperty('hideBuyNumbers') ? monster.config.whitelabel.hideBuyNumbers : false,
					hidePort: monster.config.whitelabel.hasOwnProperty('hide_port') ? monster.config.whitelabel.hide_port : false,
					viewType: data.viewType,
					canAddExternalCids: monster.config.whitelabel.hasOwnProperty('canAddExternalCids') ? monster.config.whitelabel.canAddExternalCids : false,
					canAddExternalNumbers: monster.util.canAddExternalNumbers(),
					listAccounts: []
				};

			/* Initializing accounts metadata */
			var thisAccount = _.extend(monster.apps.auth.currentAccount, templateLists);

			if (data.viewType !== 'pbx') {
				_.each(data.accounts, function(account) {
					mapAccounts[account.id] = account;
				});
			}

			/* assign each number to spare numbers or used numbers for main account */
			_.each(data.numbers.numbers, function(value, phoneNumber) {
				value.phoneNumber = phoneNumber;

				value = self.numbersFormatNumber(value);

				if (!value.used_by) {
					thisAccount.spareNumbers.push(value);
				} else if (data.viewType !== 'pbx') {
					thisAccount.usedNumbers.push(value);
				} else if (value.used_by === 'callflow' || value.used_by === 'mobile') {
					thisAccount.usedNumbers.push(value);
				}
			});

			thisAccount.countExternalNumbers = thisAccount.externalNumbers.length;
			thisAccount.countUsedNumbers = thisAccount.usedNumbers.length;
			thisAccount.countSpareNumbers = thisAccount.spareNumbers.length;
			thisAccount.open = 'open';

			mapAccounts[self.accountId] = thisAccount;

			var sortByName = function(a, b) {
				return a.phoneNumber > b.phoneNumber;
			};

			/* Sort the list of numbers of the main account and add the subaccounts in a list to be ordered by name later */
			_.each(mapAccounts, function(value) {
				if (value.id !== self.accountId) {
					templateData.listAccounts.push(value);
				} else {
					value.spareNumbers.sort(sortByName);
					value.usedNumbers.sort(sortByName);
				}
			});

			/* Order the subaccount list by name */
			templateData.listAccounts.sort(function(a, b) {
				return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
			});

			/* Append our current account with the numbers at the top */
			templateData.listAccounts.unshift(mapAccounts[self.accountId]);

			return templateData;
		},

		numbersBindEvents: function(parent, dataNumbers) {

			var self = this,
				listType = dataNumbers.viewType && dataNumbers.viewType === 'manager' ? 'full' : 'partial',
				listSearchedAccounts = [ self.accountId ],
				showLinks = function() {

					var methodToUse = parent.find('.number-box.selected').size() > 0 ? 'addClass' : 'removeClass';
					parent.find('.list-numbers:visible #trigger_links')[methodToUse]('active');

					// support for delete button within header
					if (parent.find('.number-box.selected').length > 0) {
						parent.find('.list-numbers:visible .accounts-numbers #delete_numbers').prop('disabled', false).removeClass('deleted-numbers-disabled');
					} else {
						parent.find('.list-numbers:visible .accounts-numbers #delete_numbers').prop('disabled', true).addClass('deleted-numbers-disabled');
					}
					
				},
				displayNumberList = function(accountId, callback, forceRefresh) {
					var alreadySearched = _.indexOf(listSearchedAccounts, accountId) >= 0,
						forceRefresh = forceRefresh || false;

					if (!alreadySearched || forceRefresh) {
						self.numbersList(accountId, function(numbers) {
							var spareNumbers = [],
								usedNumbers = [],
								sortByName = function(a, b) {
									return a.phoneNumber > b.phoneNumber;
								};

							if (!alreadySearched) {
								listSearchedAccounts.push(accountId);
							}

							_.each(numbers.numbers, function(value, phoneNumber) {
								if (phoneNumber !== 'id' && phoneNumber !== 'quantity') {
									value.phoneNumber = phoneNumber;

									value = self.numbersFormatNumber(value);

									if (!value.used_by) {
										spareNumbers.push(value);
									} else if (listType === 'full') {
										usedNumbers.push(value);
									} else if (value.used_by === 'callflow' || value.used_by === 'mobile') {
										usedNumbers.push(value);
									}
								}
							});

							_.each(dataNumbers.listAccounts, function(value) {
								if (value.id === accountId) {
									value.spareNumbers = spareNumbers.sort(sortByName);
									value.usedNumbers = usedNumbers.sort(sortByName);
									value.externalNumbers = numbers.externalNumbers;
									value.countSpareNumbers = spareNumbers.length;
									value.countUsedNumbers = usedNumbers.length;
									value.countExternalNumbers = numbers.externalNumbers.length;

									parent
										.find('.list-numbers[data-type="spare"] .account-section[data-id="' + accountId + '"] .numbers-wrapper')
										.empty()
										.append($(self.getTemplate({
											name: 'spareAccount',
											data: {
												viewType: dataNumbers.viewType,
												spareNumbers: spareNumbers
											},
											submodule: 'numbers'
										})))
										.parent()
										.find('.count')
										.html('(' + spareNumbers.length + ')');

									self.numbersDisplayFeaturesMenu(spareNumbers, parent.find('.list-numbers[data-type="spare"] .account-section[data-id="' + accountId + '"]'));

									parent
										.find('.list-numbers[data-type="used"] .account-section[data-id="' + accountId + '"] .numbers-wrapper')
										.empty()
										.append($(self.getTemplate({
											name: 'usedAccount',
											data: {
												viewType: dataNumbers.viewType,
												usedNumbers: usedNumbers
											},
											submodule: 'numbers'
										})))
										.parent()
										.find('.count')
										.html('(' + usedNumbers.length + ')');

									self.numbersDisplayFeaturesMenu(usedNumbers, parent.find('.list-numbers[data-type="used"] .account-section[data-id="' + accountId + '"]'));

									parent
										.find('.list-numbers[data-type="external"] .account-section[data-id="' + accountId + '"] .numbers-wrapper')
										.empty()
										.append($(self.getTemplate({
											name: 'externalAccount',
											data: {
												viewType: dataNumbers.viewType,
												externalNumbers: numbers.externalNumbers
											},
											submodule: 'numbers'
										})))
										.parent()
										.find('.count')
										.html('(' + numbers.externalNumbers.length + ')');

									return false;
								}
							});

							callback && callback();
						}, listType);
					} else {
						callback && callback();
					}
				};

			/* On init */
			monster.ui.tooltips(parent);

			if (dataNumbers.viewType === 'pbx') {
				parent.find('.list-numbers[data-type="spare"]').hide();
				parent.find('.half-box[data-type="used"]').addClass('selected');
			} else {
				parent.find('.list-numbers[data-type="used"]').hide();
				parent.find('.half-box[data-type="spare"]').addClass('selected');
			}
			parent.find('.list-numbers[data-type="external"]').hide();

			/* Events */
			/* Toggle between spare/used numbers view */
			parent.find('.half-box').on('click', function() {
				var box = $(this),
					type = box.data('type');

				if (!box.hasClass('selected')) {
					parent.find('.half-box').removeClass('selected');
					parent.find('.list-numbers').hide();

					setTimeout(function() {
						parent.find('.list-numbers[data-type="' + type + '"] .search-custom input').focus();
					});

					box.addClass('selected');
					parent.find('.list-numbers[data-type="' + type + '"]').show();
				}
			});

			/* Select all numbers when clicking on the account checkbox */
			parent.on('click', '.account-header input[type="checkbox"]', function(event) {
				var checkboxes = $(this).parents('.account-section').first().find('.number-box input[type="checkbox"]'),
					isChecked = $(this).prop('checked');

				checkboxes.prop('checked', isChecked);

				isChecked ? checkboxes.parent().addClass('selected') : checkboxes.parent().removeClass('selected');

				showLinks();
			});

			/* Click on an account header, open list of numbers of this account. Send an API call to search it if it has not been searched already */
			parent.on('click', '.expandable', function(event) {
				var section = $(this).parents('.account-section'),
					accountId = section.data('id'),
					toggle = function() {
						section.toggleClass('open');

						if (!section.hasClass('open')) {
							section.find('input[type="checkbox"]:checked').prop('checked', false);
							section.find('.number-box.selected').removeClass('selected');
						}

						_.each(dataNumbers.listAccounts, function(account) {
							if (account.id === accountId) {
								account.open = section.hasClass('open') ? 'open' : '';
							}
						});
					};

				displayNumberList(accountId, function() {
					toggle();
				});

				showLinks();
			});

			parent.on('click', '.account-header .buy-numbers-link', function(e) {
				var accountId = $(this).parents('.account-section').data('id');

				monster.pub('common.buyNumbers', {
					accountId: accountId,
					searchType: $(this).data('type'),
					callbacks: {
						success: function(numbers) {
							displayNumberList(accountId, function(numbers) {
								parent.find('.account-section[data-id="' + accountId + '"]').addClass('open');
							}, true);
						}
					}
				});
			});

			parent.on('click', '.actions-wrapper .buy-numbers-dropdown .buy-numbers-link', function(e) {
				monster.pub('common.buyNumbers', {
					accountId: self.accountId,
					searchType: $(this).data('type'),
					callbacks: {
						success: function(numbers) {
							displayNumberList(self.accountId, function(numbers) {}, true);
						}
					}
				});
			});

			parent.on('click', '.account-header .action-number.port', function(e) {
				var accountId = $(this).parents('.account-section').data('id');

				monster.pub('common.portListing.render', {
					data: {
						accountId: accountId
					}
				});
			});

			parent.on('click', '.actions-wrapper .action-number.port', function(e) {
				var accountId = self.accountId;

				monster.pub('common.portListing.render', {
					data: {
						accountId: accountId
					}
				});
			});

			function syncNumbers(accountId) {
				self.numbersSyncUsedBy(accountId, function(numbers) {
					displayNumberList(accountId, function(numbers) {
						if (miscSettings.enableBottomToast) {
							monster.ui.toast({
								type: 'success',
								message: self.i18n.active().numbers.sync.success,
								options: {
									positionClass: 'toast-bottom-right',
									timeOut: 3000,
									extendedTimeOut: 1000,
								}
							});
						} else {
							monster.ui.toast({
								type: 'success',
								message: self.i18n.active().numbers.sync.success
							});
						};
					}, true);
				});
			};

			parent.on('click', '.account-header .action-number.add-external', function(e) {
				self.numbersAddExternalNumbers($(this).parents('.account-section').data('id'), function() {
					// variables are being passed to they are not cleared on reload of data
					self.numbersRender({ container: $('#number_manager'), allowedCarriers, miscSettings, defaultCountryCode, numberStateToggleCarriers, notificationSettings});
				});
			});

			parent.on('click', '.account-header .action-number.sync', function(e) {
				syncNumbers($(this).parents('.account-section').data('id'));
			});

			parent.on('click', '.actions-wrapper .action-number.sync', function(e) {
				syncNumbers(self.accountId);
			});

			/* Add class selected when you click on a number box, check/uncheck  the account checkbox if all/no numbers are checked */
			parent.on('click', '.number-box:not(.disabled)', function(event) {
				var currentBox = $(this);

				if (!currentBox.hasClass('no-data')) {
					var section = currentBox.parents('.account-section').first(),
						accountCheckbox = section.find('.account-header input[type="checkbox"]');

					currentBox.toggleClass('selected');

					if (!$(event.target).is('input:checkbox')) {
						var currentCb = currentBox.find('input[type="checkbox"]'),
							cbValue = currentCb.prop('checked');

						currentCb.prop('checked', !cbValue);
					}

					/* Check account checkbox if all the numbers are checked */
					if (section.find('.numbers-wrapper input[type="checkbox"]:checked').size() === section.find('.numbers-wrapper input[type="checkbox"]').size()) {
						accountCheckbox.prop('checked', true);
					} else {
						accountCheckbox.prop('checked', false);
					}
				}

				showLinks();
			});

			/* Delete Numbers */
			parent.on('click', '#delete_numbers', function(event) {
				var listNumbers = [],
					mapAccounts = {},
					dataTemplate = {
						remove: true,
						accountList: []
					},
					e911ErrorMessage = '';

				parent.find('.number-box.selected').each(function(k, v) {
					var box = $(v),
						number = box.data('phonenumber'),
						accountId = box.parents('.account-section').data('id'),
						accountName = box.parents('.account-section').data('name').toString();

					if (!(accountId in mapAccounts)) {
						mapAccounts[accountId] = {};
						dataTemplate.accountList.push({
							accountName: accountName
						});
					}

					for (var account in dataTemplate.accountList) {
						if (typeof dataTemplate.accountList[account].numbers === 'undefined') {
							dataTemplate.accountList[account].numbers = [];
						}

						if (dataTemplate.accountList[account].accountName === accountName) {
							dataTemplate.accountList[account].numbers.push(number);
						}
					}

					mapAccounts[accountId][number] = true;
					listNumbers.push(number);
				});

				dataTemplate.numberCount = listNumbers.length;

				_.each(dataTemplate.accountList, function(val) {
					var account = _.find(dataNumbers.listAccounts, function(account) { return account.name === val.accountName; }),
						e911Numbers = _.filter(account.spareNumbers, function(num) {
							return num.features.indexOf('e911') >= 0;
						}).concat(_.filter(account.usedNumbers, function(num) {
							return num.features.indexOf('e911') >= 0;
						})),
						selectedE911Numbers = [];

					if (e911Numbers.length > 0) {
						_.each(e911Numbers, function(number) {
							if (val.numbers.indexOf(number.phoneNumber) >= 0) {
								selectedE911Numbers.push(number.phoneNumber);
							}
						});

						if (e911Numbers.length === selectedE911Numbers.length) {
							if (!e911ErrorMessage) {
								e911ErrorMessage = self.i18n.active().numbers.deleteE911Error.message;
							}
							e911ErrorMessage += '<br><br>' + self.i18n.active().numbers.deleteE911Error.account + ' ' + val.accountName;
							e911ErrorMessage += '<br>' + self.i18n.active().numbers.deleteE911Error.numbers + ' ' + selectedE911Numbers.join(', ');
						}
					}
				});

				if (e911ErrorMessage) {
					if (miscSettings.enableBottomToast) {
						monster.ui.toast({
							type: 'error',
							message: e911ErrorMessage,
							options: {
								positionClass: 'toast-bottom-right',
								timeOut: 8000,
								extendedTimeOut: 5000,
							}
						});
					} else {
						monster.ui.alert('error', e911ErrorMessage);
					};
				} else {
					var dialogTemplate = $(self.getTemplate({
							name: 'actionsConfirmation',
							data: {
								...dataTemplate,
								miscSettings: miscSettings
							},
							submodule: 'numbers'
						})),
						requestData = {
							numbers: listNumbers,
							accountId: self.accountId
						};

					// update the dialog to show formatted phone numbers
					dialogTemplate.find('.phone-number').each(function() {
						var numberElement = $(this),
							number = numberElement.closest('td').data('number'),
							formattedNumber = monster.util.formatPhoneNumber(number);
						numberElement.text(formattedNumber);
					});	

					
					var popup = monster.ui.dialog(dialogTemplate, {
						width: '540px',
						title: 'Delete Phone Numbers'
					});
					

					dialogTemplate.on('click', '.remove-number', function() {
						for (var number in requestData.numbers) {
							if ($(this).parent().data('number') === requestData.numbers[number]) {
								var tbody = $(this).parent().parent().parent(),
									childCount = tbody[0].childElementCount,
									numbersCount = dialogTemplate.find('h4').find('.monster-blue');

								requestData.numbers.splice(number, 1);
								$(this).parent().parent().remove();

								if (childCount === 1) {
									tbody[0].previousElementSibling.remove();
									tbody.remove();
								}
								numbersCount.text(numbersCount.text() - 1);
							}

							if (requestData.numbers.length === 0) {
								popup.dialog('close');
							}
						}
					});

					dialogTemplate.on('click', '.cancel-link', function() {
						popup.dialog('close');
					});

					dialogTemplate.on('click', '#delete_action', function() {
						self.numbersDelete(requestData, function(data) {
							_.each(dataNumbers.listAccounts, function(account, indexAccount) {
								if (account.id in mapAccounts) {
									var newList = [];
									_.each(account.spareNumbers, function(number, indexNumber) {
										if (!data.hasOwnProperty('success') || !(number.phoneNumber in data.success)) {
											newList.push(number);
										}
									});

									dataNumbers.listAccounts[indexAccount].spareNumbers = newList;
									dataNumbers.listAccounts[indexAccount].countSpareNumbers = newList.length;
								}
							});

							popup.dialog('close');

							if (miscSettings.enableBottomToast) {

								var successCount = Object.keys(data.success).length;

								monster.ui.toast({
									type: 'success',
									message: successCount + self.i18n.active().numbers.deleteExternal.successDelete,
									options: {
										positionClass: 'toast-bottom-right',
										timeOut: 8000,
										extendedTimeOut: 5000,
									}
								});
							} else {
								self.numbersShowDeletedNumbers(data);
							}

							self.numbersRenderSpare({ parent: parent, dataNumbers: dataNumbers });
						});
					});
				}
			});

			/* to plugin */
			var moveNumbersToAccount = function(accountId, accountName) {
				var listNumbers = [],
					destinationAccountId = accountId,
					destinationIndex = -1,
					mapAccounts = {},
					dataTemplate = {
						destinationAccountName: accountName,
						move: true,
						accountList: []
					};

				parent.find('.number-box.selected').each(function(k, v) {
					var box = $(v),
						number = box.data('phonenumber'),
						accountId = box.parents('.account-section').data('id'),
						accountNameFrom = box.parents('.account-section').data('name');

					if (!(accountId in mapAccounts)) {
						mapAccounts[accountId] = {};
						dataTemplate.accountList.push({
							accountName: accountNameFrom
						});
					}

					for (var account in dataTemplate.accountList) {
						if (typeof dataTemplate.accountList[account].numbers === 'undefined') {
							dataTemplate.accountList[account].numbers = [];
						}

						if (dataTemplate.accountList[account].accountName === accountNameFrom) {
							dataTemplate.accountList[account].numbers.push(number);
						}
					}

					mapAccounts[accountId][number] = true;
					listNumbers.push(number);
				});

				dataTemplate.numberCount = listNumbers.length;

				var dialogTemplate = $(self.getTemplate({
						name: 'actionsConfirmation',
						data: dataTemplate,
						submodule: 'numbers'
					})),
					requestData = {
						numbers: listNumbers,
						accountId: destinationAccountId
					},
					popup = monster.ui.dialog(dialogTemplate, {
						width: '540px',
						title: self.i18n.active().numbers.moveNumbersConfirmationTitle
					});

				dialogTemplate.on('click', '.remove-number', function() {
					for (var number in requestData.numbers) {
						if ($(this).parent().data('number') === requestData.numbers[number]) {
							var tbody = $(this).parent().parent().parent(),
								childCount = tbody[0].childElementCount,
								numbersCount = dialogTemplate.find('h4').find('.monster-blue:first-child');

							requestData.numbers.splice(number, 1);
							$(this).parent().parent().remove();

							if (childCount === 1) {
								tbody[0].previousElementSibling.remove();
								tbody.remove();
							}
							numbersCount.text(numbersCount.text() - 1);
						}

						if (requestData.numbers.length === 0) {
							popup.dialog('close');
						}
					}
				});

				dialogTemplate.on('click', '.cancel-link', function() {
					popup.dialog('close');
				});

				dialogTemplate.on('click', '#move_action', function() {
					self.numbersMove(requestData, function(data) {
						var countMove = 0;

						_.each(dataNumbers.listAccounts, function(account, indexAccount) {
							if (account.id === destinationAccountId) {
								destinationIndex = indexAccount;
							}

							if (account.id in mapAccounts) {
								var newList = [];
								_.each(account.spareNumbers, function(number, indexNumber) {
									if (!(number.phoneNumber in data.success)) {
										newList.push(number);
									} else {
										data.success[number.phoneNumber] = number;
										countMove++;
									}
								});

								dataNumbers.listAccounts[indexAccount].spareNumbers = newList;
								dataNumbers.listAccounts[indexAccount].countSpareNumbers = newList.length;
							}
						});

						/* If we didn't open it yet, it will be automatically updated when we click on it */
						if (_.indexOf(listSearchedAccounts, destinationAccountId) > -1) {
							_.each(data.success, function(value, number) {
								dataNumbers.listAccounts[destinationIndex].spareNumbers.push(value);
							});

							dataNumbers.listAccounts[destinationIndex].countSpareNumbers = dataNumbers.listAccounts[destinationIndex].spareNumbers.length;
						}

						self.numbersRenderSpare({
							parent: parent,
							dataNumbers: dataNumbers,
							callback: function() {
								var dataTemplate = {
										count: countMove,
										accountName: accountName
									},
									template = self.getTemplate({
										name: '!' + self.i18n.active().numbers.successMove,
										data: dataTemplate,
										submodule: 'numbers'
									});

								popup.dialog('close');

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

							}
						});
					});
				});
			};

			parent.on('click', '#move_numbers', function() {
				monster.pub('common.accountBrowser.render', {
					container: parent.find('.list-numbers[data-type="spare"] .accounts-dropdown'),
					customClass: 'ab-dropdown',
					addCurrentAccount: true,
					addBackButton: true,
					onAccountClick: function(accountId, accountName) {
						moveNumbersToAccount(accountId, accountName);
						parent.find('.list-numbers[data-type="spare"] .dropdown-move').removeClass('open');
					}
				});
			});

			// local account search with filtering
			if (miscSettings.enableLocalNumberSearch) {

				var normalizeNumber = function(number) {
					return number.replace(/\D/g, ''); // remove everything that's not a digit
				};

				var searchListNumbers = function(searchString, parent) {
					
					var numberTextSearchString = normalizeNumber(searchString.toLowerCase());
					var usedByTextSearchString = searchString.toLowerCase(); 
					var numberItems = parent.find('.number-box');

					numberItems.each(function() {
						
						var numberText = normalizeNumber($(this).find('.monster-phone-number-value').text().toLowerCase()); 
						var usedByText = $(this).find('.used-by').text().toLowerCase();
						var validNumber = false;

						if (numberTextSearchString.length > 0) {
							validNumber = true
						}

						// check if the search string matches either the phone number or the used by field
						if (validNumber == true && numberText.includes(numberTextSearchString) || usedByText.includes(usedByTextSearchString)) {
							$(this).show();
						} else {
							$(this).hide();
						}
					});

				};

				var resetListNumbers = function(parent) {
					parent.find('.number-box').show();
				};
			
				// event handler for typing in the search input for spare numbers (real-time search)
				parent.on('input', '.list-numbers[data-type="spare"] .search-custom input[type="text"]', function(e) {
					var searchString = e.target.value.toLowerCase(),
						spareList = parent.find('.list-numbers[data-type="spare"]');
			
					// perform search if the search string has at least two characters (numbers or text)
					if (searchString.length >= 2) {
						searchListNumbers(searchString, spareList);
					} else {
						// if fewer than two characters, reset the list
						resetListNumbers(spareList);
					}
				});
			
				// event handler for typing in the search input for used numbers (real-time search)
				parent.on('input', '.list-numbers[data-type="used"] .search-custom input[type="text"]', function(e) {
					var searchString = e.target.value.toLowerCase(),
						usedList = parent.find('.list-numbers[data-type="used"]');
			
					// perform search if the search string has at least two characters (numbers or text)
					if (searchString.length >= 2) {
						searchListNumbers(searchString, usedList);
					} else {
						// if fewer than two characters, reset the list
						resetListNumbers(usedList);
					}
				});
			
			}

			// classic search
			else {

				var searchListNumbers = function(searchString, parent) {
					var viewList = parent;

					searchString = monster.util.unformatPhoneNumber(searchString);

					self.numbersSearchAccount(searchString, function(data) {
						if (data.account_id) {
							if (_.find(dataNumbers.listAccounts, function(val) { return val.id === data.account_id; })) {
								displayNumberList(data.account_id, function() {
									var section = viewList.find('[data-id="' + data.account_id + '"]'),
										numberBox = section.find('[data-phonenumber="' + data.number + '"]');

									if (numberBox.size() > 0) {
										section.addClass('open');
										monster.ui.highlight(numberBox, {
											timer: 5000
										});
									} else {
										var type = parent.attr('data-type') === 'spare' ? 'notSpareNumber' : 'notUsedNumber',
											template = self.getTemplate({
												name: '!' + self.i18n.active().numbers[type],
												data: {
													number: data.number,
													accountName: section.data('name')
												},
												submodule: 'numbers'
											});

										if (miscSettings.enableBottomToast) {
											monster.ui.toast({
												type: 'warning',
												message: template,
												options: {
													positionClass: 'toast-bottom-right',
													timeOut: 3000,
													extendedTimeOut: 1000,
												}
											});
										} else {
											monster.ui.toast({
												type: 'warning',
												message: template
											});
										};

									}
								});
							} else {
								self.numbersGetSubAccountNumber(data.account_id, data.number, function(dataNumber) {
									var dataEntity = {
										id: data.number
									};

									if (dataNumber.hasOwnProperty('used_by')) {
										dataEntity.used_by = dataNumber.used_by;
									}

									monster.pub('common.accountAncestors.render', {
										accountId: data.account_id,
										entity: {
											type: 'number',
											data: dataEntity
										}
									});
								});
							}
						}
					});
				};

				parent.on('click', '.list-numbers[data-type="spare"] button.search-numbers', function(e) {
					var spareList = parent.find('.list-numbers[data-type="spare"]'),
						searchString = spareList.find('.search-custom input[type="text"]').val().toLowerCase();

					searchListNumbers(searchString, spareList);
				});

				parent.on('keyup', '.list-numbers[data-type="spare"] .search-custom input[type="text"]', function(e) {
					if (e.keyCode === 13) {
						var val = e.target.value.toLowerCase(),
							spareList = parent.find('.list-numbers[data-type="spare"]');

						if (val) {
							searchListNumbers(val, spareList);
						}
					}
				});

				parent.on('click', '.list-numbers[data-type="used"] button.search-numbers', function(e) {
					var usedList = parent.find('.list-numbers[data-type="used"]'),
						searchString = usedList.find('.search-custom input[type="text"]').val().toLowerCase();

					searchListNumbers(searchString, usedList);
				});

				parent.on('keyup', '.list-numbers[data-type="used"] .search-custom input[type="text"]', function(e) {
					if (e.keyCode === 13) {
						var val = e.target.value.toLowerCase(),
							usedList = parent.find('.list-numbers[data-type="used"]');

						if (val) {
							searchListNumbers(val, usedList);
						}
					}
				});

			}

			self.numbersBindExternalNumbersEvents(parent, dataNumbers);
		},

		numbersBindExternalNumbersEvents: function(parent, dataNumbers) {
			var self = this,
				container = parent.find('.list-numbers[data-type="external"]'),
				deleteNumbers = function(selectedNumbersMetadata) {
					var selectedAccountsMetadata = _
							.chain(selectedNumbersMetadata)
							.uniqBy('accountId')
							.map(
								_.partial(_.pick, _, [
									'accountId',
									'accountName'
								])
							)
							.value(),
						numbersToDelete = _.map(selectedNumbersMetadata, 'number'),
						dataTemplate = {
							remove: true,
							numberCount: _.size(numbersToDelete),
							accountList: _.map(selectedAccountsMetadata, function(data) {
								return _.merge({
									numbers: _
										.chain(selectedNumbersMetadata)
										.filter({ accountId: data.accountId })
										.map('number')
										.value()
								}, data);
							})
						},
						dialogTemplate = $(self.getTemplate({
							name: 'actionsConfirmation',
							data: dataTemplate,
							submodule: 'numbers'
						})),
						popup = monster.ui.dialog(dialogTemplate, {
							width: '540px',
							title: 'Delete Numbers - Confirmation'
						});

					dialogTemplate.on('click', '.remove-number', function() {
						var number = $(this).parent().data('number');

						if (_.includes(numbersToDelete, number)) {
							var tbody = $(this).parent().parent().parent(),
								childCount = tbody[0].childElementCount,
								numbersCount = dialogTemplate.find('h4').find('span');

							_.remove(numbersToDelete, _.partial(_.isEqual, number));
							$(this).parent().parent().remove();

							if (childCount === 1) {
								tbody[0].previousElementSibling.remove();
								tbody.remove();
							}
							numbersCount.text(numbersCount.text() - 1);
						}
						if (_.isEmpty(numbersToDelete)) {
							popup.dialog('close');
						}
					});

					dialogTemplate.on('click', '.cancel-link', function() {
						popup.dialog('close');
					});

					dialogTemplate.on('click', '#delete_action', function() {
						monster.parallel(async.reflectAll(_
							.chain(selectedNumbersMetadata)
							.filter(_.flow(
								_.partial(_.get, _, 'number'),
								_.partial(_.includes, numbersToDelete)
							))
							.reduce(function(requests, metadata) {
								_.set(requests, _.join([
									metadata.accountId,
									metadata.id
								]), function(next) {
									self.callApi({
										resource: 'externalNumbers.delete',
										data: {
											accountId: metadata.accountId,
											numberId: metadata.id
										},
										success: _.partial(next, null),
										error: next
									});
								});

								return requests;
							}, {})
							.value()
						), function(err, results) {
							var formattedResults = _.map(results, function(data, id) {
								var ids = _.split(id, ','),
									accountId = _.head(ids),
									numberId = _.last(ids),
									number = _
										.chain(selectedNumbersMetadata)
										.find({
											accountId: accountId,
											id: numberId
										})
										.get('number')
										.value();

								return _.merge({
									number: number
								}, _.pick(data, [
									'error'
								]));
							});

							popup.dialog('close');
							self.numbersShowDeletedNumbers({
								success: _
									.chain(formattedResults)
									.filter(_.flow(
										_.partial(_.ary(_.get, 2), _, 'error'),
										_.isUndefined
									))
									.map('number')
									.keyBy()
									.value(),
								error: _
									.chain(formattedResults)
									.reject(_.flow(
										_.partial(_.ary(_.get, 2), _, 'error'),
										_.isUndefined
									))
									.keyBy('number')
									.mapValues(function(data) {
										return {
											message: data.error
										};
									})
									.value()
							});

							_.forEach(results, function(data, id) {
								var ids = _.split(id, ','),
									accountId = _.head(ids),
									numberId = _.last(ids),
									number = _
										.chain(selectedNumbersMetadata)
										.find({
											accountId: accountId,
											id: numberId
										})
										.get('number')
										.value(),
									accountNode = _.find(dataNumbers.listAccounts, {
										id: accountId
									});

								_.set(accountNode, 'externalNumbers', _.reject(accountNode.externalNumbers, {
									number: number
								}));
							});
							self.numbersRenderExternal({
								parent: parent,
								dataNumbers: dataNumbers
							});
						});
					});
				};

			container.on('click', '#add', function(event) {
				event.preventDefault();

				monster.pub('common.cidNumber.renderAdd', {
					accountId: self.accountId,
					onVerified: function(numberMetadata) {
						var accountNode = _.find(dataNumbers.listAccounts, {
							id: self.accountId
						});

						_.set(accountNode, 'externalNumbers', _
							.chain(accountNode)
							.get('externalNumbers', [])
							.concat(numberMetadata)
							.value()
						);
						self.numbersRenderExternal({
							parent: parent,
							dataNumbers: dataNumbers
						});
					}
				});
			});

			container.on('click', '.add', function(event) {
				event.preventDefault();

				var accountId = $(this).parents('.account-section').data('id');

				monster.pub('common.cidNumber.renderAdd', {
					accountId: accountId,
					onVerified: function(numberMetadata) {
						var accountNode = _.find(dataNumbers.listAccounts, {
							id: accountId
						});

						_.set(accountNode, 'externalNumbers', _
							.chain(accountNode)
							.get('externalNumbers', [])
							.concat(numberMetadata)
							.value()
						);
						self.numbersRenderExternal({
							parent: parent,
							dataNumbers: dataNumbers
						});
					}
				});
			});

			container.on('click', '#delete_external_numbers', function(event) {
				event.preventDefault();

				var selectedNumbersMetadata = _.map(parent.find('.number-box:visible.selected'), function(el) {
					var $el = $(el),
						$account = $el.parents('.account-section');

					return _.merge({
						accountId: $account.data('id'),
						accountName: $account.data('name')
					}, _.pick($el.data(), [
						'id',
						'number'
					]));
				});

				deleteNumbers(selectedNumbersMetadata);
			});

			container.on('click', '.verify', function(event) {
				event.preventDefault();

				var $numberBox = $(this).parents('.number-box'),
					$accountSection = $numberBox.parents('.account-section'),
					accountId = $accountSection.data('id'),
					numberMetadata = {
						accountId: accountId,
						numberId: $numberBox.data('id'),
						phoneNumber: $numberBox.data('number')
					};

				monster.pub('common.cidNumber.renderVerify', _.merge({
					deleteUnverifiedOnClose: false,
					onVerified: function(metadata) {
						var accountNode = _.find(dataNumbers.listAccounts, {
							id: accountId
						});

						_.set(accountNode, 'externalNumbers', _
							.chain(accountNode.externalNumbers)
							.reject({
								id: metadata.id
							})
							.concat(metadata)
							.value()
						);
						self.numbersRenderExternal({
							parent: parent,
							dataNumbers: dataNumbers
						});
					}
				}, numberMetadata));
			});

			container.on('click', '.force-verify', function(event) {
				event.preventDefault();

				var $numberBox = $(this).parents('.number-box'),
					$accountSection = $numberBox.parents('.account-section'),
					accountId = $accountSection.data('id');

				monster.pub('common.cidNumber.forceVerify', {
					accountId: accountId,
					numberId: $numberBox.data('id'),
					onVerified: function(metadata) {
						var accountNode = _.find(dataNumbers.listAccounts, {
							id: accountId
						});

						_.set(accountNode, 'externalNumbers', _
							.chain(accountNode.externalNumbers)
							.reject(_.pick(metadata, [
								'id'
							]))
							.concat(metadata)
							.value()
						);
						self.numbersRenderExternal({
							parent: parent,
							dataNumbers: dataNumbers
						});
					}
				});
			});

			container.on('click', '.delete', function(event) {
				event.preventDefault();

				var $numberBox = $(this).parents('.number-box'),
					$accountSection = $numberBox.parents('.account-section'),
					numberMetadata = _.merge({
						accountId: $accountSection.data('id'),
						accountName: $accountSection.data('name')
					}, _.pick($numberBox.data(), [
						'id',
						'number'
					]));

				deleteNumbers([numberMetadata]);
			});
		},

		numbersGetSubAccountNumber: function(accountId, number, callback) {
			var self = this;

			self.callApi({
				resource: 'numbers.get',
				data: {
					accountId: accountId,
					generateError: false,
					phoneNumber: number
				},
				success: function(data) {
					callback && callback(data.data);
				},
				error: function(parsedError, error, globalHandler) {
					if ([403, 404].includes(error.status)) {
						if (miscSettings.enableBottomToast) {
							monster.ui.toast({
								type: 'error',
								message: self.i18n.active().numbers.dialogAlertNowAllowed.info,
								options: {
									positionClass: 'toast-bottom-right',
									timeOut: 8000,
									extendedTimeOut: 5000,
								}
							});
						} else {
							monster.ui.alert(self.i18n.active().numbers.dialogAlertNowAllowed.info);
						};
					} else {
						globalHandler(parsedError, { generateError: true });
					}
				}
			});
		},

		numbersShowRecapAddNumbers: function(data) {
			var self = this,
				addRecapTemplate = $(self.getTemplate({
					name: 'addExternalResults',
					submodule: 'numbers'
				})),
				formattedData = {
					errors: [],
					successes: [],
					countTotal: 0
				};

			_.each(data.error, function(obj, phoneNumber) {
				formattedData.errors.push({ id: phoneNumber, value: monster.util.formatPhoneNumber(phoneNumber), errorMessage: obj.code + ' - ' + obj.error + ': ' + obj.message });
			});

			_.each(data.success, function(obj, phoneNumber) {
				formattedData.successes.push({ id: phoneNumber, value: monster.util.formatPhoneNumber(phoneNumber) });
			});

			formattedData.countTotal = formattedData.successes.length + formattedData.errors.length;

			addRecapTemplate.find('.results-wrapper').append(monster.ui.results(formattedData));

			addRecapTemplate.find('#continue').on('click', function() {
				popup.dialog('close');
			});

			var popup = monster.ui.dialog(addRecapTemplate, {
				title: self.i18n.active().numbers.addExternal.resultsDialog.title
			});
		},

		numbersAddFreeformNumbers: function(numbersData, accountId, carrierName, state, numberMetadataPublic, callback) {
			var self = this;

			if (monster.util.canAddExternalNumbers()) {
				self.numbersCreateBlockNumber(numbersData, accountId, carrierName, state, numberMetadataPublic, function(data) {
				
					if (data.error && Object.keys(data.error).length > 0) {
						self.numbersShowRecapAddNumbers(data);
					} else {

						// webhook to external service
						if (miscSettings.enableNumberAddedNotifications) {

							var requestData = {
								account_id: self.accountId,
								action: 'number_added',
								numbers_data: numbersData,
								...numberMetadataPublic
							};

							if (miscSettings.includeAuthTokenWithinNotifications) {
								requestData.auth_token = monster.util.getAuthToken();
							}

							var numberHash = numbersData[0];

							self.computeHash(numberHash, function(numberHash) {

								if (miscSettings.enableConsoleLogging) {
									console.log('numberHash', numbersData[0]);
									console.log('checksum', numberHash);
								}
		
								monster.request({
									resource: 'notification.number.added',
									data: {
										data: {
											...requestData,
											checksum: numberHash
										},
										removeMetadataAPI: true
									}
								});
		
							});

						}

						var successCount = Object.keys(data.success).length;

						if (miscSettings.enableBottomToast) {
							monster.ui.toast({
								type: 'success',
								message: successCount + self.i18n.active().numbers.addExternal.successAddToast,
								options: {
									positionClass: 'toast-bottom-right',
									timeOut: 3000,
									extendedTimeOut: 1000,
								}
							});
						} else {
							monster.ui.toast({
								type: 'success',
								message: self.i18n.active().numbers.addExternal.successAdd
							});
						};

					}

					callback && callback();
				});
			} else {
				// If the user doesn't have the rights to add numbers, show an alert
				if (miscSettings.enableBottomToast) {
					monster.ui.toast({
						type: 'error',
						message: self.i18n.active().numbers.noRightsAddNumber,
						options: {
							positionClass: 'toast-bottom-right',
							timeOut: 8000,
							extendedTimeOut: 5000,
						}
					});
				} else {
					monster.ui.alert(self.i18n.active().numbers.noRightsAddNumber);
				};
			}

		},

		numbersGetCarrierInfo: function(callback) {
			var self = this;

			self.callApi({
				resource: 'numbers.getCarrierInfo',
				data: {
					accountId: self.accountId
				},
				success: function(data) {
					var formattedData = self.numbersFormatCarriersInfo(data.data);

					callback && callback(formattedData);
				}
			});
		},

		numbersFormatCarriersInfo: function(data) {
			var self = this,
				carriers = [];

			data.extra = data.extra || {};

			_.each(data.usable_carriers, function(carrierName) {
				carriers.push({
					key: carrierName,
					friendlyValue: carrierName
				});
			});

			if (monster.util.isSuperDuper()) {
				carriers.push({
					key: '_uiCustomChoice',
					friendlyValue: self.i18n.active().numbers.numbersCarrierModule.custom
				});
			}

			data.extra.formattedCarriers = carriers;

			return data;
		},

		numbersGetCarriersModules: function(callback) {
			var self = this;

			self.numbersGetCarrierInfo(function(data) {
				callback && callback(data.extra.formattedCarriers);
			});
		},

		numbersAddExternalGetData: function(callback) {			
			var self = this,
				formattedData = {
					selectedCarrier: 'local',
					isAllowedToPickCarrier: monster.util.isSuperDuper(),
					isAllowedToPickState: true,
					allowedCarriers: allowedCarriers
				};

			self.numbersGetCarrierInfo(function(data) {
				formattedData.carriers = data.extra.formattedCarriers;
				formattedData.states = data.usable_creation_states;

				// If there's only 1 state then it will be defaulted to by the back-end and we don't need to show the field
				if (formattedData.states.length <= 1) {
					formattedData.isAllowedToPickState = false;
				}

				callback && callback(formattedData);
			});
		},

		numbersAddExternalNumbers: function(accountId, callback) {

			var self = this;

			self.numbersAddExternalGetData(function(data) {

				var dialogTemplate = $(self.getTemplate({
						name: 'addExternal',
						data: {
							...data,
							miscSettings: miscSettings
						},
						submodule: 'numbers'
					})),
					CUSTOM_CHOICE = '_uiCustomChoice';

				monster.ui.tooltips(dialogTemplate);

				dialogTemplate.find('.select-module').on('change', function() {
					dialogTemplate.find('.custom-carrier-block').toggleClass('active', $(this).val() === CUSTOM_CHOICE);
				});

				dialogTemplate.on('click', '.cancel-link', function() {
					popup.dialog('close');
				});

				dialogTemplate.on('click', '#add_numbers', function(ev) {

					ev.preventDefault();

					//var phoneNumbers = dialogTemplate.find('.list-numbers').val(),
					var phoneNumbers,
						numbersData = [],
						phoneNumber,
						state = dialogTemplate.find('.select-state').val(),
						carrierName = dialogTemplate.find('.select-module').val(),
						numberMetadataPublic;

						if (dialogTemplate.find('#number_type').val() === 'range') {
							
							// get the values of range_start and range_end
							var rangeStart = dialogTemplate.find('#number_range_start').val();
							var rangeQuantity = parseInt(dialogTemplate.find('#number_range_quantity').val()); // Convert quantity to an integer

							// convert the phone numbers to numeric values
							var start = parseInt(rangeStart);
							var lastNumber;

							// initialize an empty string to hold the numbers
							var numbersString = '';

							// generate numbers based on the quantity
							for (var i = 0; i < rangeQuantity; i++) {
								var currentNumber = start + i;
								numbersString += '+' + currentNumber + ' ';

								// update lastNumber with the current number on each iteration
								lastNumber = '+' + currentNumber;
							}

							phoneNumbers = numbersString;

							numberMetadataPublic = {
								"number_metadata_public": { 
									"carrier": dialogTemplate.find('#allowed_carriers').val(),
									"source": dialogTemplate.find('#number_source').val(),
									"classification": dialogTemplate.find('#number_classification').val(),
									"type": dialogTemplate.find('#number_type').val(),
									"range_start": dialogTemplate.find('#number_range_start').val(),
									"range_end": lastNumber,
									"range_qty": dialogTemplate.find('#number_range_quantity').val()
								}
							};

						} else {

							var singleNumber = dialogTemplate.find('#number_single').val();

							phoneNumbers = singleNumber;

							numberMetadataPublic = {
								"number_metadata_public": { 
									"carrier": dialogTemplate.find('#allowed_carriers').val(),
									"source": dialogTemplate.find('#number_source').val(),
									"classification": dialogTemplate.find('#number_classification').val(),
									"type": dialogTemplate.find('#number_type').val()
								}
							};
						}

					if (carrierName === CUSTOM_CHOICE) {
						carrierName = dialogTemplate.find('#custom_carrier_value').val();
					};
				
					// Users might think a space == new line, so if they added numbers and separated each of them by a new line, we make sure to replace these by a space so our script works
					phoneNumbers = phoneNumbers.replace(/[\n]/g, ' ');
					phoneNumbers = phoneNumbers.replace(/[-().]/g, '').split(' ');

					// check length of the entered number
					if (phoneNumbers[0].length >= 12) {

						_.each(phoneNumbers, function(number) {
							phoneNumber = number.match(/^\+(.*)$/);
	
							if (phoneNumber && phoneNumber[1]) {
								numbersData.push(number);
							}
						});
	
						if (numbersData.length > 0) {
	
							var allowedCarriers = dialogTemplate.find('#allowed_carriers').val(),
								numberSource = dialogTemplate.find('#number_source').val(),
								numberClassification = dialogTemplate.find('#number_classification').val(),
								numberType = dialogTemplate.find('#number_type').val();
	
							// check if all required fields have been populated
							var anyFieldIsNull = !allowedCarriers || !numberSource || !numberClassification || !numberType;
	
							if (anyFieldIsNull) {
								
								if (miscSettings.enableBottomToast) {
									monster.ui.toast({
										type: 'error',
										message: self.i18n.active().numbers.addExternal.dialog.invalidNumbers2,
										options: {
											positionClass: 'toast-bottom-right',
											timeOut: 8000,
											extendedTimeOut: 5000,
										}
									});
								} else {
									monster.ui.alert('warning', self.i18n.active().numbers.addExternal.dialog.invalidNumbers2);
								};
	
							} 
							
							else {
								
								self.numbersAddFreeformNumbers(numbersData, accountId, carrierName, state, numberMetadataPublic, function() {							
									popup.dialog('close');
		
									callback && callback();
								});
	
							}
	
						} else {
	
							if (miscSettings.enableBottomToast) {
								monster.ui.toast({
									type: 'error',
									message: self.i18n.active().numbers.addExternal.dialog.invalidNumbers1,
									options: {
										positionClass: 'toast-bottom-right',
										timeOut: 8000,
										extendedTimeOut: 5000,
									}
								});
							} else {
								monster.ui.alert('warning', self.i18n.active().numbers.addExternal.dialog.invalidNumbers1);
							};
	
						}

					} else {

						if (miscSettings.enableBottomToast) {
							monster.ui.toast({
								type: 'error',
								message: self.i18n.active().numbers.addExternal.dialog.invalidNumbers3,
								options: {
									positionClass: 'toast-bottom-right',
									timeOut: 8000,
									extendedTimeOut: 5000,
								}
							});
						} else {
							monster.ui.alert('warning', self.i18n.active().numbers.addExternal.dialog.invalidNumbers3);
						};

					}

				});

				var popup = monster.ui.dialog(dialogTemplate, {
					title: self.i18n.active().numbers.addExternal.dialog.title
				});

				dialogTemplate.find('#customize_number_range').hide();
				dialogTemplate.find('#customize_number_single').hide();

				dialogTemplate.find('#number_type').on('change', function() {
					if ($(this).val() === "range") {
						$('#customize_number_range').show();
						$('#number_range_start').val(defaultCountryCode);
						$('#customize_number_single').hide();
						$('#number_single').val(null);
					} 
					else if ($(this).val() === "snddi") {
						$('#customize_number_range').hide();
						$('#number_range_start').val(null);
						$('#number_range_quantity').val(null);
						$('#customize_number_single').show();
						$('#number_single').val(defaultCountryCode);
					} 
					else {
						$('#customize_number_range').hide();
						$('#number_range_start').val(null);
						$('#number_range_quantity').val(null);
						$('#customize_number_single').hide();
						$('#number_single').val(null);
					}
				});

				dialogTemplate.find('#number_range_quantity').on('change', function() {
					if ($(this).val() < 0 || $(this).val() > 1000) {

						if (miscSettings.enableBottomToast) {
							monster.ui.toast({
								type: 'error',
								message: self.i18n.active().numbers.addExternal.numberType.rangeQtyError,
								options: {
									positionClass: 'toast-bottom-right',
									timeOut: 8000,
									extendedTimeOut: 5000,
								}
							});
							dialogTemplate.find('#number_range_quantity').val(null);
						} else {
							monster.ui.alert('warning', self.i18n.active().numbers.addExternal.numberType.rangeQtyError);
							dialogTemplate.find('#number_range_quantity').val(null);
						};

					}

					else {

					}

				});
			
			});

		},

		numbersShowDeletedNumbers: function(data) {
			var self = this,
				deleteRecapTemplate = $(self.getTemplate({
					name: 'deleteConfirmation',
					submodule: 'numbers'
				})),
				formattedData = {
					errors: [],
					successes: [],
					countTotal: 0
				};

			_.each(data.error, function(obj, phoneNumber) {
				formattedData.errors.push({ id: phoneNumber, value: monster.util.formatPhoneNumber(phoneNumber), errorMessage: obj.message });
			});

			_.each(data.success, function(obj, phoneNumber) {
				formattedData.successes.push({ id: phoneNumber, value: monster.util.formatPhoneNumber(phoneNumber) });
			});

			formattedData.countTotal = formattedData.successes.length + formattedData.errors.length;

			deleteRecapTemplate.find('.results-wrapper').append(monster.ui.results(formattedData));

			deleteRecapTemplate.find('#continue').on('click', function() {
				popup.dialog('close');
			});

			var popup = monster.ui.dialog(deleteRecapTemplate, {
				title: self.i18n.active().numbers.deleteRecapDialog.title
			});
		},

		numbersRenderSpare: function(args) {
			var self = this,
				dataNumbers = args.dataNumbers,
				template = $(self.getTemplate({
					name: 'spare',
					data: {
						...dataNumbers,
						miscSettings: miscSettings
					},
					submodule: 'numbers'
				})),
				arrayNumbersSpare = dataNumbers.listAccounts.length ? dataNumbers.listAccounts[0].spareNumbers : [];

			args.parent
				.find('.list-numbers[data-type="spare"]')
				.empty()
				.append(template);

			// disable delete button	
			template.find('#delete_numbers').prop('disabled', true).addClass('deleted-numbers-disabled');

			if (miscSettings.hideLocalFeatureIcon) {
				template.find('.feature-local').hide();
			}

			if (miscSettings.hideToolTips) {
				template.find('[data-toggle="tooltip"]').removeAttr('data-toggle');
			}

			self.numbersDisplayFeaturesMenu(arrayNumbersSpare, template);

			args.hasOwnProperty('callback') && args.callback();
		},

		numbersRenderUsed: function(args) {
			var self = this,
				dataNumbers = args.dataNumbers,
				template = $(self.getTemplate({
					name: 'used',
					data: {
						...dataNumbers,
						miscSettings: miscSettings
					},
					submodule: 'numbers'
				})),

				arrayNumbersUsed = dataNumbers.listAccounts.length ? dataNumbers.listAccounts[0].usedNumbers : [];

			args.parent
				.find('.list-numbers[data-type="used"]')
				.empty()
				.append(template);

			if (miscSettings.hideLocalFeatureIcon) {
				template.find('.feature-local').hide();
			}

			if (miscSettings.hideToolTips) {
				template.find('[data-toggle="tooltip"]').removeAttr('data-toggle');
			}

			self.numbersDisplayFeaturesMenu(arrayNumbersUsed, template);

			args.hasOwnProperty('callback') && args.callback();
		},

		numbersRenderExternal: function(args) {
			var self = this,
				dataNumbers = args.dataNumbers,
				template = $(self.getTemplate({
					name: 'external',
					data: _.merge({
						listAccounts: _.map(dataNumbers.listAccounts, function(account) {
							var verified = _
									.chain(account.externalNumbers)
									.filter('verified')
									.sortBy('number')
									.value(),
								unverified = _
									.chain(account.externalNumbers)
									.reject('verified')
									.sortBy('number')
									.value(),
								all = _.flatten([
									verified,
									unverified
								]);

							return _.merge({
								countExternalNumbers: _.size(all),
								externalNumbers: all
							}, _.omit(account, [
								'countExternalNumbers',
								'externalNumbers'
							]));
						})
					}, _.omit(dataNumbers, [
						'listAccounts'
					])),
					submodule: 'numbers'
				}));

			monster.ui.tooltips(template);

			args.parent
				.find('.list-numbers[data-type="external"]')
				.empty()
				.append(template);

			args.hasOwnProperty('callback') && args.callback();
		},

		numbersGetData: function(viewType, callback) {
			var self = this,
				listType = viewType && viewType === 'manager' ? 'full' : 'partial';

			monster.parallel({
				numbers: function(callback) {
					self.numbersList(self.accountId, function(numbers) {
						callback(null, numbers);
					}, listType);
				},
				accounts: function(callback) {
					self.numbersListAccounts(function(accounts) {
						callback(null, accounts);
					});
				}
			}, function(err, results) {
				callback(results);
			});
		},

		numbersMove: function(args, callback) {
			var self = this;

			self.callApi({
				resource: 'numbers.activateBlock',
				data: {
					accountId: args.accountId,
					data: {
						numbers: args.numbers
					}
				},
				success: function(_dataNumbers, status) {
					callback && callback(_dataNumbers.data);
				}
			});
		},

		numbersSearchAccount: function(phoneNumber, success) {
			var self = this;

			self.callApi({
				resource: 'numbers.identify',
				data: {
					accountId: self.accountId,
					phoneNumber: phoneNumber,
					generateError: false
				},
				success: function(_data, status) {
					success && success(_data.data);
				},
				error: function(_data, status) {
					if (_data.hasOwnProperty('data') && _data.data.hasOwnProperty('cause') && _data.data.cause === 'account_disabled' && _data.data.hasOwnProperty('number')) {
						success && success(_data.data);
					} else {
						if (miscSettings.enableBottomToast) {
							monster.ui.toast({
								type: 'error',
								message: self.i18n.active().numbers.numberNotFound,
								options: {
									positionClass: 'toast-bottom-right',
									timeOut: 3000,
									extendedTimeOut: 1000,
								}
							});
						} else {
							monster.ui.toast({
								type: 'error',
								message: self.i18n.active().numbers.numberNotFound
							});
						};
					}
				}
			});
		},

		numbersDelete: function(args, callback) {
			var self = this;

			self.callApi({
				resource: 'numbers.deleteBlock',
				data: {
					accountId: args.accountId,
					data: {
						numbers: args.numbers
					},
					generateError: false
				},
				success: function(_dataNumbers, status) {

					// webhook to external service
					if (miscSettings.enableNumberDeletedNotifications) {

						var requestData = {
							account_id: self.accountId,
							action: 'number_deleted',
							numbers_data: args.numbers
						};

						if (miscSettings.includeAuthTokenWithinNotifications) {
							requestData.auth_token = monster.util.getAuthToken();
						}

						var numberHash = args.numbers[0];

						self.computeHash(numberHash, function(numberHash) {

							if (miscSettings.enableConsoleLogging) {
								console.log('numberHash', args.numbers[0]);
								console.log('checksum', numberHash);
							}

							monster.request({
								resource: 'notification.number.deleted',
								data: {
									data: {
										...requestData,
										checksum: numberHash
									},
									removeMetadataAPI: true
								}
							});
	
						});

					}

					callback && callback(_dataNumbers.data);

				},
				error: function(data, status, globalHandler) {
					if (data.error === '400' && data.hasOwnProperty('data') && data.data.hasOwnProperty('error')) {
						callback && callback(data.data);
					} else {
						globalHandler(data, { generateError: true });
					}
				}
			});
		},

		numbersCreateNumber: function(number, accountId, success, error) {
			var self = this;

			self.callApi({
				resource: 'numbers.create',
				data: {
					accountId: accountId,
					phoneNumber: number
				},
				success: function(data) {
					success && success(data.data);
				},
				error: function(data) {
					error && error(data);
				}
			});
		},

		numbersCreateBlockNumber: function(numbers, accountId, carrierName, state, numberMetadataPublic, success, error) {
			var self = this,
				dataNumbers = {
					numbers: numbers,
					dimension: numberMetadataPublic,
					carrier_name: carrierName
				};

			if (state !== '_uiDefaultState') {
				dataNumbers.create_with_state = state;
			}

			self.callApi({
				resource: 'numbers.createBlock',
				data: {
					accountId: accountId,
					data: dataNumbers,
					generateError: false
				},
				success: function(data) {
					success && success(data.data);
				},
				error: function(data, status, globalHandler) {
					if (data.error === '400' && data.hasOwnProperty('data') && data.data.hasOwnProperty('error')) {
						success && success(data.data);
					} else {
						globalHandler(data, { generateError: true });
					}
				}
			});
		},

		numbersActivateNumber: function(number, accountId, success, error) {
			var self = this;

			self.callApi({
				resource: 'numbers.activate',
				data: {
					accountId: accountId,
					phoneNumber: number
				},
				success: function(data) {
					success && success(data.data);
				},
				error: function(data) {
					error && error(data);
				}
			});
		},

		/* AccountID and Callback in args */
		numbersFormatDialogSpare: function(data, ignoreNumbers, extraNumbers, featureFilters) {
			var self = this,
				formattedData = {
					accountName: data.accountName,
					numbers: {}
				},
				addNumber = function(id, number) {
					number.phoneNumber = id;
					number = self.numbersFormatNumber(number);

					formattedData.numbers[id] = number;
				};

			_.each(data.numbers, function(number, id) {
				if (extraNumbers.indexOf(id) >= 0) {
					addNumber(id, number);
				} else if ((!number.hasOwnProperty('used_by') || number.used_by === '') && ignoreNumbers.indexOf(id) === -1) {
					if (!featureFilters || featureFilters.length === 0) {
						addNumber(id, number);
					} else {
						$.each(featureFilters, function(k, feature) {
							if (number.features && number.features.indexOf(feature) >= 0) {
								addNumber(id, number);
								return false;
							}
						});
					}
				}
			});

			return formattedData;
		},

		numbersDialogSpare: function(args) {
			var self = this,
				accountId = args.accountId,
				accountName = args.accountName || '',
				ignoreNumbers = args.ignoreNumbers || [],
				extraNumbers = args.extraNumbers || [],
				featureFilters = args.featureFilters || [],
				singleSelect = args.singleSelect || false;

			self.numbersList(accountId, function(data) {
				data.accountName = accountName;

				var formattedData = self.numbersFormatDialogSpare(data, ignoreNumbers, extraNumbers, featureFilters);

				monster.pub('common.monsterListing.render', {
					dataList: formattedData.numbers,
					dataType: 'numbers',
					labels: {
						title: self.i18n.active().numbers.dialogSpare.title,
						headline: formattedData.accountName ? (self.i18n.active().numbers.dialogSpare.headline + ' ' + formattedData.accountName) : self.i18n.active().numbers.dialogSpare.headlineNoAccount,
						okButton: self.i18n.active().numbers.dialogSpare.proceed
					},
					singleSelect: singleSelect,
					okCallback: args.callback
				});
			});
		},

		numbersList: function(accountId, globalCallback, pListType) {
			var self = this;

			monster.parallel({
				callflows: function(callback) {
					self.numbersListCallflows(accountId, function(callflows) {
						callback && callback(null, callflows);
					});
				},
				devices: function(callback) {
					self.numbersListMobileDevices(accountId, function(devices) {
						callback && callback(null, devices);
					});
				},
				groups: function(callback) {
					self.numbersListGroups(accountId, function(groups) {
						callback && callback(null, groups);
					});
				},
				users: function(callback) {
					self.numbersListUsers(accountId, function(users) {
						callback && callback(null, users);
					});
				},
				numbers: function(callback) {
					self.numbersListNumbers(accountId, function(numbers) {
						callback && callback(null, numbers);
					}, pListType);
				},
				externalNumbers: function(callback) {
					if (!monster.util.getCapability('caller_id.external_numbers').isEnabled) {
						return callback(null, []);
					}
					self.callApi({
						resource: 'externalNumbers.list',
						data: {
							accountId: accountId,
							filters: {
								paginate: false
							}
						},
						success: _.flow(
							_.partial(_.get, _, 'data'),
							_.partial(callback, null)
						)
					});
				}
			}, function(err, results) {
				self.numbersFormatList(accountId, results);

				globalCallback && globalCallback(results.numbers);
			});
		},

		numbersFormatList: function(accountId, data) {
			var self = this,
				mapUsers = {},
				mapGroups = {};

			_.each(data.users, function(user) {
				mapUsers[user.id] = user;
			});

			_.each(data.groups, function(group) {
				mapGroups[group.id] = group;
			});

			_.each(data.callflows, function(callflow) {
				_.each(callflow.numbers, function(number) {
					if (number in data.numbers.numbers) {
						if (callflow.owner_id && callflow.owner_id in mapUsers) {
							var user = mapUsers[callflow.owner_id];

							data.numbers.numbers[number].owner = user.first_name + ' ' + user.last_name;
							data.numbers.numbers[number].ownerType = 'user';
						} else if (callflow.group_id) {
							data.numbers.numbers[number].owner = mapGroups.hasOwnProperty(callflow.group_id) ? mapGroups[callflow.group_id].name : self.i18n.active().numbers.unknownGroup;
							data.numbers.numbers[number].ownerType = 'group';
						} else if (callflow.type && callflow.type === 'main') {
							data.numbers.numbers[number].owner = self.i18n.active().numbers.mainNumber;
							data.numbers.numbers[number].ownerType = 'main';
						} else if (callflow.type && callflow.type === 'conference') {
							data.numbers.numbers[number].owner = self.i18n.active().numbers.conferenceNumber;
							data.numbers.numbers[number].ownerType = 'conference';
						} else {
							data.numbers.numbers[number].owner = self.i18n.active().numbers.callflows;
							data.numbers.numbers[number].ownerType = 'callflows';
						}
					}
				});
			});

			_.each(data.devices, function(device) {
				var mdn = device.mobile.mdn;

				data.numbers.numbers[mdn] = {
					assigned_to: accountId,
					features: [ 'mobile' ],
					phoneNumber: mdn,
					state: 'in_service',
					used_by: 'mobile'
				};

				var mobileOwner = {};
				if (device.hasOwnProperty('owner_id') && mapUsers.hasOwnProperty(device.owner_id)) {
					mobileOwner = {
						owner_id: device.owner_id,
						ownerType: 'mobileUser',
						owner: mapUsers[device.owner_id].first_name + ' ' + mapUsers[device.owner_id].last_name
					};
				} else {
					mobileOwner = {
						owner: self.i18n.active().numbers.unassigned
					};
				}
				$.extend(true, data.numbers.numbers[mdn], mobileOwner);
			});

			_.set(data, 'numbers.externalNumbers', data.externalNumbers);

			return data;
		},

		numbersSyncUsedBy: function(accountId, callback) {
			var self = this;

			self.callApi({
				resource: 'numbers.sync',
				data: {
					accountId: accountId
				},
				success: function(numbers) {
					callback && callback(numbers.data);
				}
			});
		},

		numbersListUsers: function(accountId, callback) {
			var self = this;

			self.callApi({
				resource: 'user.list',
				data: {
					accountId: accountId,
					filters: { paginate: false }
				},
				success: function(users, status) {
					callback && callback(users.data);
				}
			});
		},

		numbersListCallflows: function(accountId, callback) {
			var self = this;

			self.callApi({
				resource: 'callflow.list',
				data: {
					accountId: accountId,
					filters: { paginate: false }
				},
				success: function(callflows, status) {
					callback && callback(callflows.data);
				}
			});
		},

		numbersListGroups: function(accountId, callback) {
			var self = this;

			self.callApi({
				resource: 'group.list',
				data: {
					accountId: accountId,
					filters: { paginate: false }
				},
				success: function(groups, status) {
					callback && callback(groups.data);
				}
			});
		},

		// If view asking this list is the number manager, then we use the FULL list (with reserved, port_in numbers), otherwise, we just use the "in_service" filter
		numbersListNumbers: function(accountId, callback, pListType) {
			var self = this,
				type = pListType || 'partial',
				apiName = type === 'partial' ? 'numbers.list' : 'numbers.listAll';

			self.callApi({
				resource: apiName,
				data: {
					accountId: accountId,
					filters: { paginate: false }
				},
				success: function(_dataNumbers, status) {
					callback && callback(_dataNumbers.data);
				}
			});
		},

		numbersListAccounts: function(callback) {
			var self = this;

			self.callApi({
				resource: 'account.listChildren',
				data: {
					accountId: self.accountId,
					filters: { paginate: false }
				},
				success: function(_dataAccounts, status) {
					callback && callback(_dataAccounts.data);
				}
			});
		},

		numbersListMobileDevices: function(accountId, callback) {
			var self = this;

			self.callApi({
				resource: 'device.list',
				data: {
					accountId: accountId,
					filters: {
						filter_device_type: 'mobile',
						has_key: 'mobile'
					}
				},
				success: function(_dataDevices, status) {
					callback && callback(_dataDevices.data);
				}
			});
		},

		numbersGetNumber: function(phoneNumber, accountId, success, error) {
			var self = this;

			self.callApi({
				resource: 'numbers.get',
				data: {
					accountId: accountId,
					phoneNumber: phoneNumber
				},
				success: function(_data, status) {
					success && success(_data.data);
				},
				error: function(_data, status) {
					error && error(_data.data);
				}
			});
		},

		numbersEditFeatures: function(args) {
			var self = this,
				phoneNumber = args.number,
				accountId = args.hasOwnProperty('accountId') ? args.accountId : self.accountId,
				noStateNeeded = args.hasOwnProperty('noStateNeeded') ? args.noStateNeeded : false,
				isValid = false;

			self.numbersGetNumber(phoneNumber, accountId, function(number) {
				if (number.state === 'in_service' || noStateNeeded) {
					isValid = true;
				}

				if (isValid) {
					args.success && args.success(number);
				} else {
					if (args.hasOwnProperty('error')) {
						args.error('invalid');
					} else {
						var message = self.getTemplate({
							name: '!' + self.i18n.active().numbers.notInService,
							data: {
								variable: monster.util.formatPhoneNumber(number.id)
							},
							submodule: 'numbers'
						});

						if (miscSettings.enableBottomToast) {
							monster.ui.toast({
								type: 'error',
								message: message,
								options: {
									positionClass: 'toast-bottom-right',
									timeOut: 8000,
									extendedTimeOut: 5000,
								}
							});
						} else {
							monster.ui.alert('warning', message);
						};

					}
				}
			},
			function() {
				if (args.hasOwnProperty('error')) {
					args.error('errorGetNumber');
				} else {
					var message = self.getTemplate({
						name: '!' + self.i18n.active().numbers.errorFetchingNumber,
						data: {
							variable: monster.util.formatPhoneNumber(phoneNumber)
						},
						submodule: 'numbers'
					});

					if (miscSettings.enableBottomToast) {
						monster.ui.toast({
							type: 'error',
							message: message,
							options: {
								positionClass: 'toast-bottom-right',
								timeOut: 8000,
								extendedTimeOut: 5000,
							}
						});
					} else {
						monster.ui.alert('warning', message);
					};

				}
			});
		},
	
		numbersGetFeatures: function(callback) {			
			var self = this,
				features = {
					mobile: { icon: 'monster-grey fa fa-mobile-phone', help: self.i18n.active().numbers.mobileIconHelp },
					failover: { icon: 'monster-green icon-telicon-failover feature-failover', help: self.i18n.active().numbers.failoverIconHelp },
					local: { icon: 'monster-purple fa fa-rocket feature-local', help: self.i18n.active().numbers.localIconHelp },
					port: { icon: 'fa fa-phone monster-yellow feature-port', help: self.i18n.active().numbers.portIconHelp },
					prepend: { icon: 'monster-orange fa fa-file-text-o feature-prepend', help: self.i18n.active().numbers.prependIconHelp }
				};

			if (monster.util.isNumberFeatureEnabled('e911')) {
				features.dash_e911 = { icon: 'monster-red fa fa-ambulance feature-dash_e911', help: self.i18n.active().numbers.e911IconHelp };
			}
			
			if (monster.util.isNumberFeatureEnabled('cnam')) {
				features.outbound_cnam = { icon: 'monster-blue fa fa-user feature-outbound_cnam', help: self.i18n.active().numbers.cnamOutboundIconHelp };
				features.inbound_cnam = { icon: 'monster-green fa fa-user feature-inbound_cnam', help: self.i18n.active().numbers.cnamInboundIconHelp };
			}

			if (callback) {
				callback && callback(features);
			} else {
				return features;
			}
		},

		// pulled paintNumberFeaturesIcon into app from core
		paintNumberFeaturesIcon: function(features, target) {
			var self = this

			// Can't jQuery it as it's used by Handlebars with a helper, and it needs to return HTML
			var sortedFeatures = features && features.length ? features.sort() : [],
				template = $(self.getTemplate({
					name: 'monster-number-features',
					data: {
						features: sortedFeatures,
						miscSettings: miscSettings
					}
				}))

			monster.ui.tooltips($(template));

			if (target) {
				target.empty();

				target.append(template);
			} else {
				return template;
			}
		},

		numberGetDetails: function(args) {

			var self = this,
				argsCommon = {
					success: function(dataNumber) {
						self.numberDetailsRender(dataNumber, args.accountId, args.callbacks);
					},
					number: args.phoneNumber
				};

			if (args.hasOwnProperty('accountId')) {
				argsCommon.accountId = args.accountId;
			}

			monster.pub('dtNumbers.editFeatures', argsCommon);
		
		},

		numberDetailsRender: function(dataNumber, accountId, callbacks) {

			miscSettings.allowNumberStateToggle = false;

			if (dataNumber.hasOwnProperty('dimension') && dataNumber.dimension.hasOwnProperty('number_metadata_public')) {

				var carrierName = dataNumber.dimension.number_metadata_public.carrier;

				if (numberStateToggleCarriers.hasOwnProperty(carrierName) && numberStateToggleCarriers[carrierName] === true) {
					if (dataNumber.dimension.number_metadata_public.source === 'ported_in' && miscSettings.enableNumberStateToggle) {
						miscSettings.allowNumberStateToggle = true
					}

				}
			
			}

			var self = this,
				popup_html = $(self.getTemplate({
					name: 'numberDetails',
					data: {
						...dataNumber || {},
						miscSettings: miscSettings
					},
					submodule: 'numbers'
				})),
				popup;

			if (dataNumber.hasOwnProperty('dimension') && dataNumber.dimension.hasOwnProperty('number_metadata_public')) {

				if (dataNumber.dimension.number_metadata_public.type === 'snddi') {
					$('#numberDetailsRangeStartGroup', popup_html).hide();
					$('#numberDetailsRangeEndGroup', popup_html).hide();
					$('#numberDetailsRangeQtyGroup', popup_html).hide();
				}
		
				else if (dataNumber.dimension.number_metadata_public.type === 'range') {
					$('#numberDetailsRangeStartGroup', popup_html).show();
					$('#numberDetailsRangeEndGroup', popup_html).show();
					$('#numberDetailsRangeQtyGroup', popup_html).show();
				}
			
			}

			if (dataNumber.hasOwnProperty('dimension') && dataNumber.dimension.number_state == 'disabled') {
				$('#enableButton', popup_html).show();
				$('#disableButton', popup_html).hide();
			} 
			
			else {
				$('#enableButton', popup_html).hide();
				$('#disableButton', popup_html).show();
			}

			popup_html.find('.cancel-link').on('click', function(e) {
				e.preventDefault();
				popup.dialog('close');
			});

			popup = monster.ui.dialog(popup_html, {
				title: self.i18n.active().numberDetails.dialogTitle
			});

			popup_html.find('#enableNumber_btn').on('click', function(ev) {		
				
				ev.preventDefault();

				monster.ui.confirm(self.i18n.active().numberStatus.enableNumber, function() { 

					data = _.extend(dataNumber, { dimension: { number_state: 'enabled' }});

					var callbackSuccess = function callbackSuccess(data) {
						var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
							template = self.getTemplate({
								name: '!' + self.i18n.active().numberStatus.enableNumberConfirmation,
								data: {
									phoneNumber: phoneNumber
								},
								submodule: 'numbers'
							});
	
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
					};

					self.updateNumberStatus(dataNumber.id, accountId, data, {	
						success: function(data) {
							self.pushFeatures(data);

							// webhook to external service
							if (miscSettings.enableNumberEnabledNotifications) {

								var requestData = {
									account_id: self.accountId,
									action: 'state_change',
									number_state: data.data.dimension.number_state,
									phone_number: data.data.id
								};

								if (miscSettings.includeAuthTokenWithinNotifications) {
									requestData.auth_token = monster.util.getAuthToken();
								}

								var numberHash = data.data.id;

								self.computeHash(numberHash, function(numberHash) {

									if (miscSettings.enableConsoleLogging) {
										console.log('numberHash', data.data.id);
										console.log('checksum', numberHash);
									}

									monster.request({
										resource: 'notification.number.enabled',
										data: {
											data: {
												...requestData,
												checksum: numberHash
											},
											removeMetadataAPI: true
										}
									});
			
								});

							}

							callbackSuccess(data);
						}
					});

				});

			});

			popup_html.find('#disableNumber_btn').on('click', function(ev) {		
		
				ev.preventDefault();

				// prevent number being disabled if emergency services address has been set
				if (dataNumber.hasOwnProperty('dimension') && dataNumber.dimension.hasOwnProperty('uk_999')) {

					if (miscSettings.enableBottomToast) {
						monster.ui.toast({
							type: 'error',
							message: self.i18n.active().numberStatus.preventNumberDisableToast,
							options: {
								positionClass: 'toast-bottom-right',
								timeOut: 8000,
								extendedTimeOut: 5000,
							}
						});
					} else {
						monster.ui.alert('warning', self.i18n.active().numberStatus.preventNumberDisable);
					};
				
				} else {

					monster.ui.confirm(self.i18n.active().numberStatus.disableNumber, function() { 

						data = _.extend(dataNumber, { dimension: { number_state: 'disabled' }});
	
						var callbackSuccess = function callbackSuccess(data) {
							var phoneNumber = monster.util.formatPhoneNumber(data.data.id),
								template = self.getTemplate({
									name: '!' + self.i18n.active().numberStatus.disableNumberConfirmation,
									data: {
										phoneNumber: phoneNumber
									},
									submodule: 'numbers'
								});

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
						};
	
						self.updateNumberStatus(dataNumber.id, accountId, data, {	
							success: function(data) {
								self.pushFeatures(data);

								// webhook to external service
								if (miscSettings.enableNumberDisabledNotifications) {

									var requestData = {
										account_id: self.accountId,
										action: 'state_change',
										number_state: data.data.dimension.number_state,
										phone_number: data.data.id
									};
	
									if (miscSettings.includeAuthTokenWithinNotifications) {
										requestData.auth_token = monster.util.getAuthToken();
									}

									var numberHash = data.data.id;

									self.computeHash(numberHash, function(numberHash) {

										if (miscSettings.enableConsoleLogging) {
											console.log('numberHash', data.data.id);
											console.log('checksum', numberHash);
										}

										monster.request({
											resource: 'notification.number.disabled',
											data: {
												data: {
													...requestData,
													checksum: numberHash
												},
												removeMetadataAPI: true
											}
										});
				
									});

								}

								callbackSuccess(data);
							}
						});
	
					});

				}
				
			});

		},

		updateNumberStatus: function(phoneNumber, accountId, data, callbacks) {

			var self = this;

			// the back-end doesn't let us set features anymore, they return the field based on the key set on that document
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

		pushFeatures: function(data) {

			var data = data.data;

			if (data.hasOwnProperty('dimension')) {

				if (data.dimension.hasOwnProperty('uk_999') && !data.features.includes('uk_999')) {
					features = data.features || [];
					features.push('uk_999');
				}
	
				if (data.dimension.hasOwnProperty('number_state') && data.dimension.number_state == 'disabled' && !data.features.includes('carrier_disabled')) {
					features = data.features || [];
					features.push('carrier_disabled');
				}

			}
			
		},

		computeHash: function(number, callback) {

			var key = notificationSettings.requestKey,
				encoder = new TextEncoder(),
				data = encoder.encode(number + key);

			crypto.subtle.digest("SHA-256", data)
				.then(function(buffer) {
					var hashedBytes = new Uint8Array(buffer);
					var hexString = Array.from(hashedBytes)
						.map(function(b) { return b.toString(16).padStart(2, '0').toUpperCase(); })
						.join('');

					callback && callback(hexString);
				})
				.catch(function(error) {
					console.error("Error Computing Hash:", error);
					callback && callback("");
				});

		}

	};

	return dtNumbers;

});