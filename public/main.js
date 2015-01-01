var app = angular.module('reservationApp', ['ja.qr']);

app.factory('socket', function(){
    return io.connect('http://localhost:3000');
});

app.controller('tableQueueControl', function($scope, socket){

    socket.on('update table', function(data) {
        $scope.listCustomersQueue = data;
        $scope.$digest();
    });
     socket.on('update calling table', function(data) {
        $scope.listCustomersCalling = data;
        $scope.$digest();
    });

    $scope.nextQueue = function(customer){
        socket.emit('next queue', customer);
    };
});

app.controller('reserveQueueControl', function($scope, socket){
    $scope.qrCodeString = "TEST";
    $scope.reserveSeats = function() {
        var Id = generateUniqueId();
        socket.emit('request reserve seats', {'Name': $scope.customer.Name, 'NumberOfSeats': $scope.customer.NumberOfSeats, 'Id': Id});
        $scope.customer.Name = "";
        $scope.customer.NumberOfSeats = "";
        //update_qrcode(Id);
        $scope.qrCodeString = Id;
    };

    var generateUniqueId = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
    };
});