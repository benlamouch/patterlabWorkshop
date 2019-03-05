/******************************************************
 * PATTERN LAB NODE
 * EDITION-NODE-GULP
 * The gulp wrapper around patternlab-node core, providing tasks to interact with the core library and move supporting frontend assets.
 ***************************************************** */
const gulp = require("gulp");
const rename = require("gulp-rename");
const path = require("path");
const browserSync = require("browser-sync").create();
const sass = require("gulp-sass");
const argv = require("minimist")(process.argv.slice(2));
const replace = require("gulp-replace");
const sourcemaps = require("gulp-sourcemaps");
const babel = require("gulp-babel");
(postcss = require("gulp-postcss")), (autoprefixer = require("autoprefixer"));
function resolvePath(pathInput) {
  return path.resolve(pathInput).replace(/\\/g, "/");
}

/******************************************************
 * COPY TASKS - stream assets from source to destination
 ***************************************************** */
// JS copy
gulp.task("pl-copy:js", () => {
  return gulp
    .src("**/*.js", { cwd: resolvePath(paths().source.js) })
    .pipe(
      babel({
        presets: ["env"]
      })
    )
    .pipe(gulp.dest(resolvePath(paths().public.js)));
});

// Images copy
gulp.task("pl-copy:img", () => {
  return gulp.src("**/*.*", { cwd: resolvePath(paths().source.images) }).pipe(gulp.dest(resolvePath(paths().public.images)));
});

// CSS assets copy
gulp.task("pl-copy:assets", () => {
  return gulp
    .src("**/*.*", { cwd: resolvePath(paths().source.assets) })
    .pipe(gulp.dest(resolvePath(paths().public.assets)))
    .pipe(browserSync.stream());
});

// Favicon copy
gulp.task("pl-copy:favicon", () => {
  return gulp.src("favicon.ico", { cwd: resolvePath(paths().source.root) }).pipe(gulp.dest(resolvePath(paths().public.root)));
});

// Fonts copy
gulp.task("pl-copy:font", () => {
  return gulp.src("**/*", { cwd: resolvePath(paths().source.fonts) }).pipe(gulp.dest(resolvePath(paths().public.fonts)));
});

// SASS Compilation
gulp.task("pl-sass", () => {
  return gulp
    .src(path.resolve(paths().source.css, "**/*.scss"))
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        outputStyle: "compressed",
        includePaths: ["node_modules/susy/sass"]
      }).on("error", sass.logError)
    )
    .pipe(
      postcss([
        autoprefixer({
          browsers: ["last 2 versions", "ie >= 10"]
        })
      ])
    )
    .pipe(sourcemaps.write("maps"))
    .pipe(gulp.dest(path.resolve(paths().source.css)));
});

// CSS Copy
gulp.task("pl-copy:css", () => {
  return gulp
    .src(`${resolvePath(paths().source.css)}/*.css`)
    .pipe(gulp.dest(resolvePath(paths().public.css)))
    .pipe(browserSync.stream());
});

// Sourcemaps Copy
gulp.task("pl-copy:sourcemaps", () => {
  return gulp
    .src(`${resolvePath(paths().source.css)}/maps/**/*.css.map`)
    .pipe(gulp.dest(`${resolvePath(paths().public.css)}/maps`))
    .pipe(browserSync.stream());
});

// Styleguide Copy everything but css
gulp.task("pl-copy:styleguide", () => {
  return gulp
    .src(`${resolvePath(paths().source.styleguide)}/**/!(*.css)`)
    .pipe(gulp.dest(resolvePath(paths().public.root)))
    .pipe(browserSync.stream());
});

// Styleguide Copy and flatten css
gulp.task("pl-copy:styleguide-css", () => {
  return gulp
    .src(`${resolvePath(paths().source.styleguide)}/**/*.css`)
    .pipe(
      gulp.dest(file => {
        // flatten anything inside the styleguide into a single output dir per http://stackoverflow.com/a/34317320/1790362
        file.path = path.join(file.base, path.basename(file.path));
        return resolvePath(path.join(paths().public.styleguide, "/css"));
      })
    )
    .pipe(browserSync.stream());
});


/******************************************************
 * PATTERN LAB CONFIGURATION - API with core library
 ***************************************************** */
// read all paths from our namespaced config file
const config = require("./patternlab-config.json");
const patternlab = require("patternlab-node")(config);

function paths() {
  return config.paths;
}

function getConfiguredCleanOption() {
  return config.cleanPublic;
}

function build(done) {
  patternlab.build(done, getConfiguredCleanOption());
}

gulp.task(
  "pl-assets",
  gulp.series(
    gulp.parallel(
      "pl-copy:js",
      "pl-copy:img",
      "pl-copy:assets",
      "pl-copy:favicon",
      "pl-copy:font",
      gulp.series("pl-sass", "pl-copy:css", "pl-copy:sourcemaps", done => {
        done();
      }),
      "pl-copy:styleguide",
      "pl-copy:styleguide-css"
    ),
    done => {
      done();
    }
  )
);

gulp.task("patternlab:version", done => {
  patternlab.version();
  done();
});

gulp.task("patternlab:help", done => {
  patternlab.help();
  done();
});

gulp.task("patternlab:patternsonly", done => {
  patternlab.patternsonly(done, getConfiguredCleanOption());
});

gulp.task("patternlab:liststarterkits", done => {
  patternlab.liststarterkits();
  done();
});

gulp.task("patternlab:loadstarterkit", done => {
  patternlab.loadstarterkit(argv.kit, argv.clean);
  done();
});

gulp.task(
  "patternlab:build",
  gulp.series("pl-assets", build, done => {
    done();
  })
);

gulp.task("patternlab:installplugin", done => {
  patternlab.installplugin(argv.plugin);
  done();
});

gulp.task("autoprefixer", () => {
  const postcss = require("gulp-postcss");
  const sourcemaps = require("gulp-sourcemaps");
  const autoprefixer = require("autoprefixer");

  return gulp
    .src("./src/*.css")
    .pipe(sourcemaps.init())
    .pipe(
      postcss([
        autoprefixer({
          browsers: ["last 2 versions", "ie >= 10"]
        })
      ])
    )
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("./dest"));
});

/******************************************************
 * SERVER AND WATCH TASKS
 ***************************************************** */
// watch task utility functions
function getSupportedTemplateExtensions() {
  const engines = require("./node_modules/patternlab-node/core/lib/pattern_engines");
  return engines.getSupportedFileExtensions();
}
function getTemplateWatches() {
  return getSupportedTemplateExtensions().map(dotExtension => {
    return `${resolvePath(paths().source.patterns)}/**/*${dotExtension}`;
  });
}

function reload() {
  browserSync.reload();
}

function reloadCSS() {
  browserSync.reload("*.css");
}

function watch() {
  gulp
    .watch(`${resolvePath(paths().source.css)}/**/*.scss`, {
      awaitWriteFinish: true
    })
    .on("change", gulp.series("pl-sass"));
  gulp
    .watch(`${resolvePath(paths().source.css)}/**/*.css`, {
      awaitWriteFinish: true
    })
    .on("change", gulp.series("pl-copy:css", "pl-copy:sourcemaps", reloadCSS));
  gulp
    .watch(`${resolvePath(paths().source.styleguide)}/**/*.*`, {
      awaitWriteFinish: true
    })
    .on("change", gulp.series("pl-copy:styleguide", "pl-copy:styleguide-css", reloadCSS));

  const patternWatches = [
    `${resolvePath(paths().source.patterns)}/**/*.json`,
    `${resolvePath(paths().source.patterns)}/**/*.md`,
    `${resolvePath(paths().source.data)}/*.json`,
    `${resolvePath(paths().source.fonts)}/*`,
    `${resolvePath(paths().source.images)}/*`,
    `${resolvePath(paths().source.meta)}/*`,
    `${resolvePath(paths().source.annotations)}/*`
  ].concat(getTemplateWatches());

  console.log(patternWatches);

  gulp.watch(patternWatches, { awaitWriteFinish: true }).on("change", gulp.series(build, reload));
}

gulp.task(
  "patternlab:connect",
  gulp.series(done => {
    browserSync.init(
      {
        server: {
          baseDir: resolvePath(paths().public.root)
        },
        snippetOptions: {
          // Ignore all HTML files within the templates folder
          blacklist: ["/index.html", "/", "/?*"]
        },
        notify: {
          styles: [
            "display: none",
            "padding: 15px",
            "font-family: sans-serif",
            "position: fixed",
            "font-size: 1em",
            "z-index: 9999",
            "bottom: 0px",
            "right: 0px",
            "border-top-left-radius: 5px",
            "background-color: #1B2032",
            "opacity: 0.4",
            "margin: 0",
            "color: white",
            "text-align: center"
          ]
        }
      },
      () => {
        console.log("PATTERN LAB NODE WATCHING FOR CHANGES");
        done();
      }
    );
  })
);

/******************************************************
 * COMPOUND TASKS
 ***************************************************** */
gulp.task("default", gulp.series("patternlab:build"));
gulp.task("patternlab:watch", gulp.series("patternlab:build", watch));
gulp.task("patternlab:serve", gulp.series("patternlab:build", "patternlab:connect", watch));
