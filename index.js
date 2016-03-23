var gutil = require('gulp-util')
var path = require('path')
var through = require('through2')
var PLUGIN_NAME = 'gulp-url-prefixer'

var default_conf = {
  matches: {
    'script': 'src',
    'link': 'href',
    'a': 'href',
    'img': 'src'
  },
  cdn: 'http://localhost/',
  placeholderFuncName: '__uri'
}

var config = {}

var processConf = function (conf) {
  Object.keys(default_conf).forEach(function (key) {
    config[key] = conf[key] || default_conf[key]
  })
}

var buildHtmlRegex = function () {
  var matches = config.matches
  var tags = Object.keys(matches)
  var filter = {}
  var attrs = []
  tags.forEach(function (tag) {
    var attr = matches[tag]
    if (!filter[attr]) {
      attrs.push(attr)
      filter[attr] = true
    }
  })
  return new RegExp('<\\s*(' + tags.join('|') + ')([\\s\\S]+?)(' + attrs.join('|') + ')=([\'"]?)([\\s\\S]+?)(\\?[\\s\\S]*?)?\\4', 'g')
}

var buildCssRegex = function () {
  return /url\((['"])?([\s\S]+?)(\?[\s\S]*?)?\1\)/g
}

var buildJsRegex = function () {
  return new RegExp(config.placeholderFuncName + '\\s*\\(\\s*([\'"])([\\s\\S]+?)(\\?[\\s\\S]*?)?\\1([\\s\\S]*?)\\)', 'g')
}

var buildUrl = function (file, url, cdn) {
  if (path.isAbsolute(url)) {
    url = url.substring(1)
  } else {
    url = path.join(path.dirname(file.relative), url)
  }

  url = path.normalize(url)

  if (cdn.charAt(cdn.length - 1) !== '/') {
    cdn += '/'
  }

  url = cdn + url

  if (process.platform === 'win32') {
    url = url.replace(/\\+/g, path.posix.sep)
  }

  return url
}

var autoHtmlUrl = function (file, reg) {
  var cdn = config.cdn
  var contents = file.contents.toString().replace(reg, function (match, tagName, otherAttrs, attrName, delimiter, url, search) {
    if (url.indexOf(':') === -1 && /[\w\/\.]/.test(url.charAt(0))) {
      if (config.matches[tagName] !== attrName) return
      url = buildUrl(file, url, typeof cdn === 'function' ? cdn(url) : cdn)
      delimiter = delimiter || ''
      search = search || ''
      return '<' + tagName + otherAttrs + attrName + '=' + delimiter + url + search + delimiter + search
    } else {
      return match
    }
  })
  file.contents = new Buffer(contents)
}

var autoCssUrl = function (file, reg) {
  var cdn = config.cdn
  var contents = file.contents.toString().replace(reg, function (match, delimiter, url, search) {
    if (url.indexOf(':') === -1 && /[\w\/\.]/.test(url.charAt(0))) {
      delimiter = delimiter || ''
      search = search || ''
      url = buildUrl(file, url, typeof cdn === 'function' ? cdn(url) : cdn)
      return 'url(' + delimiter + url + search + delimiter + ')'
    } else {
      return match
    }
  })
  file.contents = new Buffer(contents)
}

var autoJsUrl = function (file, reg) {
  var cdn = config.cdn

  var contents = file.contents.toString().replace(reg, function (match, delimiter, url, search, appendix) {
    if (url.indexOf(':') === -1) {
      delimiter = delimiter || ''
      search = search || ''
      appendix = appendix || ''

      url = buildUrl(file, url, typeof cdn === 'function' ? cdn(url) : cdn)
      url = delimiter + url + search + delimiter + appendix
      return url
    } else {
      return match
    }
  })
  file.contents = new Buffer(contents)
}

exports.js = function (conf) {
  processConf(conf)
  var reg = buildJsRegex()
  return through.obj(function (file, encoding, cb) {
    if (file.isStream()) {
      return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'))
    }
    autoJsUrl(file, reg)
    cb(null, file)
  })
}

exports.css = function (conf) {
  processConf(conf)
  var reg = buildCssRegex()
  return through.obj(function (file, encoding, cb) {
    if (file.isStream()) {
      return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'))
    }
    autoCssUrl(file, reg)
    cb(null, file)
  })
}

exports.html = function (conf) {
  processConf(conf)
  var reg = buildHtmlRegex()
  return through.obj(function (file, encoding, cb) {
    if (file.isStream()) {
      return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'))
    }
    autoHtmlUrl(file, reg)
    cb(null, file)
  })
}
