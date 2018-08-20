// Bootstrap提示框
(function ($) {
  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
      this.options = options
      this.$body = $(document.body)
      this.$element = $(element)
      this.$dialog = this.$element.find('.modal-dialog')
      this.$backdrop = null
      this.isShown = null
      this.originalBodyPad = null
      this.scrollbarWidth = 0
      this.ignoreBackdropClick = false

      if (this.options.remote) {
          this.$element
              .find('.modal-content')
              .load(this.options.remote, $.proxy(function () {
                  this.$element.trigger('loaded.bs.modal')
              }, this))
      }
  }

  Modal.VERSION = '3.3.7';

  Modal.TRANSITION_DURATION = 300;
  Modal.BACKDROP_TRANSITION_DURATION = 150;

  Modal.DEFAULTS = {
      backdrop: true,
      keyboard: true,
      show: true
  };

  Modal.prototype.toggle = function (_relatedTarget) {
      return this.isShown ? this.hide() : this.show(_relatedTarget)
  };

  Modal.prototype.show = function (_relatedTarget) {
      var that = this;
      var e = $.Event('show.bs.modal', {
          relatedTarget: _relatedTarget
      })

      this.$element.trigger(e)

      if (this.isShown || e.isDefaultPrevented()) return;

      this.isShown = true

      this.checkScrollbar()
      this.setScrollbar()
      this.$body.addClass('modal-open')

      this.escape()
      this.resize()

      this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

      this.$dialog.on('mousedown.dismiss.bs.modal', function () {
          that.$element.one('mouseup.dismiss.bs.modal', function (e) {
              if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
          })
      })

      this.backdrop(function () {
          var transition = $.support.transition && that.$element.hasClass('fade')

          if (!that.$element.parent().length) {
              that.$element.appendTo(that.$body) // don't move modals dom position
          }

          that.$element
              .show()
              .scrollTop(0)

          that.adjustDialog()

          if (transition) {
              that.$element[0].offsetWidth // force reflow
          }

          that.$element.addClass('in')

          that.enforceFocus()

          var e = $.Event('shown.bs.modal', {
              relatedTarget: _relatedTarget
          })

          transition ?
              that.$dialog // wait for modal to slide in
              .one('bsTransitionEnd', function () {
                  that.$element.trigger('focus').trigger(e)
              })
              .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
              that.$element.trigger('focus').trigger(e)
      })
  }

  Modal.prototype.hide = function (e) {
      if (e) e.preventDefault()

      e = $.Event('hide.bs.modal')

      this.$element.trigger(e)

      if (!this.isShown || e.isDefaultPrevented()) return

      this.isShown = false

      this.escape()
      this.resize()

      $(document).off('focusin.bs.modal')

      this.$element
          .removeClass('in')
          .off('click.dismiss.bs.modal')
          .off('mouseup.dismiss.bs.modal')

      this.$dialog.off('mousedown.dismiss.bs.modal')

      $.support.transition && this.$element.hasClass('fade') ?
          this.$element
          .one('bsTransitionEnd', $.proxy(this.hideModal, this))
          .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
          this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
      $(document)
          .off('focusin.bs.modal') // guard against infinite focus loop
          .on('focusin.bs.modal', $.proxy(function (e) {
              if (document !== e.target &&
                  this.$element[0] !== e.target &&
                  !this.$element.has(e.target).length) {
                  //this.$element.trigger('focus')
              }
          }, this))
  }

  Modal.prototype.escape = function () {
      if (this.isShown && this.options.keyboard) {
          this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
              e.which == 27 && this.hide()
          }, this))
      } else if (!this.isShown) {
          this.$element.off('keydown.dismiss.bs.modal')
      }
  }

  Modal.prototype.resize = function () {
      if (this.isShown) {
          $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
      } else {
          $(window).off('resize.bs.modal')
      }
  }

  Modal.prototype.hideModal = function () {
      var that = this
      this.$element.hide()
      this.backdrop(function () {
          that.$body.removeClass('modal-open')
          that.resetAdjustments()
          that.resetScrollbar()
          that.$element.trigger('hidden.bs.modal')
      })
  }

  Modal.prototype.removeBackdrop = function () {
      this.$backdrop && this.$backdrop.remove()
      this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
      var that = this
      var animate = this.$element.hasClass('fade') ? 'fade' : ''

      if (this.isShown && this.options.backdrop) {
          var doAnimate = $.support.transition && animate

          this.$backdrop = $(document.createElement('div'))
              .addClass('modal-backdrop ' + animate)
              .appendTo(this.$body)

          // this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
          //     if (this.ignoreBackdropClick) {
          //         this.ignoreBackdropClick = false
          //         return
          //     }
          //     if (e.target !== e.currentTarget) return
          //     this.options.backdrop == 'static' ?
          //         this.$element[0].focus() :
          //         this.hide()
          // }, this))

          this.$element.on('keydown', function (e) {
              e = window.event || e;
              if (e.keyCode == 116) {
                  return false;
              }
          })

          if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

          this.$backdrop.addClass('in')

          if (!callback) return

          doAnimate ?
              this.$backdrop
              .one('bsTransitionEnd', callback)
              .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
              callback()

      } else if (!this.isShown && this.$backdrop) {
          this.$backdrop.removeClass('in')

          var callbackRemove = function () {
              that.removeBackdrop()
              callback && callback()
          }
          $.support.transition && this.$element.hasClass('fade') ?
              this.$backdrop
              .one('bsTransitionEnd', callbackRemove)
              .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
              callbackRemove()

      } else if (callback) {
          callback()
      }
  }

  // these following methods are used to handle overflowing modals

  Modal.prototype.handleUpdate = function () {
      this.adjustDialog()
  }

  Modal.prototype.adjustDialog = function () {
      var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

      this.$element.css({
          paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
          paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
      })
  }

  Modal.prototype.resetAdjustments = function () {
      this.$element.css({
          paddingLeft: '',
          paddingRight: ''
      })
  }

  Modal.prototype.checkScrollbar = function () {
      var fullWindowWidth = window.innerWidth
      if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
          var documentElementRect = document.documentElement.getBoundingClientRect()
          fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
      }
      this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
      this.scrollbarWidth = this.measureScrollbar()
  }

  Modal.prototype.setScrollbar = function () {
      var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
      this.originalBodyPad = document.body.style.paddingRight || ''
      if (this.bodyIsOverflowing) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
  }

  Modal.prototype.resetScrollbar = function () {
      this.$body.css('padding-right', this.originalBodyPad)
  }

  Modal.prototype.measureScrollbar = function () { // thx walsh
      var scrollDiv = document.createElement('div')
      scrollDiv.className = 'modal-scrollbar-measure'
      this.$body.append(scrollDiv)
      var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
      this.$body[0].removeChild(scrollDiv)
      return scrollbarWidth
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
      return this.each(function () {
          var $this = $(this)
          var data = $this.data('bs.modal')
          var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

          if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
          if (typeof option == 'string') data[option](_relatedTarget)
          else if (options.show) data.show(_relatedTarget)
      })
  }

  var old = $.fn.modal

  $.fn.modal = Plugin
  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
      $.fn.modal = old
      return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
      var $this = $(this)
      var href = $this.attr('href')
      var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
      var option = $target.data('bs.modal') ? 'toggle' : $.extend({
          remote: !/#/.test(href) && href
      }, $target.data(), $this.data())

      if ($this.is('a')) e.preventDefault()

      $target.one('show.bs.modal', function (showEvent) {
          if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
          $target.one('hidden.bs.modal', function () {
              $this.is(':visible') && $this.trigger('focus')
          })
      })
      Plugin.call($target, option, this)
  })

})(jQuery);
// Tooltips.js
(function ($) {
  'use strict';

  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = function (element, options) {
      this.type = null
      this.options = null
      this.enabled = null
      this.timeout = null
      this.hoverState = null
      this.$element = null
      this.inState = null

      this.init('tooltip', element, options)
  }

  Tooltip.VERSION = '3.3.7'

  Tooltip.TRANSITION_DURATION = 150

  Tooltip.DEFAULTS = {
      animation: true,
      placement: 'top',
      selector: false,
      template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
      trigger: 'hover focus',
      title: '',
      delay: 0,
      html: false,
      container: false,
      viewport: {
          selector: 'body',
          padding: 0
      }
  }

  Tooltip.prototype.init = function (type, element, options) {
      this.enabled = true
      this.type = type
      this.$element = $(element)
      this.options = this.getOptions(options)
      this.$viewport = this.options.viewport && $($.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : (this.options.viewport.selector || this.options.viewport))
      this.inState = {
          click: false,
          hover: false,
          focus: false
      }

      if (this.$element[0] instanceof document.constructor && !this.options.selector) {
          throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!')
      }

      var triggers = this.options.trigger.split(' ')

      for (var i = triggers.length; i--;) {
          var trigger = triggers[i]

          if (trigger == 'click') {
              this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
          } else if (trigger != 'manual') {
              var eventIn = trigger == 'hover' ? 'mouseenter' : 'focusin'
              var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

              this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
              this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
          }
      }

      this.options.selector ?
          (this._options = $.extend({}, this.options, {
              trigger: 'manual',
              selector: ''
          })) :
          this.fixTitle()
  }

  Tooltip.prototype.getDefaults = function () {
      return Tooltip.DEFAULTS
  }

  Tooltip.prototype.getOptions = function (options) {
      options = $.extend({}, this.getDefaults(), this.$element.data(), options)

      if (options.delay && typeof options.delay == 'number') {
          options.delay = {
              show: options.delay,
              hide: options.delay
          }
      }

      return options
  }

  Tooltip.prototype.getDelegateOptions = function () {
      var options = {}
      var defaults = this.getDefaults()

      this._options && $.each(this._options, function (key, value) {
          if (defaults[key] != value) options[key] = value
      })

      return options
  }

  Tooltip.prototype.enter = function (obj) {
      var self = obj instanceof this.constructor ?
          obj : $(obj.currentTarget).data('bs.' + this.type)

      if (!self) {
          self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
          $(obj.currentTarget).data('bs.' + this.type, self)
      }

      if (obj instanceof $.Event) {
          self.inState[obj.type == 'focusin' ? 'focus' : 'hover'] = true
      }

      if (self.tip().hasClass('in') || self.hoverState == 'in') {
          self.hoverState = 'in'
          return
      }

      clearTimeout(self.timeout)

      self.hoverState = 'in'

      if (!self.options.delay || !self.options.delay.show) return self.show()

      self.timeout = setTimeout(function () {
          if (self.hoverState == 'in') self.show()
      }, self.options.delay.show)
  }

  Tooltip.prototype.isInStateTrue = function () {
      for (var key in this.inState) {
          if (this.inState[key]) return true
      }

      return false
  }

  Tooltip.prototype.leave = function (obj) {
      var self = obj instanceof this.constructor ?
          obj : $(obj.currentTarget).data('bs.' + this.type)

      if (!self) {
          self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
          $(obj.currentTarget).data('bs.' + this.type, self)
      }

      if (obj instanceof $.Event) {
          self.inState[obj.type == 'focusout' ? 'focus' : 'hover'] = false
      }

      if (self.isInStateTrue()) return

      clearTimeout(self.timeout)

      self.hoverState = 'out'

      if (!self.options.delay || !self.options.delay.hide) return self.hide()

      self.timeout = setTimeout(function () {
          if (self.hoverState == 'out') self.hide()
      }, self.options.delay.hide)
  }

  Tooltip.prototype.show = function () {
      var e = $.Event('show.bs.' + this.type)

      if (this.hasContent() && this.enabled) {
          this.$element.trigger(e)

          var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0])
          if (e.isDefaultPrevented() || !inDom) return
          var that = this

          var $tip = this.tip()

          var tipId = this.getUID(this.type)

          this.setContent()
          $tip.attr('id', tipId)
          this.$element.attr('aria-describedby', tipId)

          if (this.options.animation) $tip.addClass('fade')

          var placement = typeof this.options.placement == 'function' ?
              this.options.placement.call(this, $tip[0], this.$element[0]) :
              this.options.placement

          var autoToken = /\s?auto?\s?/i
          var autoPlace = autoToken.test(placement)
          if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

          $tip
              .detach()
              .css({
                  top: 0,
                  left: 0,
                  display: 'block'
              })
              .addClass(placement)
              .data('bs.' + this.type, this)

          this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)
          this.$element.trigger('inserted.bs.' + this.type)

          var pos = this.getPosition()
          var actualWidth = $tip[0].offsetWidth
          var actualHeight = $tip[0].offsetHeight

          if (autoPlace) {
              var orgPlacement = placement
              var viewportDim = this.getPosition(this.$viewport)

              placement = placement == 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top' :
                  placement == 'top' && pos.top - actualHeight < viewportDim.top ? 'bottom' :
                  placement == 'right' && pos.right + actualWidth > viewportDim.width ? 'left' :
                  placement == 'left' && pos.left - actualWidth < viewportDim.left ? 'right' :
                  placement

              $tip
                  .removeClass(orgPlacement)
                  .addClass(placement)
          }

          var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

          this.applyPlacement(calculatedOffset, placement)

          var complete = function () {
              var prevHoverState = that.hoverState
              that.$element.trigger('shown.bs.' + that.type)
              that.hoverState = null

              if (prevHoverState == 'out') that.leave(that)
          }

          $.support.transition && this.$tip.hasClass('fade') ?
              $tip
              .one('bsTransitionEnd', complete)
              .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
              complete()
      }
  }

  Tooltip.prototype.applyPlacement = function (offset, placement) {
      var $tip = this.tip()
      var width = $tip[0].offsetWidth
      var height = $tip[0].offsetHeight

      // manually read margins because getBoundingClientRect includes difference
      var marginTop = parseInt($tip.css('margin-top'), 10)
      var marginLeft = parseInt($tip.css('margin-left'), 10)

      // we must check for NaN for ie 8/9
      if (isNaN(marginTop)) marginTop = 0
      if (isNaN(marginLeft)) marginLeft = 0

      offset.top += marginTop
      offset.left += marginLeft

      // $.fn.offset doesn't round pixel values
      // so we use setOffset directly with our own function B-0
      $.offset.setOffset($tip[0], $.extend({
          using: function (props) {
              $tip.css({
                  top: Math.round(props.top),
                  left: Math.round(props.left)
              })
          }
      }, offset), 0)

      $tip.addClass('in')

      // check to see if placing tip in new offset caused the tip to resize itself
      var actualWidth = $tip[0].offsetWidth
      var actualHeight = $tip[0].offsetHeight

      if (placement == 'top' && actualHeight != height) {
          offset.top = offset.top + height - actualHeight
      }

      var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)

      if (delta.left) offset.left += delta.left
      else offset.top += delta.top

      var isVertical = /top|bottom/.test(placement)
      var arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
      var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight'

      $tip.offset(offset)
      this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical)
  }

  Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
      this.arrow()
          .css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
          .css(isVertical ? 'top' : 'left', '')
  }

  Tooltip.prototype.setContent = function () {
      var $tip = this.tip()
      var title = this.getTitle()

      $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
      $tip.removeClass('fade in top bottom left right')
  }

  Tooltip.prototype.hide = function (callback) {
      var that = this
      var $tip = $(this.$tip)
      var e = $.Event('hide.bs.' + this.type)

      function complete() {
          if (that.hoverState != 'in') $tip.detach()
          if (that.$element) { // TODO: Check whether guarding this code with this `if` is really necessary.
              that.$element
                  .removeAttr('aria-describedby')
                  .trigger('hidden.bs.' + that.type)
          }
          callback && callback()
      }

      this.$element.trigger(e)

      if (e.isDefaultPrevented()) return

      $tip.removeClass('in')

      $.support.transition && $tip.hasClass('fade') ?
          $tip
          .one('bsTransitionEnd', complete)
          .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
          complete()

      this.hoverState = null

      return this
  }

  Tooltip.prototype.fixTitle = function () {
      var $e = this.$element
      if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
          $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
      }
  }

  Tooltip.prototype.hasContent = function () {
      return this.getTitle()
  }

  Tooltip.prototype.getPosition = function ($element) {
      $element = $element || this.$element

      var el = $element[0]
      var isBody = el.tagName == 'BODY'

      var elRect = el.getBoundingClientRect()
      if (elRect.width == null) {
          // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
          elRect = $.extend({}, elRect, {
              width: elRect.right - elRect.left,
              height: elRect.bottom - elRect.top
          })
      }
      var isSvg = window.SVGElement && el instanceof window.SVGElement
      // Avoid using $.offset() on SVGs since it gives incorrect results in jQuery 3.
      // See https://github.com/twbs/bootstrap/issues/20280
      var elOffset = isBody ? {
          top: 0,
          left: 0
      } : (isSvg ? null : $element.offset())
      var scroll = {
          scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop()
      }
      var outerDims = isBody ? {
          width: $(window).width(),
          height: $(window).height()
      } : null

      return $.extend({}, elRect, scroll, outerDims, elOffset)
  }

  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
      return placement == 'bottom' ? {
              top: pos.top + pos.height,
              left: pos.left + pos.width / 2 - actualWidth / 2
          } :
          placement == 'top' ? {
              top: pos.top - actualHeight,
              left: pos.left + pos.width / 2 - actualWidth / 2
          } :
          placement == 'left' ? {
              top: pos.top + pos.height / 2 - actualHeight / 2,
              left: pos.left - actualWidth
          } :
          /* placement == 'right' */
          {
              top: pos.top + pos.height / 2 - actualHeight / 2,
              left: pos.left + pos.width
          }

  }

  Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
      var delta = {
          top: 0,
          left: 0
      }
      if (!this.$viewport) return delta

      var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
      var viewportDimensions = this.getPosition(this.$viewport)

      if (/right|left/.test(placement)) {
          var topEdgeOffset = pos.top - viewportPadding - viewportDimensions.scroll
          var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
          if (topEdgeOffset < viewportDimensions.top) { // top overflow
              delta.top = viewportDimensions.top - topEdgeOffset
          } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
              delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
          }
      } else {
          var leftEdgeOffset = pos.left - viewportPadding
          var rightEdgeOffset = pos.left + viewportPadding + actualWidth
          if (leftEdgeOffset < viewportDimensions.left) { // left overflow
              delta.left = viewportDimensions.left - leftEdgeOffset
          } else if (rightEdgeOffset > viewportDimensions.right) { // right overflow
              delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
          }
      }

      return delta
  }

  Tooltip.prototype.getTitle = function () {
      var title
      var $e = this.$element
      var o = this.options

      title = $e.attr('data-original-title') ||
          (typeof o.title == 'function' ? o.title.call($e[0]) : o.title)

      return title
  }

  Tooltip.prototype.getUID = function (prefix) {
      do prefix += ~~(Math.random() * 1000000)
      while (document.getElementById(prefix))
      return prefix
  }

  Tooltip.prototype.tip = function () {
      if (!this.$tip) {
          this.$tip = $(this.options.template)
          if (this.$tip.length != 1) {
              throw new Error(this.type + ' `template` option must consist of exactly 1 top-level element!')
          }
      }
      return this.$tip
  }

  Tooltip.prototype.arrow = function () {
      return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
  }

  Tooltip.prototype.enable = function () {
      this.enabled = true
  }

  Tooltip.prototype.disable = function () {
      this.enabled = false
  }

  Tooltip.prototype.toggleEnabled = function () {
      this.enabled = !this.enabled
  }

  Tooltip.prototype.toggle = function (e) {
      var self = this
      if (e) {
          self = $(e.currentTarget).data('bs.' + this.type)
          if (!self) {
              self = new this.constructor(e.currentTarget, this.getDelegateOptions())
              $(e.currentTarget).data('bs.' + this.type, self)
          }
      }

      if (e) {
          self.inState.click = !self.inState.click
          if (self.isInStateTrue()) self.enter(self)
          else self.leave(self)
      } else {
          self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
      }
  }

  Tooltip.prototype.destroy = function () {
      var that = this
      clearTimeout(this.timeout)
      this.hide(function () {
          that.$element.off('.' + that.type).removeData('bs.' + that.type)
          if (that.$tip) {
              that.$tip.detach()
          }
          that.$tip = null
          that.$arrow = null
          that.$viewport = null
          that.$element = null
      })
  }


  // TOOLTIP PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
      return this.each(function () {
          var $this = $(this)
          var data = $this.data('bs.tooltip')
          var options = typeof option == 'object' && option

          if (!data && /destroy|hide/.test(option)) return
          if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
          if (typeof option == 'string') data[option]()
      })
  }

  var old = $.fn.tooltip

  $.fn.tooltip = Plugin
  $.fn.tooltip.Constructor = Tooltip


  // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
      $.fn.tooltip = old
      return this
  }

})(jQuery);
// popover.js
(function ($) {
  'use strict';

  // POPOVER PUBLIC CLASS DEFINITION
  // ===============================

  var Popover = function (element, options) {
      this.init('popover', element, options)
  }

  if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js')

  Popover.VERSION = '3.3.7'

  Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
      placement: 'right',
      trigger: 'click',
      content: '',
      template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  })


  // NOTE: POPOVER EXTENDS tooltip.js
  // ================================

  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype)

  Popover.prototype.constructor = Popover

  Popover.prototype.getDefaults = function () {
      return Popover.DEFAULTS
  }

  Popover.prototype.setContent = function () {
      var $tip = this.tip()
      var title = this.getTitle()
      var content = this.getContent()

      $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
      $tip.find('.popover-content').children().detach().end()[ // we use append for html objects to maintain js events
          this.options.html ? (typeof content == 'string' ? 'html' : 'append') : 'text'
      ](content)

      $tip.removeClass('fade top bottom left right in')

      // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
      // this manually by checking the contents.
      if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
  }

  Popover.prototype.hasContent = function () {
      return this.getTitle() || this.getContent()
  }

  Popover.prototype.getContent = function () {
      var $e = this.$element
      var o = this.options

      return $e.attr('data-content') ||
          (typeof o.content == 'function' ?
              o.content.call($e[0]) :
              o.content)
  }

  Popover.prototype.arrow = function () {
      return (this.$arrow = this.$arrow || this.tip().find('.arrow'))
  }


  // POPOVER PLUGIN DEFINITION
  // =========================

  function Plugin(option) {
      return this.each(function () {
          var $this = $(this)
          var data = $this.data('bs.popover')
          var options = typeof option == 'object' && option

          if (!data && /destroy|hide/.test(option)) return
          if (!data) $this.data('bs.popover', (data = new Popover(this, options)))
          if (typeof option == 'string') data[option]()
      })
  }

  var old = $.fn.popover

  $.fn.popover = Plugin
  $.fn.popover.Constructor = Popover


  // POPOVER NO CONFLICT
  // ===================

  $.fn.popover.noConflict = function () {
      $.fn.popover = old
      return this
  }

})(jQuery);
// alert.js
(function ($) {
  'use strict';

  // ALERT CLASS DEFINITION
  // ======================

  var dismiss = '[data-dismiss="alert"]'
  var Alert = function (el) {
      $(el).on('click', dismiss, this.close)
  }

  Alert.VERSION = '3.3.7'

  Alert.TRANSITION_DURATION = 150

  Alert.prototype.close = function (e) {
      var $this = $(this)
      var selector = $this.attr('data-target')

      if (!selector) {
          selector = $this.attr('href')
          selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
      }

      var $parent = $(selector === '#' ? [] : selector)

      if (e) e.preventDefault()

      if (!$parent.length) {
          $parent = $this.closest('.alert')
      }

      $parent.trigger(e = $.Event('close.bs.alert'))

      if (e.isDefaultPrevented()) return

      $parent.removeClass('in')

      function removeElement() {
          // detach from parent, fire event then clean up data
          $parent.detach().trigger('closed.bs.alert').remove()
      }

      $.support.transition && $parent.hasClass('fade') ?
          $parent
          .one('bsTransitionEnd', removeElement)
          .emulateTransitionEnd(Alert.TRANSITION_DURATION) :
          removeElement()
  }


  // ALERT PLUGIN DEFINITION
  // =======================

  function Plugin(option) {
      return this.each(function () {
          var $this = $(this)
          var data = $this.data('bs.alert')

          if (!data) $this.data('bs.alert', (data = new Alert(this)))
          if (typeof option == 'string') data[option].call($this)
      })
  }

  var old = $.fn.alert

  $.fn.alert = Plugin
  $.fn.alert.Constructor = Alert


  // ALERT NO CONFLICT
  // =================

  $.fn.alert.noConflict = function () {
      $.fn.alert = old
      return this
  }


  // ALERT DATA-API
  // ==============

  $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close)

})(jQuery);
// 提示框
(function ($) {
  /**
   * 
   * 
   * @param {any} type 状态 success  info   warning  danger 四个状态
   * @param {any} caret 内容
   * @param {any} times 显示时间 等于于0一直显示
   */
  function alert(type, caret, times) {
      var type = type || 'danger';
      var caret = caret || '错误';
      var times = times || 3000;
      $('body .alert').remove();
      $('body').append('<div class="alert alert-' + type + ' alert-dismissible fade in text-center" style="position: fixed;top:0;width:100%;z-index:10"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button> <i class="icon icon-warn1 h4"></i> ' + caret + '</div>');
      if (times > 0) {
          setTimeout(function () {
              $('body .alert').remove();
          }, times)
      }
  }
  /**
   *  弹出框提示
   * 
   * @param {any} type 类型 success error img 三个状态
   * @param {any} caret 内容
   */

  function modal(type, caret) {
      var title = '提示';
      var modalbody = '';
      if (type === 'error') {
          modalbody = '<p><i class="icon icon-shibai text-red" style="font-size: 80px;"></i></p><p style="font-size: 16px;">' + caret + '</p>';
      } else if (type === 'success') {
          modalbody = '<p><i class="icon icon-time1 text-blue" style="font-size: 80px;"></i></p><p style="font-size: 16px;">' + caret + '</p>';
      } else if (type === 'img') {
          title = '预览';
          modalbody = caret;
      }else{
          title = type;
          modalbody = caret;
      }
      var center = '<div id="msg" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="mymodal" style="display: block; padding-right: 17px;"><div class="modal-dialog modal-dialog-blue" role="document"><div class="modal-content"><div class="modal-header"><span class="h4">' + title + '</span></div><div class="modal-body text-center">' + modalbody + '</div><div class="modal-footer" style="text-align: center;"><button type="button" class="btn btn-sm border-blue" data-dismiss="modal">关闭</button></div></div></div></div>';
      if (type === 'img') {
          center = '<div id="msg" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="mymodal" style="display: block; padding-right: 17px;"><div class="modal-dialog modal-lg modal-dialog-blue" role="document"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="close"><span aria-hidden="true">×</span></button> <span class="h4">' + title + '</span></div><div class="modal-body text-center">' + modalbody + '</div></div></div></div>';
      }

      if ($('#msg').length > 0 && $('#msg:hidden').length < 1) {
          $('#msg').on('hidden.bs.modal', function (e) {
              $('#msg').remove();
              $('body').append(center);
              $('#msg').modal('show');
          });
          $('#msg').modal('hide');
      } else {
          $('#msg').remove();
          $('body').append(center);
          $('#msg').modal('show');
      }

  }
  function loading(type, caret){
      var title = '提示';
      var modalbody = caret||'<img src="static/admin/image/loading.gif" width="100"><p class="h1 text-white">加载中。。。</p>';
      var center = '<div id="loading" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="mymodal" style="display: block; padding-right: 17px;"><div class="modal-dialog modal-lg modal-dialog-blue" role="document"><div class=""><div class="modal-body text-center">' + modalbody + '</div></div></div></div>';
      if(type==="show"){
          if ($('#loading').length > 0 && $('#loading:hidden').length < 1) {
              $('#loading').on('hidden.bs.modal', function (e) {
                  $('#loading').remove();
                  $('body').append(center);
                  $('#loading').modal('show');
              });
              $('#loading').modal('hide');
          } else {
              $('#loading').remove();
              $('body').append(center);
              $('#loading').modal('show');
          }
          $('#loading .modal-dialog').css('top','50%');
          $('#loading .modal-dialog').css('margin-top',-($('#loading .modal-dialog').height()/2));
      }else if(type==="hide"){
          $('#loading').modal('hide');
      }else(
          console.log('loading()--参数错误！')
      )
      
  }
  $.extend({
      alerts: alert,
      modals: modal,
      loading: loading
  })
})(jQuery);
// 表单验证
(function ($) {
  $(function () {
      $("form").on("blur", "textarea,input,select", function () {
          var e = $(this);
          if (e.attr("data-validate")) {
              var $checkdata = e.attr("data-validate").split(",");
              var $checkvalue = e.val();
              var $checkstate = true;
              var $checktext = "";
              if ($checkvalue != "" || e.attr("data-validate").indexOf("required") >= 0) {
                  for (var i = 0; i < $checkdata.length; i++) {
                      var $checktype = $checkdata[i].split(":");
                      if (!$formcheck(e, $checktype[0], $checkvalue)) {
                          $checkstate = false;
                          $checktext = $checktext + "<span>" + $checktype[1] + "</span>  ";
                      }
                  }
              }
              if ($checkstate) {
                  e.closest(".form-group").removeClass("check-error");
                  e.closest(".form-group").find(".field").html('');
                  e.closest(".form-group").addClass("check-success");
                  // table表单验证
                  if (e.closest("table .form-group.pop").length > 0) {
                      e.popover('destroy');
                      e.removeData("toggle");
                      e.removeData("placement");
                      e.removeData("content");
                      e.removeData('trigger');
                      e.unbind();
                  }
              } else {
                  e.closest(".form-group").removeClass("check-success");
                  e.closest(".form-group").addClass("check-error");
                  e.closest(".form-group").find(".field").html($checktext);
                  // table表单验证
                  if (e.closest("table .form-group.pop").length > 0) {
                      // console.log($checktext);
                      e.popover('destroy');
                      e.data("toggle", "popover");
                      e.data("placement", "bottom");
                      e.data("content", $checktext);
                      e.data("html", true);
                      e.data("trigger", 'focus');
                      e.popover('show');
                  }
              }
          }
      });
      $formcheck = function (element, type, value) {
          // 验证多选select开始
          value=value||"";
          if(typeof(value)==="object"){
              return true;
          }
          // 验证多选select结束
          $pintu = value.replace(/(^\s*)|(\s*$)/g, "");
          switch (type) {
              case "required":
                  return /[^(^\s*)|(\s*$)]/.test($pintu);
                  break;
              case "chinese":
                  return /^[\u0391-\uFFE5]+$/.test($pintu);
                  break;
              case "number":
                  return /^([+-]?)\d*\.?\d+$/.test($pintu);
                  break;
              case "integer":
                  return /^-?[1-9]\d*$/.test($pintu);
                  break;
              case "plusinteger":
                  return /^[1-9]\d*$/.test($pintu);
                  break;
              case "unplusinteger":
                  return /^-[1-9]\d*$/.test($pintu);
                  break;
              case "znumber":
                  return /^[1-9]\d*|0$/.test($pintu);
                  break;
              case "fnumber":
                  return /^-[1-9]\d*|0$/.test($pintu);
                  break;
              case "double":
                  return /^[-\+]?\d+(\.\d+)?$/.test($pintu);
                  break;
              case "plusdouble":
                  return /^[+]?\d+(\.\d+)?$/.test($pintu);
                  break;
              case "unplusdouble":
                  return /^-[1-9]\d*\.\d*|-0\.\d*[1-9]\d*$/.test($pintu);
                  break;
              case "english":
                  return /^[A-Za-z]+$/.test($pintu);
                  break;
              case "username":
                  return /^[a-z]\w{3,}$/i.test($pintu);
                  break;
              case "mobile":
                  return /^\s*(15\d{9}|13\d{9}|14\d{9}|17\d{9}|18\d{9})\s*$/.test($pintu);
                  break;
              case "phone":
                  return /^((\(\d{2,3}\))|(\d{3}\-))?(\(0\d{2,3}\)|0\d{2,3}-)?[1-9]\d{6,7}(\-\d{1,4})?$/.test($pintu);
                  break;
              case "tel":
                  return /^((\(\d{3}\))|(\d{3}\-))?13[0-9]\d{8}?$|15[89]\d{8}?$|170\d{8}?$|147\d{8}?$/.test($pintu) || /^((\(\d{2,3}\))|(\d{3}\-))?(\(0\d{2,3}\)|0\d{2,3}-)?[1-9]\d{6,7}(\-\d{1,4})?$/.test($pintu);
                  break;
              case "email":
                  return /^[^@]+@[^@]+\.[^@]+$/.test($pintu);
                  break;
              case "url":
                  return /^https:|http:\/\/[A-Za-z0-9]+\.[A-Za-z0-9]+[\/=\?%\-&_~`@[\]\':+!]*([^<>\"\"])*$/.test($pintu);
                  break;
              case "ip":
                  return /^[\d\.]{7,15}$/.test($pintu);
                  break;
              case "qq":
                  return /^[1-9]\d{4,10}$/.test($pintu);
                  break;
              case "currency":
                  return /^\d+(\.\d+)?$/.test($pintu);
                  break;
              case "zipcode":
                  return /^[1-9]\d{5}$/.test($pintu);
                  break;
              case "chinesename":
                  return /^[\u0391-\uFFE5]{2,15}$/.test($pintu);
                  break;
              case "englishname":
                  return /^[A-Za-z]{1,161}$/.test($pintu);
                  break;
              case "age":
                  return /^[1-99]?\d*$/.test($pintu);
                  break;
              case "date":
                  return /^((((1[6-9]|[2-9]\d)\d{2})-(0?[13578]|1[02])-(0?[1-9]|[12]\d|3[01]))|(((1[6-9]|[2-9]\d)\d{2})-(0?[13456789]|1[012])-(0?[1-9]|[12]\d|30))|(((1[6-9]|[2-9]\d)\d{2})-0?2-(0?[1-9]|1\d|2[0-8]))|(((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|((16|[2468][048]|[3579][26])00))-0?2-29-))$/.test($pintu);
                  break;
              case "datetime":
                  return /^((((1[6-9]|[2-9]\d)\d{2})-(0?[13578]|1[02])-(0?[1-9]|[12]\d|3[01]))|(((1[6-9]|[2-9]\d)\d{2})-(0?[13456789]|1[012])-(0?[1-9]|[12]\d|30))|(((1[6-9]|[2-9]\d)\d{2})-0?2-(0?[1-9]|1\d|2[0-8]))|(((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|((16|[2468][048]|[3579][26])00))-0?2-29-)) (20|21|22|23|[0-1]?\d):[0-5]?\d:[0-5]?\d$/.test($pintu);
                  break;
              case "idcard":
                  return /^(\d{6})(\d{4})(\d{2})(\d{2})(\d{3})([0-9]|X)$/.test($pintu);
                  break;
              case "bigenglish":
                  return /^[A-Z]+$/.test($pintu);
                  break;
              case "smallenglish":
                  return /^[a-z]+$/.test($pintu);
                  break;
              case "color":
                  return /^#[0-9a-fA-F]{6}$/.test($pintu);
                  break;
              case "ascii":
                  return /^[\x00-\xFF]+$/.test($pintu);
                  break;
              case "md5":
                  return /^([a-fA-F0-9]{32})$/.test($pintu);
                  break;
              case "zip":
                  return /(.*)\.(rar|zip|7zip|tgz)$/.test($pintu);
                  break;
              case "img":
                  return /(.*)\.(jpg|gif|ico|jpeg|png)$/.test($pintu);
                  break;
              case "doc":
                  return /(.*)\.(doc|xls|docx|xlsx|pdf)$/.test($pintu);
                  break;
              case "mp3":
                  return /(.*)\.(mp3)$/.test($pintu);
                  break;
              case "video":
                  return /(.*)\.(rm|rmvb|wmv|avi|mp4|3gp|mkv)$/.test($pintu);
                  break;
              case "flash":
                  return /(.*)\.(swf|fla|flv)$/.test($pintu);
                  break;
              case "radio":
                  var radio = element.closest("form").find('input[name="' + element.attr("name") + '"]:checked').length;
                  return eval(radio == 1);
                  break;
              default:
                  var $test = type.split("#");
                  if ($test.length > 1) {
                      switch ($test[0]) {
                          case "compare":
                              return eval(Number($pintu) + $test[1]);
                              break;
                          case "regexp":
                              return new RegExp($test[1], "gi").test($pintu);
                              break;
                          case "length":
                              var $length;
                              if (element.attr("type") == "checkbox") {
                                  $length = element.closest("form").find('input[name="' + element.attr("name") + '"]:checked').length
                              } else {
                                  $length = $pintu.replace(/[\u4e00-\u9fa5]/g, "**").length
                              }
                              return eval($length + $test[1]);
                              break;
                          case "ajax":
                              var $getdata;
                              var $url = $test[1] + $pintu;
                              $.ajaxSetup({
                                  async: false
                              });
                              $.getJSON($url,
                                  function (data) {
                                      $getdata = data.getdata
                                  });
                              if ($getdata == "true") {
                                  return true
                              }
                              break;
                          case "repeat":
                              return $pintu == jQuery('input[name="' + $test[1] + '"]').eq(0).val();
                              break;
                          case "function":
                              return eval($test[1])(element);
                              break;
                          default:
                              return true;
                              break
                      }
                      break
                  } else {
                      return true;
                  }
          }
      }
      $("form").submit(function () {
          $(this).find("input[data-validate],textarea[data-validate],select[data-validate]").trigger("blur");
          var numError = $(this).find(".check-error").length;
          if (numError) {
              $(this).find(".check-error").first().find("input[data-validate],textarea[data-validate],select[data-validate]").first().focus().select();
              return false
          }
      });
  });
  function submits(){
      $(this).find("input[data-validate],textarea[data-validate],select[data-validate]").trigger("blur");
      var numError = $(this).find(".check-error").length;
      if (numError) {
          $(this).find(".check-error").first().find("input[data-validate],textarea[data-validate],select[data-validate]").first().focus().select();
          return false;
      }
      return true;
  }
  $.fn.extend({
      submits:submits
  })
})(jQuery);
// 分页
(function () {
  /**
   * <ul class="page" maxshowpageitem="5" pagelistcount="10"  id="page"></ul>
   * //$("#page").initPage(71,1,fun);
   */
  $.fn.extend({
      "initPage": function (listCount, currentPage, fun) {
          var maxshowpageitem = $(this).attr("maxshowpageitem");
          if (maxshowpageitem != null && maxshowpageitem > 0 && maxshowpageitem != "") {
              page.maxshowpageitem = maxshowpageitem;
          }
          var pagelistcount = $(this).attr("pagelistcount");
          if (pagelistcount != null && pagelistcount > 0 && pagelistcount != "") {
              page.pagelistcount = pagelistcount;
          }

          var pageId = $(this).attr("id");
          page.pageId = pageId;
          if (listCount < 0) {
              listCount = 0;
          }
          if (currentPage <= 0) {
              currentPage = 1;
          }
          page.setPageListCount(pageId, listCount, currentPage, fun);

      }
  });
  var page = {
      "maxshowpageitem": 5, //最多显示的页码个数
      "pagelistcount": 10, //每一页显示的内容条数
      /**
       * 初始化分页界面
       * @param listCount 列表总量
       */
      "initWithUl": function (pageId, listCount, currentPage) {

          var pageCount = 1;
          if (listCount > 0) {
              var pageCount = listCount % page.pagelistcount > 0 ? parseInt(listCount / page.pagelistcount) + 1 : parseInt(listCount / page.pagelistcount);
          }
          var appendStr = page.getPageListModel(pageCount, currentPage);
          $("#" + pageId).html(appendStr);
      },
      /**
       * 设置列表总量和当前页码
       * @param listCount 列表总量
       * @param currentPage 当前页码
       */
      "setPageListCount": function (pageId, listCount, currentPage, fun) {
          listCount = parseInt(listCount);
          currentPage = parseInt(currentPage);
          page.initWithUl(pageId, listCount, currentPage);
          page.initPageEvent(pageId, listCount, fun);

      },
      "initPageEvent": function (pageId, listCount, fun) {
          $("#" + pageId + ">li[class='pageItem']").on("click", function () {
              if (typeof fun == "function") {
                  fun($(this).attr("page-data"));
              }
              page.setPageListCount(pageId, listCount, $(this).attr("page-data"), fun);
          });
      },
      "getPageListModel": function (pageCount, currentPage) {
          var prePage = currentPage - 1;
          var nextPage = currentPage + 1;
          var prePageClass = "pageItem";
          var nextPageClass = "pageItem";
          if (prePage <= 0) {
              prePageClass = "pageItemDisable";
          }
          if (nextPage > pageCount) {
              nextPageClass = "pageItemDisable";
          }
          var appendStr = "";
          appendStr += "<li class='" + prePageClass + "' page-data='1' page-rel='firstpage'>首页</li>";
          appendStr += "<li class='" + prePageClass + "' page-data='" + prePage + "' page-rel='prepage'>&lt;</li>";
          var miniPageNumber = 1;
          if (currentPage - parseInt(page.maxshowpageitem / 2) > 0 && currentPage + parseInt(page.maxshowpageitem / 2) <= pageCount) {
              miniPageNumber = currentPage - parseInt(page.maxshowpageitem / 2);
          } else if (currentPage - parseInt(page.maxshowpageitem / 2) > 0 && currentPage + parseInt(page.maxshowpageitem / 2) > pageCount) {
              miniPageNumber = pageCount - page.maxshowpageitem + 1;
              if (miniPageNumber <= 0) {
                  miniPageNumber = 1;
              }
          }
          var showPageNum = parseInt(page.maxshowpageitem);
          if (pageCount < showPageNum) {
              showPageNum = pageCount
          }
          for (var i = 0; i < showPageNum; i++) {
              var pageNumber = miniPageNumber++;
              var itemPageClass = "pageItem";
              if (pageNumber == currentPage) {
                  itemPageClass = "pageItemActive";
              }

              appendStr += "<li class='" + itemPageClass + "' page-data='" + pageNumber + "' page-rel='itempage'>" + pageNumber + "</li>";
          }
          appendStr += "<li class='" + nextPageClass + "' page-data='" + nextPage + "' page-rel='nextpage'>&gt;</li>";
          appendStr += "<li class='" + nextPageClass + "' page-data='" + pageCount + "' page-rel='lastpage'>尾页</li>";
          return appendStr;

      }
  }
})(jQuery);
// json 转换 table 带合并单元格
(function ($) {
  /**
   * @param {any} data json数据
   * @param {any} keys 要合并行的列名
   * @param {any} types 每列展示类型 默认字符串 checkbox, input, 修改url, btn,lineChart
   * @returns 
   */
  function makeTable(data, keys, types) {
      types = types || "";
      // 判断data不是json数据返回空
      if (typeof (data) !== "object" || Object.prototype.toString.call(data).toLowerCase() != "[object array]" || !data.length) {
          return '';
      }
      // 判断keys不是数组返回空,数组顺序不能乱
      if (!(keys instanceof Array)) {
          return '';
      }
      var tr = "";
      var arr = '';// 存储首行合并字段内容
      //循环行
      for (var i = 0; i < data.length; i++) {
          // 判断是否合并行第一行 
          var t = true;
          if(arr==data[i][keys[0]]){
              t = false;
          }
          if (t) {
              arr=data[i][keys[0]]
              tr += "<tr>";
              for (key in data[i]) {
                  // 判断是否合并
                  var n = -1;
                  for(item in keys){
                      if(keys[item]===key){
                          n=item;
                          break;
                      }
                  }
                  if (n != -1) { //要合并的字段
                      // if (types[key] != null) { // 判断是否合并单元格
                      //     tr += '<td rowspan="' + countSubstr(data,data[i],keys,n) + '"> ' + ShowType(types[key], data[i][key], i) + ' </td>';
                      // } else {
                          tr += "<td rowspan='" + countSubstr(data,data[i],keys,n) + "'>" + data[i][key] + "</td>";
                      // }
                  } else {
                      // if (types[key] != null) { // 判断展示类型
                      //     tr += '<td> ' + ShowType(types[key], data[i][key], i) + ' </td>';
                      // } else {
                          if (keys.join(',').indexOf(key) == -1) {
                              tr += '<td>' + data[i][key] + '</td>';
                          }
                      // }
                  }
              }
              tr += "</tr>";
          } else {
              tr += "<tr>";
              for (key in data[i]) {
                  // if (types[key] != null) {
                  //     tr += '<td> ' + ShowType(types[key], data[i][key], i) + ' </td>';
                  // } else {
                      var nn = false;
                      var aa=[];// 要合并的字段
                      for(item in keys){
                          // 判断此行数据合并字段和上一行数据合并字段字段是否有不同
                          if(data[i][keys[item]]!=data[i-1][keys[item]]){
                              nn=true;
                              break;
                          }else{
                              aa.push(keys[item]);
                          }
                      }
                      // 判断要合并条件
                      if ((aa.join(',').indexOf(key) == -1 )|| nn) {
                          if(keys.join(',').indexOf(key) == -1){
                              tr += '<td>' + data[i][key] + '</td>';
                          }else if (aa.join(',').indexOf(key) == -1 && nn){
                              var n = -1;
                              for(item in keys){
                                  if(keys[item]===key){
                                      n=item;
                                      break;
                                  }
                              }
                              tr += '<td rowspan="' + countSubstr(data,data[i],keys,n) + '">' + data[i][key] + '</td>';
                          }
                      }
                  // }
              }
              tr += "</tr>";
          }
      }
      $(this).html(tr);
      // 初始化图表
      var Chartis = 0;
      var keyname = "";
      for (key in types) {
          if (types[key] == "lineChart") {
              Chartis = 1;
              keyname = key;
          }
      }
      if (Chartis == 1) {
          for (var i = 0; i < data.length; i++) {
              new ch('c' + i, data[i][keyname].date, data[i][keyname].data);
          }
      }

  };
  // 查询字符串出现次数
  /**
   * 
   * 
   * @param {any} str 数据集
   * @param {any} substr 当前行数据
   * @param {any} keys 合并字段
   * @param {any} n 合并字段位置
   * @returns 
   */
  function countSubstr(str, substr,keys,n) {
      var p = [];
      // console.log("-----------------");
      for(var i=0;i<=n;i++){
          for(itme in str){
              // console.log(itme)
              // console.log(str[itme][keys[i]],substr[keys[i]]);
              if(str[itme][keys[i]]==substr[keys[i]]){
                  p.push(str[itme])
              }
          }  
          str=p;
          p=[];
          // console.log(str);
      }
      // console.log(p);
      return str.length;
      // var str = JSON.stringify(str);
      // var count;
      // var reg = "/" + substr + "/gi"; // 查找忽略大小写
      // reg = eval(reg);
      // if (str.match(reg) == null) {
      //     return 0;
      // } else {
      //     count = str.match(reg).length;
      // }
      // return count;
  }
  // 折线图
  function ch(id,names, time, datas) {
      var d = [];
      datas.forEach(function(item,i){
          d.push({name: names[i],type: 'line',data: item});
      })
      var mychart = echarts.init(document.getElementById(id));
      var open = {
          tooltip: {
              trigger: 'axis'
          },
          color: ['#0099FF','#990000','#CC9900','#FF00CC'],
          height: 120,
          grid: {
              top: 10
          },
          xAxis: {
              type: 'category',
              bounderyGap: false,
              data: time
          },
          yAxis: {
              type: 'value',
              axisLabel: {
                  formatter: '{value}元'
              },
              min: function (value) {
                  return value.min - 20;
              }
          },
          series: d
      }
      mychart.setOption(open);
  }
  // 显示类型
  function ShowType(key, data, i) {
      switch (key) {
          case "btn":
              return '<button type="button" class="btn btn-xs border-orange" data-modal="' + data + '">修 改</button>';
              break;
          case "lineChart":
              return '<div id="c' + i + '" style="height: 160px; min-width: 800px;"></div>';
              break;
          default:
              return '<a href="' + key + data + '" class="btn btn-xs border-orange">修 改</a>';
              break;
      }
  }
  $.fn.extend({
      json2table: makeTable,
      ch: ch
  });
})(jQuery);
// 金钱数字转中文大写
(function ($) {
  /**
   * 金钱数字转中文大写
   * 不传n值默认获取选择的值
   * @param {any} n 
   * @returns 
   */
  function smalltoBIG(n) {
      var n = n || $(this).text();
      console.log(parseFloat(n))
      if (isNaN(parseFloat(n))) {
          return '类型错误，不是数字类型！';
      }
      var fraction = ['角', '分'];
      var digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
      var unit = [
          ['元', '万', '亿'],
          ['', '拾', '佰', '仟']
      ];
      var head = n < 0 ? '欠' : '';
      n = Math.abs(n);

      var s = '';

      for (var i = 0; i < fraction.length; i++) {
          s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
      }
      s = s || '整';
      n = Math.floor(n);

      for (var i = 0; i < unit[0].length && n > 0; i++) {
          var p = '';
          for (var j = 0; j < unit[1].length && n > 0; j++) {
              p = digit[n % 10] + unit[1][j] + p;
              n = Math.floor(n / 10);
          }
          s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
      }
      $(this).text(head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整'));
  }
  $.fn.extend({
      smalltoBIG: smalltoBIG
  })
})(jQuery);
// 可以模糊搜索删选下拉框内容
(function ($) {
  // a case insensitive jQuery :contains selector
  $.expr[":"].searchableSelectContains = $.expr.createPseudo(function (arg) {
      return function (elem) {
          return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
      };
  });

  $.searchableSelect = function (element, options) {
      this.element = element;
      this.options = options || {};
      this.init();

      var _this = this;

      this.searchableElement.click(function (event) {
          // event.stopPropagation();
          _this.show();
      }).on('keydown', function (event) {
          if (event.which === 13 || event.which === 40 || event.which == 38) {
              event.preventDefault();
              _this.show();
          }
      });

      $(document).on('click', null, function (event) {
          if (_this.searchableElement.has($(event.target)).length === 0)
              _this.hide();
      });

      this.input.on('keydown', function (event) {
          event.stopPropagation();
          if (event.which === 13) { //enter
              event.preventDefault();
              _this.selectCurrentHoverItem();
              _this.hide();
          } else if (event.which == 27) { //ese
              _this.hide();
          } else if (event.which == 40) { //down
              _this.hoverNextItem();
          } else if (event.which == 38) { //up
              _this.hoverPreviousItem();
          }
      }).on('keyup', function (event) {
          if (event.which != 13 && event.which != 27 && event.which != 38 && event.which != 40)
              _this.filter();
      })
  }

  var $sS = $.searchableSelect;

  $sS.fn = $sS.prototype = {
      version: '0.0.1'
  };

  $sS.fn.extend = $sS.extend = $.extend;

  $sS.fn.extend({
      init: function () {
          var _this = this;
          this.element.hide();

          this.searchableElement = $('<div tabindex="0" class="searchable-select"></div>');
          this.holder = $('<div class="searchable-select-holder"></div>');
          this.dropdown = $('<div class="searchable-select-dropdown searchable-select-hide"></div>');
          this.input = $('<input type="text" class="searchable-select-input" />');
          this.items = $('<div class="searchable-select-items"></div>');
          this.caret = $('<span class="searchable-select-caret"></span>');

          this.scrollPart = $('<div class="searchable-scroll"></div>');
          this.hasPrivious = $('<div class="searchable-has-privious">...</div>');
          this.hasNext = $('<div class="searchable-has-next">...</div>');

          this.hasNext.on('mouseenter', function () {
              _this.hasNextTimer = null;

              var f = function () {
                  var scrollTop = _this.items.scrollTop();
                  _this.items.scrollTop(scrollTop + 20);
                  _this.hasNextTimer = setTimeout(f, 50);
              }

              f();
          }).on('mouseleave', function (event) {
              clearTimeout(_this.hasNextTimer);
          });

          this.hasPrivious.on('mouseenter', function () {
              _this.hasPriviousTimer = null;

              var f = function () {
                  var scrollTop = _this.items.scrollTop();
                  _this.items.scrollTop(scrollTop - 20);
                  _this.hasPriviousTimer = setTimeout(f, 50);
              }

              f();
          }).on('mouseleave', function (event) {
              clearTimeout(_this.hasPriviousTimer);
          });

          this.dropdown.append(this.input);
          this.dropdown.append(this.scrollPart);

          this.scrollPart.append(this.hasPrivious);
          this.scrollPart.append(this.items);
          this.scrollPart.append(this.hasNext);

          this.searchableElement.append(this.caret);
          this.searchableElement.append(this.holder);
          this.searchableElement.append(this.dropdown);
          this.element.after(this.searchableElement);

          this.buildItems();
          this.setPriviousAndNextVisibility();
      },

      filter: function () {
          var text = this.input.val();
          this.items.find('.searchable-select-item').addClass('searchable-select-hide');
          this.items.find('.searchable-select-item:searchableSelectContains(' + text + ')').removeClass('searchable-select-hide');
          if (this.currentSelectedItem.hasClass('searchable-select-hide') && this.items.find('.searchable-select-item:not(.searchable-select-hide)').length > 0) {
              this.hoverFirstNotHideItem();
          }

          this.setPriviousAndNextVisibility();
          this.items.find('.i').addClass('searchable-select-hide');
      },

      hoverFirstNotHideItem: function () {
          this.hoverItem(this.items.find('.searchable-select-item:not(.searchable-select-hide)').first());
      },

      selectCurrentHoverItem: function () {
          if (!this.currentHoverItem.hasClass('searchable-select-hide'))
              this.selectItem(this.currentHoverItem);
      },

      hoverPreviousItem: function () {
          if (!this.hasCurrentHoverItem())
              this.hoverFirstNotHideItem();
          else {
              var prevItem = this.currentHoverItem.prevAll('.searchable-select-item:not(.searchable-select-hide):first')
              if (prevItem.length > 0)
                  this.hoverItem(prevItem);
          }
      },

      hoverNextItem: function () {
          if (!this.hasCurrentHoverItem())
              this.hoverFirstNotHideItem();
          else {
              var nextItem = this.currentHoverItem.nextAll('.searchable-select-item:not(.searchable-select-hide):first')
              if (nextItem.length > 0)
                  this.hoverItem(nextItem);
          }
      },

      buildItems: function () {
          var _this = this;
          this.element.find('option').each(function () {
              var item = $('<div class="searchable-select-item" data-value="' + $(this).attr('value') + '">' + $(this).text() + '</div>');

              if (this.selected) {
                  _this.selectItem(item);
                  _this.hoverItem(item);
              }

              item.on('mouseenter', function () {
                  $(this).addClass('hover');
              }).on('mouseleave', function () {
                  $(this).removeClass('hover');
              }).click(function (event) {
                  event.stopPropagation();
                  _this.selectItem($(this));
                  _this.hide();
              });

              _this.items.append(item);
          });

          this.items.on('scroll', function () {
              _this.setPriviousAndNextVisibility();
          })
      },
      show: function () {
          this.dropdown.removeClass('searchable-select-hide');
          this.input.focus();
          this.status = 'show';
          this.setPriviousAndNextVisibility();
      },

      hide: function () {
          if (!(this.status === 'show'))
              return;

          if (this.items.find(':not(.searchable-select-hide)').length === 0)
             {
              // this.input.val('');
             } 
          this.dropdown.addClass('searchable-select-hide');
          this.searchableElement.trigger('focus');
          this.status = 'hide';
      },

      hasCurrentSelectedItem: function () {
          return this.currentSelectedItem && this.currentSelectedItem.length > 0;
      },

      selectItem: function (item) {
          if (this.hasCurrentSelectedItem())
              this.currentSelectedItem.removeClass('selected');

          this.currentSelectedItem = item;
          item.addClass('selected');

          this.hoverItem(item);

          this.holder.text(item.text());
          var value = item.data('value');
          this.holder.data('value', value);
          this.element.val(value);

          if (this.options.afterSelectItem) {
              this.options.afterSelectItem.apply(this);
          }
      },

      hasCurrentHoverItem: function () {
          return this.currentHoverItem && this.currentHoverItem.length > 0;
      },

      hoverItem: function (item) {
          if (this.hasCurrentHoverItem())
              this.currentHoverItem.removeClass('hover');

          if (item.outerHeight() + item.position().top > this.items.height())
              this.items.scrollTop(this.items.scrollTop() + item.outerHeight() + item.position().top - this.items.height());
          else if (item.position().top < 0)
              this.items.scrollTop(this.items.scrollTop() + item.position().top);

          this.currentHoverItem = item;
          item.addClass('hover');
      },

      setPriviousAndNextVisibility: function () {
          if (this.items.scrollTop() === 0) {
              this.hasPrivious.addClass('searchable-select-hide');
              this.scrollPart.removeClass('has-privious');
          } else {
              this.hasPrivious.removeClass('searchable-select-hide');
              this.scrollPart.addClass('has-privious');
          }

          if (this.items.scrollTop() + this.items.innerHeight() >= this.items[0].scrollHeight) {
              this.hasNext.addClass('searchable-select-hide');
              this.scrollPart.removeClass('has-next');
          } else {
              this.hasNext.removeClass('searchable-select-hide');
              this.scrollPart.addClass('has-next');
          }
      }
  });

  $.fn.searchableSelect = function (options) {
      this.each(function () {
          var sS = new $sS($(this), options);
      });

      return this;
  };

})(jQuery);
// 打印
// oper数字或字母
(function ($) {
  $('body').delegate('[data-print]', 'click', function (e) {
      var oper = $(this).data('print');
      if (oper.toString().length === 1) {
          var bdhtml = window.document.body.innerHTML;
          var sprnstr = "<!--starprnstr" + oper + "-->";
          var eprnstr = "<!--endprnstr" + oper + "-->";
          var prnhtml = bdhtml.substring(bdhtml.indexOf(sprnstr) + 18);
          prnhtml = prnhtml.substring(0, prnhtml.indexOf(eprnstr));
          window.document.body.innerHTML = prnhtml;
          window.print();
          window.document.body.innerHTML = bdhtml;
          return false;
      } else {
          window.print();
      }
  });
})(jQuery);
/* ========================================================================
* Bootstrap: dropdown.js v3.3.7
* http://getbootstrap.com/javascript/#dropdowns
* ========================================================================
* Copyright 2011-2016 Twitter, Inc.
* Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
* ======================================================================== */
(function ($) {
  'use strict';

  // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop'
  var toggle = '[data-toggle="dropdown"]'
  var Dropdown = function (element) {
      $(element).on('click.bs.dropdown', this.toggle)
  }

  Dropdown.VERSION = '3.3.7'

  function getParent($this) {
      var selector = $this.attr('data-target')

      if (!selector) {
          selector = $this.attr('href')
          selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
      }

      var $parent = selector && $(selector)

      return $parent && $parent.length ? $parent : $this.parent()
  }

  function clearMenus(e) {
      if (e && e.which === 3) return
      $(backdrop).remove()
      $(toggle).each(function () {
          var $this = $(this)
          var $parent = getParent($this)
          var relatedTarget = {
              relatedTarget: this
          }

          if (!$parent.hasClass('open')) return

          if (e && e.type == 'click' && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target)) return

          $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))

          if (e.isDefaultPrevented()) return

          $this.attr('aria-expanded', 'false')
          $parent.removeClass('open').trigger($.Event('hidden.bs.dropdown', relatedTarget))
      })
  }

  Dropdown.prototype.toggle = function (e) {
      var $this = $(this)

      if ($this.is('.disabled, :disabled')) return

      var $parent = getParent($this)
      var isActive = $parent.hasClass('open')

      clearMenus()

      if (!isActive) {
          if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
              // if mobile we use a backdrop because click events don't delegate
              $(document.createElement('div'))
                  .addClass('dropdown-backdrop')
                  .insertAfter($(this))
                  .on('click', clearMenus)
          }

          var relatedTarget = {
              relatedTarget: this
          }
          $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))

          if (e.isDefaultPrevented()) return

          $this
              .trigger('focus')
              .attr('aria-expanded', 'true')

          $parent
              .toggleClass('open')
              .trigger($.Event('shown.bs.dropdown', relatedTarget))
      }

      return false
  }

  Dropdown.prototype.keydown = function (e) {
      if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return

      var $this = $(this)

      e.preventDefault()
      e.stopPropagation()

      if ($this.is('.disabled, :disabled')) return

      var $parent = getParent($this)
      var isActive = $parent.hasClass('open')

      if (!isActive && e.which != 27 || isActive && e.which == 27) {
          if (e.which == 27) $parent.find(toggle).trigger('focus')
          return $this.trigger('click')
      }

      var desc = ' li:not(.disabled):visible a'
      var $items = $parent.find('.dropdown-menu' + desc)

      if (!$items.length) return

      var index = $items.index(e.target)

      if (e.which == 38 && index > 0) index-- // up
          if (e.which == 40 && index < $items.length - 1) index++ // down
              if (!~index) index = 0

      $items.eq(index).trigger('focus')
  }

  // DROPDOWN PLUGIN DEFINITION
  // ==========================

  function Plugin(option) {
      return this.each(function () {
          var $this = $(this)
          var data = $this.data('bs.dropdown')

          if (!data) $this.data('bs.dropdown', (data = new Dropdown(this)))
          if (typeof option == 'string') data[option].call($this)
      })
  }

  var old = $.fn.dropdown

  $.fn.dropdown = Plugin
  $.fn.dropdown.Constructor = Dropdown


  // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
      $.fn.dropdown = old
      return this
  }

  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================

  $(document)
      .on('click.bs.dropdown.data-api', clearMenus)
      .on('click.bs.dropdown.data-api', '.dropdown form', function (e) {
          e.stopPropagation()
      })
      .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
      .on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown)
      .on('keydown.bs.dropdown.data-api', '.dropdown-menu', Dropdown.prototype.keydown)

})(jQuery);
// 时间格式化
Date.prototype.format= function(format){
  format=format||"yyyy-MM-dd hh:mm:ss"
  var args = {
      "M+":this.getMonth() + 1,
      "d+":this.getDate(),
      "h+":this.getHours(),
      "m+":this.getMinutes(),
      "s+":this.getSeconds(),
      "q+":Math.floor((this.getMonth()+3)/3),
      "s":this.getMilliseconds()
  };
  if(/(y+)/.test(format)) {
      format = format.replace(RegExp.$1,(this.getFullYear() + "").substr(4 - RegExp.$1.length));
  }
  for(var i in args){
      var n = args[i];
      if(new RegExp("(" + i + ")").test(format)) {
          format = format.replace(RegExp.$1,RegExp.$1.length == 1 ? n : ("00" + n).substr(("" + n).length));
      }
  }
  return format;
};
// 兼容火狐href="javaScrip:void(0)"方法
(function($){
  $("[href='javaScrip:void(0)']").on("click",function(){
      return false;
  })
})(jQuery);
//   错误日志
// window.onerror = function(a,b,c,d,e){
//     (new Image).src =`/m?p=s${location.href}&a=${a}&b=${b}&c=${c}&d=${d}&e=${e.stack}`
// }