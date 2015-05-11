var app = angular.module('reservationApp', ['ja.qr']);

app.factory('socket', function(){
    //return io.connect('http://localhost:3000');
    return io.connect('https://murmuring-fjord-5701.herokuapp.com/');
});

app.controller('tableQueueControl', function($scope, socket){
    $scope.selectedCustomer = {
                                Id : "",
                                Name : "",
                                QueuePosition : 0,
                                NumberOfSeats : 0
                            };

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

    $scope.attend = function(customer){
        socket.emit('customer attend', customer);
    };

    $scope.notAttend = function(customer){
        socket.emit('customer does not attend', customer);
    };

    $scope.selectCustomer = function(customer) {
        $scope.selectedCustomer = customer;
    }

    //Initial Table
    socket.emit('request initial table');
});

app.controller('reserveQueueControl', function($scope, socket){
    $scope.qrCodeString = "TEST";
    $scope.reserveSeats = function() {
        var Id = generateUniqueId();
        if($scope.customer && $scope.customer.Name != "" && IsNumeric($scope.customer.NumberOfSeats)){
            socket.emit('request reserve seats', {'Name': $scope.customer.Name, 'NumberOfSeats': $scope.customer.NumberOfSeats, 'Id': Id});
            $scope.customer.Name = "";
            $scope.customer.NumberOfSeats = "";
            $scope.qrCodeString = Id;
        }else{
            alert("Wrong Input Format: Name can not be empty and Number of Seats must be numeric");
        }        
    };

    var generateUniqueId = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
    };

    var IsNumeric = function(num) {
        return (num >=0 || num < 0);
    }
});