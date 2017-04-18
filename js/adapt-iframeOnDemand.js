define(function(require) {

	var Adapt = require('coreJS/adapt');
	var ComponentView = require('coreViews/componentView');

	var IframeOnDemand = function() {
		return 	{
			initialize: function() {
				this.resetModelDisplayAttributes();

				if (this.initializeCondition() && this.iframeManagerIsEnabled()) {
					this.setReadyStatus();
					this.setupEvents();
				} else {
					ComponentView.prototype.initialize.apply(this, arguments);
				}
			},

			iframeManagerIsEnabled: function() {
				var extensions = Adapt.course.get('_globals')._extensions;

				return extensions.hasOwnProperty('_iframeManager') &&
				extensions._iframeManager.hasOwnProperty('_isEnabled') &&
				extensions._iframeManager._isEnabled
			},

			resetModelDisplayAttributes: function() {
				this.$el.attr('id', this.model.get('_id'));
				this.model.set('_isInitialized', false);
				this.model.set('_isRendered', false);
			},

			setupEvents: function() {
				this.listenForDisplayRequests();
				this.listenForDestroyRequests();
			},

			listenForDisplayRequests: function() {
				var base = this;

				Adapt.on('controlledIframes::display', function(id) {
					if (base.elementCanBeRendered(id)) {
						base.processComponentRendering();
						base.model.set('_isRendered', true);
					}
				});
			},

			processComponentRendering: function() {
				var base = this;
				var observer = new (base.getMutationObserver())(
					function(mutations) {
						mutations.forEach(
							base.delayLoaderDeletion(observer)
						);
					});
				base.renderComponent();
				base.observeIframe(observer);
			},

			observeIframe: function(observer) {
				var base = this;
				var iframeCtx = base.getIFrameContext();
				if (iframeCtx) {
					iframeCtx.on('load', function() {
						var context = iframeCtx.contents().find('div#Stage');
						if (context && context.length > 0) {
							observer.observe(context[0], base.getObserverParams());
						} else {
							context = iframeCtx.contents().find('.stage');
							if (context && context.length > 0) {
								observer.observe(context[0], base.getObserverParams());
							}
						}
					});
				}
			},

			getIFrameContext: function() {
				var iframeCtx = this.$el.find('iframe');

				if (iframeCtx && iframeCtx.length > 0 && iframeCtx.contents()) {
					return iframeCtx;
				} else {
					return false;
				}
			},

			getObserverParams: function() {
				return {
					attributes: true,
					childList: true,
					characterData: true
				};
			},

			listenForDestroyRequests: function() {
				var base = this;

				Adapt.on('controlledIframes::destroy', function(id) {
					if (base.elementCanBeDestroyed(id)) {
						base.$el.html('');
						base.model.set('_isRendered', false);
					}
				});
			},

			elementCanBeRendered: function(id) {
				return id === this.model.get('_id') && !this.model.get('_isRendered');
			},

			elementCanBeDestroyed: function(id) {
				return id === this.model.get('_id') &&
					this.model.get('_isInitialized') &&
					this.model.get('_isRendered');
			},

			getMutationObserver: function() {
				return window.MutationObserver ||
					window.WebKitMutationObserver ||
					window.MozMutationObserver;
			},

			delayLoaderDeletion: function(observer) {
				var base = this;
				return _.debounce(function() {
					base.$el.find('.controlledIframes-loader').remove();
					observer.disconnect();
				}, 500);
			},

			renderComponent: function() {
				if (!this.model.get('_isInitialized')) {
					ComponentView.prototype.initialize.apply(this, arguments);
					this.model.set('_isInitialized', true);
				} else {
					this.defaultInitialize();
				}
				this.appendLoader();
			},

			appendLoader: function() {
				this.$el.append('<div class="controlledIframes-loader">Loading...</div>');
			},

			defaultInitialize: function() {
				ComponentView.prototype.renderState.apply(this, arguments);
				ComponentView.prototype.render.apply(this, arguments);
			},

			initializeCondition: function() {
				return true;
			},
		};
	};


	return {
		mixin: function(ParentObject) {

			var _iframeOnDemand = new IframeOnDemand();

			if (typeof ParentObject.prototype.defaultInitialize === 'function') {
				_iframeOnDemand.defaultInitialize = ParentObject.prototype.defaultInitialize;
			}

			if (typeof ParentObject.prototype.initializeCondition === 'function') {
				_iframeOnDemand.initializeCondition = ParentObject.prototype.initializeCondition;
			}

			Object.keys(_iframeOnDemand).forEach(function(key) {
				ParentObject.prototype[key] = _iframeOnDemand[key];
			});

			return ParentObject;
		}
	};
})
