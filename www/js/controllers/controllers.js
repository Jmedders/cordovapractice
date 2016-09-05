app.controller('mainController', ['$scope', '$http', 'MyService', function($scope, $http, MyService){

  $scope.view = {};
  MyService.findUsers().then(function (data){
    console.log(data);
    $scope.view.users = data.data;
  })

  $scope.view.logIn = function() {
    MyService.logIn($scope.view.username, $scope.view.password).then(function (res) {
      if(res.data.errors){
        $scope.view.error = res.data.errors;
      }
      else{
        localStorage.jwt = res.data.token;
        console.log(localStorage.jwt);
        $location.path('/landing');
        $window.location.reload();
      }
    });
  }

  $scope.view.logout = function() {
    localStorage.clear();
    $location.path('/');
    $window.location.reload();
  }
}]);
