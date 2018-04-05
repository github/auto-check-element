// Throttled Input event
//
// Delays firing `input` event until user is done typing.
//
// Details
//
// * Never fires while a key is down, waits for the next keyup.
//     NOTE: Native OSX text fields won't repeat keys. FF will repeat key while
//           held down.
// * Never fires for selection changes
//     (pressing left or right keys to move the cursor)
//

var throttledInputEvents = new WeakMap();

function schedule(element) {
  var events = throttledInputEvents.get(element);
  if (events.timer != null) clearTimeout(events.timer);

  events.timer = setTimeout(function () {
    if (events.timer != null) events.timer = null;
    events.inputed = false;
    events.listener.call(null, element);
  }, events.wait);
}

function onKeydownInput(event) {
  var events = throttledInputEvents.get(event.currentTarget);
  events.keypressed = true;
  if (events.timer != null) {
    clearTimeout(events.timer);
  }
}

function onKeyupInput(event) {
  var events = throttledInputEvents.get(event.currentTarget);
  events.keypressed = false;
  if (events.inputed) {
    schedule(event.currentTarget);
  }
}

function onInputInput(event) {
  var events = throttledInputEvents.get(event.currentTarget);
  events.inputed = true;
  if (!events.keypressed) {
    schedule(event.currentTarget);
  }
}

function addThrottledInputEventListener(target, listener) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  throttledInputEvents.set(target, {
    keypressed: false,
    inputed: false,
    timer: undefined,
    listener: listener,
    wait: options.wait != null ? options.wait : 100
  });

  target.addEventListener('keydown', onKeydownInput);
  target.addEventListener('keyup', onKeyupInput);
  target.addEventListener('input', onInputInput);
}

function removeThrottledInputEventListener(target, listener) {
  target.removeEventListener('keydown', onKeydownInput);
  target.removeEventListener('keyup', onKeyupInput);
  target.removeEventListener('input', onInputInput);

  var events = throttledInputEvents.get(target);
  if (events) {
    if (events.timer != null && events.listener === listener) {
      clearTimeout(events.timer);
    }
    throttledInputEvents.delete(target);
  }
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

function _CustomElement() {
  return Reflect.construct(HTMLElement, [], this.__proto__.constructor);
}
Object.setPrototypeOf(_CustomElement.prototype, HTMLElement.prototype);
Object.setPrototypeOf(_CustomElement, HTMLElement);

var requests = new WeakMap();
var previousValues = new WeakMap();

var XHRError = function (_Error) {
  inherits(XHRError, _Error);

  function XHRError(status, responseText, contentType) {
    classCallCheck(this, XHRError);

    var _this = possibleConstructorReturn(this, (XHRError.__proto__ || Object.getPrototypeOf(XHRError)).call(this));

    _this.status = status;
    _this.responseText = responseText;
    _this.contentType = contentType;
    return _this;
  }

  return XHRError;
}(Error);

/*
 * Enhancement to a input element that validates the input against
 * a endpoint. Provide a URL and a CSRF token and the autocheck
 * component will show validation confirmations and validation errors.
 *
 * The endpoint should return:
 *  - a 200 HTTP status code if the provided value if valid.
 *  - a 422 HTTP status code if the provided value is invalid.
 *  - a optional error message in the body and a `Content-Type` header
 *    with a value of `text/html; fragment`.
 *
 * <auto-check src='/signup_check/username' csrf="<%= authenticity_token_for("/signup_check/username") %>">
 *  <input></input>
 * </auto-check>
 *
 * The component will attach event listeners to the first input child element.
 */


var AutoCheckElement = function (_CustomElement2) {
  inherits(AutoCheckElement, _CustomElement2);

  function AutoCheckElement() {
    classCallCheck(this, AutoCheckElement);

    var _this2 = possibleConstructorReturn(this, (AutoCheckElement.__proto__ || Object.getPrototypeOf(AutoCheckElement)).call(this));

    _this2.boundCheck = _this2.check.bind(_this2);
    return _this2;
  }

  createClass(AutoCheckElement, [{
    key: 'connectedCallback',
    value: function connectedCallback() {
      var input = this.querySelector('input');
      if (input instanceof HTMLInputElement) {
        this.input = input;
        this.input.addEventListener('change', this.boundCheck);
        addThrottledInputEventListener(this.input, this.boundCheck, { wait: 300 });
      }
    }
  }, {
    key: 'disconnectedCallback',
    value: function disconnectedCallback() {
      if (this.input) {
        this.input.removeEventListener('change', this.boundCheck);
        removeThrottledInputEventListener(this.input, this.boundCheck);
      }
    }
  }, {
    key: 'check',
    value: async function check() {
      if (!this.src) {
        throw new Error('missing src');
      }
      if (!this.csrf) {
        throw new Error('missing csrf');
      }

      var body = new FormData();
      body.append('authenticity_token', this.csrf); // eslint-disable-line github/authenticity-token
      body.append('value', this.input.value);

      var id = body.entries ? [].concat(toConsumableArray(body.entries())).sort().toString() : null;
      if (id && id === previousValues.get(this.input)) return;
      previousValues.set(this.input, id);

      this.input.dispatchEvent(new CustomEvent('autocheck:send', { detail: { body: body }, bubbles: true, cancelable: true }));

      if (!this.input.value.trim()) {
        this.input.dispatchEvent(new CustomEvent('autocheck:complete', { bubbles: true, cancelable: true }));
        return;
      }

      try {
        this.dispatchEvent(new CustomEvent('loadstart'));
        var data = await performCheck(this.input, body, this.src);
        this.dispatchEvent(new CustomEvent('load'));

        var warning = data ? data.trim() : null;
        this.input.dispatchEvent(new CustomEvent('autocheck:success', { detail: { warning: warning }, bubbles: true, cancelable: true }));
      } catch (error) {
        this.dispatchEvent(new CustomEvent('error'));
        this.input.dispatchEvent(new CustomEvent('autocheck:error', { detail: { message: errorMessage(error) }, bubbles: true, cancelable: true }));
      } finally {
        this.dispatchEvent(new CustomEvent('loadend'));
        this.input.dispatchEvent(new CustomEvent('autocheck:complete', { bubbles: true, cancelable: true }));
      }
    }
  }, {
    key: 'src',
    get: function get$$1() {
      var src = this.getAttribute('src');
      if (!src) return '';

      var link = this.ownerDocument.createElement('a');
      link.href = src;
      return link.href;
    },
    set: function set$$1(value) {
      this.setAttribute('src', value);
    }
  }, {
    key: 'csrf',
    get: function get$$1() {
      return this.getAttribute('csrf') || '';
    },
    set: function set$$1(value) {
      this.setAttribute('csrf', value);
    }
  }]);
  return AutoCheckElement;
}(_CustomElement);

function errorMessage(error) {
  if (error.status === 422 && error.responseText) {
    if (error.contentType.includes('text/html; fragment')) {
      return error.responseText;
    }
  }
}

function performCheck(input, body, url) {
  var pending = requests.get(input);
  if (pending) pending.abort();

  var clear = function clear() {
    return requests.delete(input);
  };

  var xhr = new XMLHttpRequest();
  requests.set(input, xhr);

  xhr.open('POST', url, true);
  xhr.setRequestHeader('Accept', 'text/html; fragment');
  var result = send(xhr, body);
  result.then(clear, clear);
  return result;
}

function send(xhr, body) {
  return new Promise(function (resolve, reject) {
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new XHRError(xhr.status, xhr.responseText, xhr.getResponseHeader('Content-Type')));
      }
    };
    xhr.onerror = function () {
      reject(new XHRError(xhr.status, xhr.responseText, xhr.getResponseHeader('Content-Type')));
    };
    xhr.send(body);
  });
}

if (!window.customElements.get('auto-check')) {
  window.AutoCheckElement = AutoCheckElement;
  window.customElements.define('auto-check', AutoCheckElement);
}
