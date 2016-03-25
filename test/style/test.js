/* eslint-env node, mocha */
'use strict'

var path = require('path')
var fs = require('fs')
var gulp = require('gulp')
var autoUrl = require('../../')
var through = require('through2')

describe('gulp-url-prefixer', function () {
  describe('auto prefix urls in css', function () {
    it('should has appropriate url prefix', function (done) {
      gulp.task('auto-prefixer-css', function () {
        var resultContents = fs.readFileSync(path.join(__dirname, 'case1.css'), {encoding: 'utf-8'})
        var targetUrl = 'app/page1/index.css'
        if (process.platform === 'win32') {
          targetUrl = targetUrl.replace(/\/+/g, path.sep)
        }
        var stream = through.obj(function (file, encoding, cb) {
          if (file.relative === targetUrl) {
            file.contents.toString().should.be.eql(resultContents)
            done()
          }
          cb()
        })

        function ext2CDN (pathname) {
          switch (path.extname(pathname)) {
            case '.css':
              return 'http://sta.mycdn.com/'
            case '.png':
            case '.gif':
              return 'http://img.mycdn.com'
          }
        }

        return gulp.src(path.join(__dirname, 'app/**/*.css'), {base: __dirname})
          .pipe(autoUrl.css({
            cdn: ext2CDN
          }))
          .pipe(stream)
      })
      gulp.start('auto-prefixer-css')
    })
  })
})
