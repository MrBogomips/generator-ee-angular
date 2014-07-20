'use strict';

describe('Controller: <%= cameledName %>Ctrl', function () {

  // load the controller's module
  beforeEach(module('<%= moduleName %>'));

  var <%= classedName %>Ctrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    <%= classedName %>Ctrl = $controller('<%= cameledName %>Ctrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
