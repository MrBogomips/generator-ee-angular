'use strict';
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var angularUtils = require('./util.js');

var Generator = module.exports = function Generator() {
  yeoman.generators.NamedBase.apply(this, arguments);

  try {
    this.appname = require(path.join(process.cwd(), 'bower.json')).name;
  } catch (e) {
    this.appname = path.basename(process.cwd());
  }
  this.appname = this._.slugify(this._.humanize(this.appname));
  this.scriptAppName = this._.camelize(this.appname) + angularUtils.appName(this);

  var _cameledName = this.cameledName = this._.camelize(this.name);
  this.classedName = this._.classify(this.name);
  this.baseName = (function() { // get the last part
      // todo: use path.basename()
    var _parts = _cameledName.split('.');
    return _parts[_parts.length - 1];
  })();

  if (typeof this.env.options.appPath === 'undefined') {
    this.env.options.appPath = this.options.appPath;

    if (!this.env.options.appPath) {
      try {
        this.env.options.appPath = require(path.join(process.cwd(), 'bower.json')).appPath;
      } catch (e) {}
    }
    this.env.options.appPath = this.env.options.appPath || 'app';
    this.options.appPath = this.env.options.appPath;
  }

  if (typeof this.env.options.testPath === 'undefined') {
    try {
      this.env.options.testPath = require(path.join(process.cwd(), 'bower.json')).testPath;
    } catch (e) {}
    this.env.options.testPath = this.env.options.testPath || 'test/spec';
  }

  this.env.options.coffee = this.options.coffee;
  if (typeof this.env.options.coffee === 'undefined') {
    this.option('coffee');

    // attempt to detect if user is using CS or not
    // if cml arg provided, use that; else look for the existence of cs
    if (!this.options.coffee &&
      this.expandFiles(path.join(this.env.options.appPath, '/scripts/**/*.coffee'), {}).length > 0) {
      this.options.coffee = true;
    }

    this.env.options.coffee = this.options.coffee;
  }

  var sourceRoot = '/templates/javascript';
  this.scriptSuffix = '.js';

  if (this.env.options.coffee) {
    sourceRoot = '/templates/coffeescript';
    this.scriptSuffix = '.coffee';
  }

  this.sourceRoot(path.join(__dirname, sourceRoot));
};

util.inherits(Generator, yeoman.generators.NamedBase);

Generator.prototype.appTemplate = function (src, dest) {
  yeoman.generators.Base.prototype.template.apply(this, [
    src + this.scriptSuffix,
    path.join(this.env.options.appPath, dest.toLowerCase()) + this.scriptSuffix
  ]);
};

Generator.prototype.testTemplate = function (src, dest) {
  yeoman.generators.Base.prototype.template.apply(this, [
    src + this.scriptSuffix,
    path.join(this.env.options.testPath, dest.toLowerCase()) + this.scriptSuffix
  ]);
};

Generator.prototype.htmlTemplate = function (src, dest) {
  yeoman.generators.Base.prototype.template.apply(this, [
    src,
    path.join(this.env.options.appPath, dest.toLowerCase())
  ]);
};

Generator.prototype.addScriptToIndex = function (script) {
  try {
    var appPath = this.env.options.appPath;
    var fullPath = path.join(appPath, 'index.html');
    angularUtils.rewriteFile({
      file: fullPath,
      needle: '<!-- endbuild -->',
      splicable: [
        '<script src="scripts/' + script.toLowerCase().replace(/\\/g, '/') + '.js"></script>'
      ]
    });
  } catch (e) {
    this.log.error(chalk.yellow(
      '\nUnable to find ' + fullPath + '. Reference to ' + script + '.js ' + 'not added.\n'
    ));
  }
};

Generator.prototype.generateSourceAndTest = function (appTemplate, testTemplate, targetDirectory, skipAdd) {
  // Services use classified names
  if (this.generatorName.toLowerCase() === 'service') {
    this.cameledName = this.classedName;
  }

  this.appTemplate(appTemplate, path.join('scripts', targetDirectory, this.name));
  this.testTemplate(testTemplate, path.join(targetDirectory, this.name));
  if (!skipAdd) {
    this.addScriptToIndex(path.join(targetDirectory, this.name));
  }
};


/***************************************************************************************************************
 *
 * EE Extensions
 *
 **************************************************************************************************************/

Generator.prototype.eEappTemplate = function (src, dest) {
    var _src = src + this.scriptSuffix;
    var _path = path.join(this.env.options.appPath, dest.toLowerCase()) + this.scriptSuffix;

    yeoman.generators.Base.prototype.template.apply(this, [
            _src,
            _path
    ]);
};

Generator.prototype.eEtestTemplate = function (src, dest) {
    var _src = src + this.scriptSuffix;
    var _path = path.join(this.env.options.appPath, dest.toLowerCase()) + '.spec' + this.scriptSuffix;

    yeoman.generators.Base.prototype.template.apply(this, [
            _src,
            _path
    ]);
};


Generator.prototype.eEtargetDirectory = function () {
    return this.name.replace(/\./g, "/");
}

Generator.prototype.eEdestinationPath = function () {
    return path.join('scripts', this.eEtargetDirectory(), this.baseName);
};

Generator.prototype.eEgenerateDecorator = function (skipAdd, fn) {
    // Services use classified names
    if (this.generatorName.toLowerCase() === 'service') {
        this.cameledName = this.classedName;
    }

    fn();

    if (!skipAdd) {
        this.addScriptToIndex(path.join(this.eEtargetDirectory(), this.baseName));
    }
}

Generator.prototype.eEgenerateSource = function (template, skipAdd) {
    var self = this;
    this.eEgenerateDecorator(skipAdd, function () {
        self.eEappTemplate(template, self.eEdestinationPath());
    });
};

Generator.prototype.eEgenerateTest = function (template) {
    var self = this;
    this.eEgenerateDecorator(true, function () {
        self.eEtestTemplate(template, self.eEdestinationPath());
    });
};

Generator.prototype.eEgenerateSourceAndTest = function (appTemplate, testTemplate, skipAdd) {
    var self = this;
    this.eEgenerateDecorator(skipAdd, function () {
        self.eEappTemplate(appTemplate, path.join('scripts',  self.eEdestinationPath(), this.baseName));
        self.eEtestTemplate(testTemplate, path.join('scripts',  self.eEdestinationPath(), this.baseName));
    });
};

Generator.prototype.addSubmoduleToModule = function (script, submodule) {
    try {
        var appPath = this.env.options.appPath;
        var fullPath = path.join(appPath, script);
        angularUtils.rewriteFile({
            file: fullPath,
            needle: ']/*deps-DONT-REMOVE*/',
            splicable: [
                    "'" + submodule + "',"
            ]
        });
    } catch (e) {
        this.log.error(chalk.yellow(
                '\nUnable to find ' + fullPath + '. Dependency to ' + script + '.js ' + 'not added.\n'
        ));
    }
};

Generator.prototype.generateModuleHelper = function (module, submodule) {

};

Generator.prototype.eEaddSubmoduleToParentModule = function () {
    var parentModuleDirectory = path.dirname(this.eEdestinationPath());
    var parentModuleScriptName = path.basename(parentModuleDirectory) + this.scriptSuffix;
    var submoduleName = this.cameledName;
    if (!path.exists(parentModuleScriptName)) {

    }

};

Generator.prototype.eEgenerateModuleIfMissing = function () {
    this.eEgenerateSource('module', this.options['skip-add'] || false);
    this.eEaddSubmoduleToParentModule();
};
