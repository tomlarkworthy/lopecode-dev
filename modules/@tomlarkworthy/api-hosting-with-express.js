const _1zc8u1 = function _1(md){return(
md`# Using Express Router for [Serverside Cells](https://observablehq.com/@tomlarkworthy/serverside-cells)

The notebook adapts the [Express](https://expressjs.com/) web framework for use in a [serverside cell](https://observablehq.com/@tomlarkworthy/serverside-cells). So now you can build idiomatic Javascript servers right from the comfort of an Observable notebook!

You can grab everything you need in one go with

~~~js
    import {Router, handleWithExpress, deploy} from '@tomlarkworthy/api-hosting-with-express'
~~~`
)};
const _jtl6q7 = function _2(md){return(
md`### Import the browserified [pillarjs/router](https://github.com/pillarjs/router)
which is an extraction of Express' routing logic
`
)};
const _1hi9ylw = function _Router(require){return(
require('express-router-browserify@3.0.1')
)};
const _1um3doo = function _4(md){return(
md`### Write your app like a normal [Express](https://expressjs.com/) app`
)};
const _1ixf98c = function _app(Router)
{
  const app = Router();
  // Horay! CORS middleware! As this is the first route all routes will have CORS headers added
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next() // Let a following route actually do the response
  });
  
  app.get('/response', (req, res) => {
    res.json(req);
  });
  
  app.get('/setResponseHeader/:header/:value', (req, res) => {
    res.header(req.params.header, req.params.value)
    res.header('Access-Control-Expose-Headers', `${req.params.header}`) // can also do '*'
    res.end();
  });
  
  app.get('/throw', (req, res) => {
    throw new Error("Throwing example")
  });
  
  
  app.get('/asyncthrow', async (req, res) => {
    throw new Error("Throwing example")
  });
  
  // If nothing has done a response, we have fallen through to this middleware, which will return a default
  app.use((req, res) => {
    res.status(404).end();
  }); 
  return app
};
const _16j71og = function _7(md){return(
md`## _deploy_ to a [serverside cell](https://observablehq.com/@tomlarkworthy/serverside-cells)
There are some important gotchas to apply to the incoming request to make it work with serverside cells. So that boilerplate is done by the *handleWithExpress* function. 
`
)};
const _12qp4w9 = function _handleWithExpress(cookie_signature,cookie){return(
app => async (req, res, context) => {
  req.app = app; // Note, annoying gotcha
  req.context = context; // we tuck the context into the request so handlers can access e.g. secrets

  // https://github.com/expressjs/express/blob/508936853a6e311099c9985d4c11a4b1b8f6af07/lib/response.js#L831
  res.cookie = function(name, value, options) {
    var opts = options || {};
    var secret = this.req.secret;
    var signed = opts.signed;

    if (signed && !secret) {
      throw new Error('cookieParser("secret") required for signed cookies');
    }

    var val =
      typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value);

    if (signed) {
      val = 's:' + cookie_signature.sign(val, secret);
    }

    if ('maxAge' in opts) {
      opts.expires = new Date(Date.now() + opts.maxAge);
      opts.maxAge /= 1000;
    }

    if (opts.path == null) {
      opts.path = '/';
    }
    opts.encode = encodeURIComponent;
    return this.header('Set-Cookie', cookie.serialize(name, String(val), opts));
  };
  // https://github.com/expressjs/express/blob/508936853a6e311099c9985d4c11a4b1b8f6af07/lib/response.js#L801
  res.clearCookie = function(name, options) {
    var opts = { path: '/', ...options, expires: new Date(1) };
    this.cookie(name, '', opts);
  };
  try {
    await app(req, res, err =>
      err ? res.status(500).send(err.message) : res.status(404).end()
    );
  } catch (err) {
    req.status(500).send(err.message);
  }
}
)};
const _1tj7uye = function _9(md){return(
md`### Now deploy

`
)};
const _vomtxh = function _test_router_endpoint(deploy,handleWithExpress,app)
{
  return deploy("test_router_endpoint", handleWithExpress(app), {
    cell: "test_router_endpoint"
  })
};
const _1mlnoob = async function _cookie_signature(require,FileAttachment){return(
require(await FileAttachment(
  "cookie-signature-1.1.0.js"
).url())
)};
const _3y5f2f = function _cookie()
{
  /**
   * Module variables.
   * @private
   */
  var decode = decodeURIComponent;
  var encode = encodeURIComponent;
  var pairSplitRegExp = /; */;

  /**
   * RegExp to match field-content in RFC 7230 sec 3.2
   *
   * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
   * field-vchar   = VCHAR / obs-text
   * obs-text      = %x80-FF
   */
  var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
  /**
   * Parse a cookie header.
   *
   * Parse the given cookie header string into an object
   * The object has the various cookies as keys(names) => values
   *
   * @param {string} str
   * @param {object} [options]
   * @return {object}
   * @public
   */

  function parse(str, options) {
    if (typeof str !== 'string') {
      throw new TypeError('argument str must be a string');
    }

    var obj = {};
    var opt = options || {};
    var pairs = str.split(pairSplitRegExp);
    var dec = opt.decode || decode;

    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      var eq_idx = pair.indexOf('=');

      // skip things that don't look like key=value
      if (eq_idx < 0) {
        continue;
      }

      var key = pair.substr(0, eq_idx).trim();
      var val = pair.substr(++eq_idx, pair.length).trim();

      // quoted values
      if ('"' == val[0]) {
        val = val.slice(1, -1);
      }

      // only assign once
      if (undefined == obj[key]) {
        obj[key] = tryDecode(val, dec);
      }
    }

    return obj;
  }
  /**
   * Serialize data into a cookie header.
   *
   * Serialize the a name value pair into a cookie string suitable for
   * http headers. An optional options object specified cookie parameters.
   *
   * serialize('foo', 'bar', { httpOnly: true })
   *   => "foo=bar; httpOnly"
   *
   * @param {string} name
   * @param {string} val
   * @param {object} [options]
   * @return {string}
   * @public
   */
  function serialize(name, val, options) {
    var opt = options || {};
    var enc = opt.encode || encode;

    if (typeof enc !== 'function') {
      throw new TypeError('option encode is invalid');
    }

    if (!fieldContentRegExp.test(name)) {
      throw new TypeError('argument name is invalid');
    }

    var value = enc(val);

    if (value && !fieldContentRegExp.test(value)) {
      throw new TypeError('argument val is invalid');
    }

    var str = name + '=' + value;

    if (null != opt.maxAge) {
      var maxAge = opt.maxAge - 0;

      if (isNaN(maxAge) || !isFinite(maxAge)) {
        throw new TypeError('option maxAge is invalid');
      }

      str += '; Max-Age=' + Math.floor(maxAge);
    }

    if (opt.domain) {
      if (!fieldContentRegExp.test(opt.domain)) {
        throw new TypeError('option domain is invalid');
      }

      str += '; Domain=' + opt.domain;
    }

    if (opt.path) {
      if (!fieldContentRegExp.test(opt.path)) {
        throw new TypeError('option path is invalid');
      }

      str += '; Path=' + opt.path;
    }

    if (opt.expires) {
      if (typeof opt.expires.toUTCString !== 'function') {
        throw new TypeError('option expires is invalid');
      }

      str += '; Expires=' + opt.expires.toUTCString();
    }

    if (opt.httpOnly) {
      str += '; HttpOnly';
    }

    if (opt.secure) {
      str += '; Secure';
    }

    if (opt.sameSite) {
      var sameSite =
        typeof opt.sameSite === 'string'
          ? opt.sameSite.toLowerCase()
          : opt.sameSite;

      switch (sameSite) {
        case true:
          str += '; SameSite=Strict';
          break;
        case 'lax':
          str += '; SameSite=Lax';
          break;
        case 'strict':
          str += '; SameSite=Strict';
          break;
        case 'none':
          str += '; SameSite=None';
          break;
        default:
          throw new TypeError('option sameSite is invalid');
      }
    }

    return str;
  }

  /**
   * Try decoding a string using a decoding function.
   *
   * @param {string} str
   * @param {function} decode
   * @private
   */

  function tryDecode(str, decode) {
    try {
      return decode(str);
    } catch (e) {
      return str;
    }
  }
  return {
    serialize,
    parse
  };
};
const _1t4dd6p = function _13(md){return(
md` ## Lets test it works!
`
)};
const _15csgpq = function _ci($0){return(
$0
)};
const _1us5g34 = (G, _) => G.input(_);
const _ucegoc = function _15(ci,test_router_endpoint,expect){return(
ci.test(
  "/response route returns payload containing Response keys",
  async () => {
    const response = await (await fetch(
      test_router_endpoint.href + "/response"
    )).json();
    expect(Object.keys(response)).toEqual(
      expect.arrayContaining([
        "url",
        "method",
        "query",
        "params",
        "headers",
        "ip",
        "context"
      ])
    );
  }
)
)};
const _1vf54xs = function _16(ci,test_router_endpoint,expect){return(
ci.test("/setResponseHeader returns response with response header set", async () => {
  const response = await fetch(test_router_endpoint.href + "/setResponseHeader/foo/bar")
  expect(response.headers.get('foo')).toBe("bar");
})
)};
const _1urb8zh = function _17(ci,expect,test_router_endpoint){return(
ci.test("default route is 404", async () => {
  expect((await fetch(test_router_endpoint.href)).status).toBe(404)
})
)};
const _dsx6ob = function _18(ci,expect,test_router_endpoint){return(
ci.test("/throw route is 500", async () => {
  expect((await fetch(test_router_endpoint.href + "/throw")).status).toBe(500);
})
)};
const _1noaep0 = function _19(ci,expect,test_router_endpoint){return(
ci.test("/asyncthrow route is 500", async () => {
  expect((await fetch(test_router_endpoint.href + "/throw")).status).toBe(500);
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["everybodygotaserverless.jpg","cookie-signature-1.1.0.js"].map((name) => {
    const module_name = "@tomlarkworthy/api-hosting-with-express";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/serverside-cells", async () => runtime.module((await import("/@tomlarkworthy/serverside-cells.js?v=4")).default));  
  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @tomlarkworthy/testing", async () => runtime.module((await import("/@tomlarkworthy/testing.js?v=4")).default));  
  $def("_1zc8u1", null, ["md"], _1zc8u1);  
  $def("_jtl6q7", null, ["md"], _jtl6q7);  
  $def("_1hi9ylw", "Router", ["require"], _1hi9ylw);  
  $def("_1um3doo", null, ["md"], _1um3doo);  
  $def("_1ixf98c", "app", ["Router"], _1ixf98c);  
  main.define("deploy", ["module @tomlarkworthy/serverside-cells", "@variable"], (_, v) => v.import("deploy", _));  
  $def("_16j71og", null, ["md"], _16j71og);  
  $def("_12qp4w9", "handleWithExpress", ["cookie_signature","cookie"], _12qp4w9);  
  $def("_1tj7uye", null, ["md"], _1tj7uye);  
  $def("_vomtxh", "test_router_endpoint", ["deploy","handleWithExpress","app"], _vomtxh);  
  $def("_1mlnoob", "cookie_signature", ["require","FileAttachment"], _1mlnoob);  
  $def("_3y5f2f", "cookie", [], _3y5f2f);  
  $def("_1t4dd6p", null, ["md"], _1t4dd6p);  
  $def("_15csgpq", "viewof ci", ["viewof suite"], _15csgpq);  
  $def("_1us5g34", "ci", ["Generators","viewof ci"], _1us5g34);  
  $def("_ucegoc", null, ["ci","test_router_endpoint","expect"], _ucegoc);  
  $def("_1vf54xs", null, ["ci","test_router_endpoint","expect"], _1vf54xs);  
  $def("_1urb8zh", null, ["ci","expect","test_router_endpoint"], _1urb8zh);  
  $def("_dsx6ob", null, ["ci","expect","test_router_endpoint"], _dsx6ob);  
  $def("_1noaep0", null, ["ci","expect","test_router_endpoint"], _1noaep0);  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("viewof suite", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("viewof suite", _));  
  main.define("suite", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("suite", _));  
  main.define("expect", ["module @tomlarkworthy/testing", "@variable"], (_, v) => v.import("expect", _));
  return main;
}