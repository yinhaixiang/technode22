var app = angular.module('techNodeApp', ['ngRoute', 'angularMoment']).config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);
    $routeProvider.
        when('/rooms', {
            templateUrl: '/pages/rooms.html',
            controller: 'RoomsCtrl'
        }).
        when('/rooms/:roomname', {
            templateUrl: '/pages/room.html',
            controller: 'RoomCtrl'
        }).
        when('/login', {
            templateUrl: '/pages/login.html',
            controller: 'LoginCtrl'
        }).
        otherwise({
            redirectTo: '/login'
        })
})

app.socket = null;

app.run(function ($window, $rootScope, $location) {
    $window.moment.locale('zh-cn');
    $location.path('/login');

    $rootScope.logout = function () {
        socket.disconnect();
        $rootScope.me = null;
        $location.path('/login');
    }
})

app.controller('LoginCtrl', function ($scope, $location, $rootScope, socket) {
    $scope.login = function () {
        socket.connect('localhost:3002');
        socket.emit('login', $scope.user, function (flag) {
            if(flag) {
                $location.path('/rooms');
                $rootScope.me = $scope.user;
            } else {
                alert('该昵称已经有人使用！');
            }
        });
    }

})

app.controller('RoomsCtrl', function ($scope, $location, socket) {
    socket.emit('getAllRooms', null, function (rooms) {
        $scope.filteredRooms = $scope.rooms = rooms;
    })


    $scope.searchRoom = function () {
        if ($scope.searchKey) {
            $scope.filteredRooms = $scope.rooms.filter(function (room) {
                return room.roomname.indexOf($scope.searchKey) > -1;
            })
        } else {
            $scope.filteredRooms = $scope.rooms;
        }
    }


    $scope.createRoom = function () {
        socket.emit('createRoom', {
            roomname: $scope.searchKey
        }, function(room) {
            $scope.enterRoom(room);
        })
    }


    $scope.enterRoom = function (room) {
        socket.emit('joinRoom', {
            roomname: room.roomname
        }, function (rooms) {
            $location.path('/rooms/' + room.roomname);
        })
    }

    socket.on('updataRooms', function (rooms) {
        $scope.filteredRooms = $scope.rooms = rooms;
    })

})

app.controller('RoomCtrl', function ($scope, socket, $location, $routeParams) {
    $scope.$on('$routeChangeStart', function(evt, next, current) {
        socket.emit('leaveRoom', null);
    })

    socket.emit('getRoomUsers', $routeParams, function (room) {
        $scope.room = room;
    })

    socket.on('updataRoom', function (room) {
        console.log(room);
        $scope.room = room;
    })

    socket.on('createMsg', function (message) {
        if(!$scope.messages) {
            $scope.messages = [];
        }
        $scope.messages.push(message);
    })
})


app.factory('socket', function ($rootScope) {
    return {
        connect: function () {
            if (app.socket == null) {
                app.socket = io.connect("/");
                app.socket.on("error", function () {
                    app.socket = null;
                });
            } else {
                app.socket.socket.reconnect();
            }
        },

        disconnect: function () {
            app.socket.disconnect();
        },

        on: function (eventName, callback) {
            app.socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(app.socket, args);
                })
            })
        },
        emit: function (eventName, data, callback) {
            app.socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(app.socket, args);
                    }
                })
            })
        }
    }
})


app.directive('ctrlEnterBreakLine', function () {
    return function (scope, element, attrs) {
        var ctrlDown = false;
        element.bind("keydown", function (evt) {
            if (evt.which === 17) {
                ctrlDown = true;
                setTimeout(function () {
                    ctrlDown = false;
                }, 1000);
            }
            if (evt.which === 13) {
                if (ctrlDown) {
                    element.val(element.val() + '\n');
                } else {
                    scope.$apply(function () {
                        scope.$eval(attrs.ctrlEnterBreakLine);
                    });
                    evt.preventDefault();
                }
            }
        });
    };
});


app.directive('autoScrollToBottom', function () {
    return {
        link: function (scope, element, attrs) {
            scope.$watch(
                function () {
                    return element.children().length;
                },
                function () {
                    element.animate({
                        scrollTop: element.prop('scrollHeight')
                    }, 1000);
                }
            );
        }
    };
});


app.controller('MessageCreatorCtrl', function ($scope, socket) {
    $scope.createMessage = function () {
        socket.emit('createMsg', {
            content: $scope.newMessage,
            creator: $scope.me
        })
        $scope.newMessage = '';
    }
})