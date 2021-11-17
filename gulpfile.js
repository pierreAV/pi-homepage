const config = require('./gulp.config.js');

/**
 * Load Plugins.
 *
 * Load gulp plugins and passing them semantic names.
 */
const gulp = require('gulp'); // Gulp of-course.

// CSS related plugins.
const sass = require('gulp-sass'); // Gulp plugin for Sass compilation.
const sassdoc = require('sassdoc');
// compass = require('gulp-compass'),
const uglifycss = require('gulp-uglifycss'); // Minifies CSS files.
const cleancss = require('gulp-clean-css');
const csscss = require('gulp-csscss');
const csso = require('gulp-csso');
const crass = require('gulp-crass');
//const cssnano = require('gulp-cssnano');
const cssnano = require('cssnano');
const csspurge = require('gulp-css-purge');
const postcss = require('gulp-postcss');
const nested = require('postcss-nested');
const autoprefixer = require('gulp-autoprefixer'); // Autoprefixing magic.
const mmq = require('gulp-merge-media-queries'); // Combine matching media queries into one.
const emq = require('gulp-extract-media-queries'); // Extracts css rules inside of media queries and saves it to separated files.
const closureCompiler = require('gulp-closure-compiler');

// JS related plugins.
const concat = require('gulp-concat'); // Concatenates JS files.
const uglify = require('gulp-uglify'); // Minifies JS files.
const babel = require('gulp-babel'); // Compiles ESNext to browser compatible JS.

// Image related plugins.
const imagemin = require('gulp-imagemin'); // Minify PNG, JPEG, GIF and SVG images with imagemin.
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminOptipng = require('imagemin-optipng');
const imageminSvgo = require('imagemin-svgo');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminWebp = require('imagemin-webp');
const imageOptim = require('gulp-imageoptim');
const webp = require('gulp-webp');

// Utility related plugins.
const rename = require('gulp-rename'); // Renames files E.g. style.css -> style.min.css.
const lineec = require('gulp-line-ending-corrector'); // Consistent Line Endings for non UNIX systems. Gulp Plugin for Line Ending Corrector (A utility that makes sure your files have consistent line endings).
const filter = require('gulp-filter'); // Enables you to work on a subset of the original files by filtering them using a glob.
const sourcemaps = require('gulp-sourcemaps'); // Maps code in a compressed file (E.g. style.css) back to it’s original position in a source file (E.g. structure.scss, which was later combined with other css files to generate style.css).
const notify = require('gulp-notify'); // Sends message notification to you.
const browserSync = require('browser-sync').create(); // Reloads browser and injects CSS. Time-saving synchronized browser testing.
const sort = require('gulp-sort'); // Recommended to prevent unnecessary changes in pot-file.
const cache = require('gulp-cache'); // Cache files in stream for later use.
const remember = require('gulp-remember'); //  Adds all the files it has ever seen back into the stream.
const plumber = require('gulp-plumber'); // Prevent pipe breaking caused by errors from gulp plugins.
const beep = require('beepbeep');
const svgSprite = require('gulp-svg-sprite');
const extReplace = require('gulp-ext-replace');

// SVG Config
const svgConfig = {

    shape: {
        dimension: { // Set maximum dimensions
            maxWidth: 300,
            maxHeight: 32
        }
    },
    mode: {
        symbol: { // Activate the «css» mode
            dest: './', // destination foldeer
            render: {
                scss: true,
                css: true
            },
            sprite: "../img/sprite.symbol.svg",
            example: true
        }
    },
    svg: {
        xmlDeclaration: false, // strip out the XML attribute
        doctypeDeclaration: false // don't include the !DOCTYPE declaration
    }
};

/**
 * Custom Error Handler.
 *
 * @param Mixed err
 */
const errorHandler = r => {
    notify.onError('\n\n❌  ===> ERROR: <%= error.message %>\n')(r);
    beep();

    // this.emit('end');
};

/**
 * Task: `browser-sync`.
 *
 * Live Reloads, CSS injections, Localhost tunneling.
 * @link http://www.browsersync.io/docs/options/
 *
 * @param {Mixed} done Done.
 */
const browsersync = done => {
    browserSync.init({
        plugins: ['bs-console-qrcode'],
        proxy: config.projectURL,
        open: config.browserAutoOpen,
        injectChanges: config.injectChanges,
        watchEvents: ['change', 'add', 'unlink', 'addDir', 'unlinkDir']
    });
    done();
};

// Helper function to allow browser reload with Gulp 4.
const reload = done => {
    browserSync.reload();
    done();
};

/**
 * Task: `styles`.
 *
 * Compiles Sass, Autoprefixes it and Minifies CSS.
 *
 * This task does the following:
 *    1. Gets the source scss file
 *    2. Compiles Sass to CSS
 *    3. Writes Sourcemaps for it
 *    4. Autoprefixes it and generates style.css
 *    5. Renames the CSS file with suffix .min.css
 *    6. Minifies the CSS file and generates style.min.css
 *    7. Injects CSS or reloads the browser via browserSync
 */
gulp.task('styles', () => {
    var plugins = [
        nested,
        //  autoprefixer({browsers: ['last 1 version']}),
        cssnano()
    ];
    return gulp
        .src(config.styleSRC, { allowEmpty: true })
        .pipe(plumber(errorHandler))
        //.pipe(sourcemaps.init())
        .pipe(
            sass({
                errLogToConsole: config.errLogToConsole,
                outputStyle: config.outputStyle,
                precision: config.precision
            })
        )
        .on('error', sass.logError)
        //.pipe(sourcemaps.write({ includeContent: false }))
        //.pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(autoprefixer(config.BROWSERS_LIST))
        //.pipe(sourcemaps.write('./'))
        //.pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        .pipe(gulp.dest(config.styleDestination))
        .pipe(filter('**/*.css')) // Filtering stream to only css files.
        .pipe(mmq({ log: true })) // Merge Media Queries only for .min.css version.
        //.pipe(emq()) // Extract Media Queries - A REMETTRE
        .pipe(browserSync.stream()) // Reloads style.css if that is enqueued.
        .pipe(rename({ suffix: '.min' }))
        //.pipe(uglifycss({ maxLineLen: 10 }))
        //.pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        //.pipe(cleancss({ level: { 2: { restructureRules: true } } }))
        .pipe(cleancss({
            format: {
                semicolonAfterLastProperty: true // controls removing trailing semicolons in rule; defaults to `false` - means remove
            },
            level: {
                2: { restructureRules: true, }
            }
        }))
        //.pipe(cssnano())
        //.pipe(postcss(plugins))
        //.pipe(csscss())
        //.pipe(crass({ pretty: false }))
        //.pipe(csso({ restructure: true, sourceMap: false, debug: false }))
        /*.pipe(csspurge({
            trim: true,
            shorten: true,
            verbose: true
        }))*/
        .pipe(gulp.dest(config.styleDestination))
        .pipe(filter('**/*.css')) // Filtering stream to only css files.
        .pipe(browserSync.stream()) // Reloads style.min.css if that is enqueued.
        .pipe(notify({ message: '\n\n✅  ===> STYLES — completed!\n', onLast: true }));
});


gulp.task('stylesDev', () => {
    var plugins = [
        nested,
        //  autoprefixer({browsers: ['last 1 version']}),
        cssnano()
    ];
    return gulp
        .src(config.styleSRC, { allowEmpty: true })
        .pipe(plumber(errorHandler))
        .pipe(sourcemaps.init())
        .pipe(
            sass({
                errLogToConsole: config.errLogToConsole,
                outputStyle: config.outputStyle,
                precision: config.precision
            })
        )
        .on('error', sass.logError)
        //.pipe(sourcemaps.write({ includeContent: false }))
        //.pipe(sourcemaps.init({ loadMaps: true }))
        //.pipe(autoprefixer(config.BROWSERS_LIST))
        //.pipe(sourcemaps.write('./'))
        //.pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        //.pipe(gulp.dest(config.styleDestination))
        //.pipe(filter('**/*.css')) // Filtering stream to only css files.
        //.pipe(mmq({ log: true })) // Merge Media Queries only for .min.css version.
        //.pipe(emq()) // Extract Media Queries - A REMETTRE
        //.pipe(browserSync.stream()) // Reloads style.css if that is enqueued.
        //.pipe(rename({ suffix: '.min' }))
        //.pipe(uglifycss({ maxLineLen: 10 }))
        //.pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        //.pipe(cleancss({ level: { 2: { restructureRules: true } } }))
        //.pipe(cssnano())
        //.pipe(postcss(plugins))
        //.pipe(csscss())
        //.pipe(crass({ pretty: false }))
        //.pipe(csso({ restructure: true, sourceMap: false, debug: false }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.styleDestination))
        //.pipe(filter('**/*.css')) // Filtering stream to only css files.
        .pipe(browserSync.stream()) // Reloads style.min.css if that is enqueued.
        .pipe(notify({ message: '\n\n✅  ===> STYLES — completed!\n', onLast: true }));
});

gulp.task("webp", () => {
    return gulp
        .src(['./resources/src/assets/img/**/*.{jpg,png,jpeg}'])
        .pipe(webp())
        .pipe(gulp.dest('./public/webp'));
});

gulp.task('images', () => {
    return gulp
        .src(config.imgSRC)
        .pipe(
            imagemin([
                imageminGifsicle({ interlaced: true }),
                //imageminJpegtran({ progressive: true }),
                imageminMozjpeg({ progressive: true }),
                //imageminOptipng({ optimizationLevel: 3 }), // 0-7 low-high.
                imageminPngquant({ quality: [0.65, 0.90] }),
                imageminSvgo({
                    plugins: [{ removeViewBox: true }, { cleanupIDs: false }]
                })
            ])
        )
        .pipe(gulp.dest(config.imgDST))
        .pipe(notify({ message: '\n\n✅  ===> IMAGES — completed!\n', onLast: true }));
});

//scripts
gulp.task('scripts', function() {
    return gulp.src('js/**/*.js')
        .pipe(plumber(plumberErrorHandler))
        .pipe(concat('main.js'))
        .pipe(gulp.dest('js'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify())
        .pipe(gulp.dest('js'));
});

//watch
gulp.task('live', function() {
    gulp.watch('scss/**/*.scss', gulp.series('styles'));
});


gulp.task('sprites', function() {
    return gulp.src('./resources/src/assets/sprites_raw/svg/**/*.svg')
        .pipe(svgSprite(svgConfig))
        .pipe(gulp.dest("./resources/src/assets/sprites/"));
});


gulp.task('copycss', () =>
    gulp.src(['./resources/src/assets/css/*.css', './resources/src/assets/sprites/*.css'])
    .pipe(plumber(errorHandler))
    //.pipe(autoprefixer(config.BROWSERS_LIST))
    .pipe(rename({ suffix: '.min' }))
    //.pipe(cleancss())
    .pipe(cleancss({
        format: {
            semicolonAfterLastProperty: true // controls removing trailing semicolons in rule; defaults to `false` - means remove
        },
        level: {
            2: { restructureRules: true, }
        }
    }))
    .pipe(gulp.dest('./public/css'))
);

gulp.task('copyfonts', () =>
    gulp.src('./resources/src/assets/fonts/*')
    .pipe(gulp.dest('./public/fonts'))
);

gulp.task('copysprite', () =>
    gulp.src('./resources/src/assets/img/sprite.*.svg')
    .pipe(gulp.dest('./public/img'))
);

gulp.task('vendorsJS', () => {
    return gulp
        .src(config.jsVendorSRC, { since: gulp.lastRun('vendorsJS') }) // Only run on changed files.
        .pipe(plumber(errorHandler))
        .pipe(
            babel({
                presets: [
                    [
                        '@babel/preset-env', // Preset to compile your modern JS to ES5.
                        {
                            targets: { browsers: config.BROWSERS_LIST } // Target browser list to support.
                        }
                    ]
                ]
            })
        )
        .pipe(remember(config.jsVendorSRC)) // Bring all files back to stream.
        .pipe(concat(config.jsVendorFile + '.js'))
        .pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        .pipe(gulp.dest(config.jsVendorDestination))
        .pipe(
            rename({
                basename: config.jsVendorFile,
                suffix: '.min'
            })
        )
        .pipe(uglify())
        .pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        .pipe(gulp.dest(config.jsVendorDestination))
        .pipe(notify({ message: '\n\n✅  ===> VENDOR JS — completed!\n', onLast: true }));
});

gulp.task('customJS', () => {
    return gulp
        .src(config.jsCustomSRC, { since: gulp.lastRun('customJS') }) // Only run on changed files.
        .pipe(plumber(errorHandler))
        .pipe(
            babel({
                presets: [
                    [
                        '@babel/preset-env', // Preset to compile your modern JS to ES5.
                        {
                            targets: { browsers: config.BROWSERS_LIST } // Target browser list to support.
                        }
                    ]
                ]
            })
        )
        .pipe(remember(config.jsCustomSRC)) // Bring all files back to stream.
        .pipe(concat(config.jsCustomFile + '.js'))
        .pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        .pipe(gulp.dest(config.jsCustomDestination))
        .pipe(
            rename({
                basename: config.jsCustomFile,
                suffix: '.min'
            })
        )
        .pipe(uglify())
        .pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        .pipe(gulp.dest(config.jsCustomDestination))
        .pipe(notify({ message: '\n\n✅  ===> CUSTOM JS — completed!\n', onLast: true }));
});


gulp.task('clearCache', function(done) {
    return cache.clearAll(done);
});


gulp.task('sassdoc', function() {
    return gulp.src(['./resources/src/assets/scss/**/*.scss'])
        .pipe(sassdoc());
});




gulp.task('bundleJS', () => {
    return gulp
        .src(['./public/js/vendor.min.js', './public/js/custom.min.js']/*, { since: gulp.lastRun('bundleJS') }*/) // Only run on changed files.
        .pipe(plumber(errorHandler))
        /*.pipe(
            babel({
                presets: [
                    [
                        '@babel/preset-env', // Preset to compile your modern JS to ES5.
                        {
                            targets: { browsers: config.BROWSERS_LIST } // Target browser list to support.
                        }
                    ]
                ]
            })
        )*/
        //.pipe(remember(config.jsVendorSRC)) // Bring all files back to stream.
        .pipe(concat('bundle.js'))
        .pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        .pipe(gulp.dest(config.jsVendorDestination))
        .pipe(
            rename({
                basename: 'bundle',
                suffix: '.min'
            })
        )
        .pipe(uglify())
        .pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        .pipe(gulp.dest(config.jsVendorDestination))
        .pipe(notify({ message: '\n\n✅  ===> Bundle JS — completed!\n', onLast: true }));
});


gulp.task('bundleCSS', () => {
    var plugins = [
        nested,
        //  autoprefixer({browsers: ['last 1 version']}),
        cssnano()
    ];
    return gulp
        .src(['./public/css/global.min.css', './public/css/sprite.min.css'/*, './public/css/splide.min.css'*/], { allowEmpty: true })
        .pipe(concat('bundle.css'))
        .pipe(plumber(errorHandler))
       // .pipe(sourcemaps.init())
        /*.pipe(
            sass({
                errLogToConsole: config.errLogToConsole,
                outputStyle: config.outputStyle,
                precision: config.precision
            })
        )
        .on('error', sass.logError)*/
        //.pipe(sourcemaps.write({ includeContent: false }))
        //.pipe(sourcemaps.init({ loadMaps: true }))
        //.pipe(autoprefixer(config.BROWSERS_LIST))
        //.pipe(sourcemaps.write('./'))
        //.pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        //.pipe(gulp.dest(config.styleDestination))
        //.pipe(filter('**/*.css')) // Filtering stream to only css files.
        //.pipe(mmq({ log: true })) // Merge Media Queries only for .min.css version.
        //.pipe(emq()) // Extract Media Queries - A REMETTRE
        //.pipe(browserSync.stream()) // Reloads style.css if that is enqueued.
        //.pipe(rename({ suffix: '.min' }))
        //.pipe(uglifycss({ maxLineLen: 10 }))
        //.pipe(lineec()) // Consistent Line Endings for non UNIX systems.
        //.pipe(cleancss({ level: { 2: { restructureRules: true } } }))
        //.pipe(cssnano())
        //.pipe(postcss(plugins))
        //.pipe(csscss())
        //.pipe(crass({ pretty: false }))
        //.pipe(csso({ restructure: true, sourceMap: false, debug: false }))
       // .pipe(sourcemaps.write('./'))
       //.pipe(concat('bundle.css'))
       .pipe(autoprefixer(config.BROWSERS_LIST))
       .pipe(mmq({ log: true })) // Merge Media Queries only for .min.css version.
       .pipe(rename({ suffix: '.min' }))
       //.pipe(cleancss({ level: { 2: { restructureRules: true } } }))
       .pipe(cleancss({
            format: {
                semicolonAfterLastProperty: true // controls removing trailing semicolons in rule; defaults to `false` - means remove
            }
        }))
       .pipe(csspurge({
            trim: true,
            shorten: true,
            verbose: true
        }))
       .pipe(lineec()) // Consistent Line Endings for non UNIX systems.
       .pipe(
            rename({
                basename: 'bundle',
                suffix: '.min'
            })
        )
        .pipe(gulp.dest(config.styleDestination))

        //.pipe(filter('**/*.css')) // Filtering stream to only css files.
        //.pipe(browserSync.stream()) // Reloads style.min.css if that is enqueued.
        .pipe(notify({ message: '\n\n✅  ===> BundleCSS — completed!\n', onLast: true }));
});

//gulp.task('prod', ['build', 'minify']); // TODOO
gulp.task(
    'prod',
    gulp.parallel('styles', 'vendorsJS', 'customJS', 'sprites', 'copycss', 'copyfonts', 'copysprite', 'images', 'webp', browsersync, () => {
        gulp.watch(config.watchPhp, reload); // Reload on PHP file changes.
        gulp.watch(config.watchStyles, gulp.parallel('styles')); // Reload on SCSS file changes.
        gulp.watch(config.watchJsVendor, gulp.series('vendorsJS', reload)); // Reload on vendorsJS file changes.
        gulp.watch(config.watchJsCustom, gulp.series('customJS', reload)); // Reload on customJS file changes.
        gulp.watch(config.imgSRC, gulp.series('images', reload)); // Reload on customJS file changes.
    })
);

gulp.task(
    'production',
    gulp.parallel('styles', 'vendorsJS', 'customJS', 'sprites', 'copycss', 'copyfonts', 'copysprite', 'images', 'webp', 'bundleJS', 'bundleCSS')
);


gulp.task(
    'default',
    gulp.parallel('stylesDev', 'vendorsJS', 'customJS', 'sprites', 'copycss', 'copyfonts', 'copysprite', 'images', 'webp', browsersync, () => {
        gulp.watch(config.watchPhp, reload); // Reload on PHP file changes.
        gulp.watch(config.watchStyles, gulp.parallel('stylesDev')); // Reload on SCSS file changes.
        gulp.watch(config.watchJsVendor, gulp.series('vendorsJS', reload)); // Reload on vendorsJS file changes.
        gulp.watch(config.watchJsCustom, gulp.series('customJS', reload)); // Reload on customJS file changes.
        gulp.watch(config.imgSRC, gulp.series('images', reload)); // Reload on customJS file changes.
    })
);


gulp.task(
    'css',
    gulp.parallel('styles')
);


gulp.task(
    'bundleCSS',
    gulp.parallel('bundleCSS')
);


gulp.task(
    'images',
    gulp.parallel( 'images', 'webp')
);
