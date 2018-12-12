var gulp = require('gulp');
var browserify = require('browserify');
var babelify = require('babelify');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");

gulp.task('buildjs', function() {
    // console.log('Started');
    ['js/dbhelper.js', 'js/main.js'].map(function(file) {
        return browserify( {entries: [file]} )
            .transform(babelify.configure({presets: ['env']}))
            .bundle()
            .pipe(source('combined.min.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./js'));
        });
    // console.log('Finished');
    // console.log('Started');
    ['js/dbhelper.js', 'js/restaurant_info.js'].map(function(file) {
        return browserify( {entries: [file]} )
            .transform(babelify.configure({presets: ['env']}))
            .bundle()
            .pipe(source('restaurant-combined.min.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./js'));
        });
    // console.log('Finished');
});