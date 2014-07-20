'use strict';
var util = require('util');
var path = require('path');
var fs = require('fs');
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
  this.moduleName = this.eEsuperClassName(this.cameledName);
  this.moduleRecursionGuard = 0;
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
    var _p,
        _td = this.eEtargetDirectory();
    if (this.isModuleGenerator) {
        _p = path.join('scripts', _td, this.baseName);
    } else { // Angular Components (controllers, directives…
        var _ctd = path.dirname(_td);
        _p = path.join('scripts', _ctd, this.baseName);
    }
    /*
    console.log("Path: " + _p);
    console.log("Target Directory: " + _td);
    console.log("Components Target Directory: " + _ctd);
    console.log("BaseName: " + this.baseName);
    */
    return _p;
};

Generator.prototype.eEgenerateDecorator = function (skipAdd, fn) {
    // Services use classified names
    if (this.generatorName.toLowerCase() === 'service') {
        this.cameledName = this.classedName;
    }

    fn();

    if (!this.isModuleGenerator) {
        this.eErenameUp();
        this.eEgenerateModuleIfMissing();
    }

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
        self.eEappTemplate(appTemplate, path.join(self.eEdestinationPath()));
        self.eEtestTemplate(testTemplate, path.join(self.eEdestinationPath()));
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

Generator.prototype.eEsuperClassName = function (dottedClassName) {
    return dottedClassName.substring(0, dottedClassName.lastIndexOf('.'));
}

Generator.prototype.eErenameUp = function () {
    //console.log("cameledName BEFORE: " + this.cameledName);
    var _cameledName = this.cameledName = this.eEsuperClassName(this.cameledName);
    //console.log("cameledName AFTER: " + this.cameledName);

    //console.log("name BEFORE: " + this.name);
    this.name = this.eEsuperClassName(this.name);
    //console.log("name AFTER: " + this.name);

    //console.log("classedName BEFORE: " + this.classedName);
    this.classedName = this._.classify(this.name);
    //console.log("classedName AFTER: " + this.classedName);

    //console.log("baseName BEFORE: " + this.baseName);
    this.baseName = (function() { // get the last part
        var _parts = _cameledName.split('.');
        return _parts[_parts.length - 1];
    })();
    //console.log("baseName AFTER: " + this.baseName);
};

Generator.prototype.eEaddSubmoduleToParentModule = function () {

    var parentModuleDirectory = path.dirname(this.eEtargetDirectory());
    var parentModuleScriptName,
        parentModulePath;

    if (parentModuleDirectory === '.') {
        parentModulePath = path.join(this.env.options.appPath, 'scripts', this.env.options.appPath) + this.scriptSuffix;
    } else {
        parentModuleScriptName = path.basename(parentModuleDirectory) + this.scriptSuffix;
        parentModulePath = path.join(this.env.options.appPath, 'scripts', parentModuleDirectory, parentModuleScriptName);
    }
    parentModulePath = parentModulePath.toLowerCase();

    //console.log("this.eEtargetDirectory = " + this.eEtargetDirectory());
    //console.log("parentModuleDirectory = " + parentModuleDirectory);
    //console.log("parentModulePath = " + parentModulePath);
    var submoduleName = this.cameledName;

    var self = this;
    var fnAddDependency = function () {
        try {
            angularUtils.rewriteFileWithFilter(
                parentModulePath,
                function (body) {
                    var comma = ', ';
                    if (body.match(/\[\s*\]\/\*deps-DONT-REMOVE/))
                        comma = '';
                    if (body.indexOf("'"+ submoduleName  +"'") > -1) /* I suppose the dependency is already injected */
                        return body;
                    return body.replace("]/*deps-DONT-REMOVE",comma + "'" + submoduleName + "']/*deps-DONT-REMOVE");
                });
        } catch (e) {
            self.log.error('\nAn error occurred while attempting to add module deps in ' + parentModulePath + '\n');
            throw e;
        }
    };

    /*
    this.eErenameUp();
    this.eEgenerateModuleIfMissing(); // recursion
    setTimeout(fnAddDependency, 1000); // Take some time to be sure the template has been generated... really UGLY!!!
    */


    if (!fs.existsSync(parentModulePath)) {
        //this.log.error('\nUnable to find ' + parentModulePath + ' module definition. I\'m going to create it ');
        this.eErenameUp();
        if (this.moduleRecursionGuard++ > 100)
            throw "Submodule recursion has reached the limit of 100 levels. OUCH!!!" ;
        this.eEgenerateModuleIfMissing(); // recursion
        // Take some time to be sure the template has been generated... really UGLY!!!
        setTimeout(fnAddDependency, 1000);
    } else {
        fnAddDependency();
    }
};

Generator.prototype.eEgenerateModuleIfMissing = function () {
    this.isModuleGenerator = 1;

    var moduleDirectory = this.eEtargetDirectory();
    var moduleScriptName,
        modulePath;

    if (moduleDirectory === '.') {
        modulePath = path.join(this.env.options.appPath, 'scripts', this.env.options.appPath) + this.scriptSuffix;
    } else {
        moduleScriptName = path.basename(moduleDirectory) + this.scriptSuffix;
        modulePath = path.join(this.env.options.appPath, 'scripts', moduleDirectory, moduleScriptName);
    }
    modulePath = modulePath.toLowerCase();
    if (fs.existsSync(modulePath))
        return;

    this.eEgenerateSource('module', this.options['skip-add'] || false);
    this.eEaddSubmoduleToParentModule();
};
