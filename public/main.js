var app = angular.module('reservationApp', ['ja.qr','ngRoute']);

app.config(function($routeProvider, $locationProvider) {    
    // enable html5Mode for pushstate ('#'-less URLs)
    $locationProvider.html5Mode(true);
});

app.factory('socket', function(){
    //return io.connect('http://localhost:3000');
    return io.connect('https://murmuring-fjord-5701.herokuapp.com/');
});

app.controller('tableQueueControl', function($scope, socket,$location){
    $scope.qrCodeString = "TEST";
    if($location.search().companyId){
         socket.emit('join company', {'CompanyId': $location.search().companyId});
    }

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
        $scope.qrCodeString = '{"CompanyId" : "' + $location.search().companyId+ '", "Id": "'+customer.Id+'"}';
    }

    $scope.getNextQueue = function(index){
        socket.emit('request customer in next queue', {'customerType': index});
    }

    socket.on('respond customer in next queue', function(data) {
        $scope.nextCustomer = data;
        $scope.$digest();
    });

    $scope.callThisQueue = function(){
        if($scope.nextCustomer && $scope.nextCustomer.Id){
            socket.emit('next queue', $scope.nextCustomer);
            $scope.nextCustomer = undefined;
        }
    }

    //Initial Table
    socket.emit('request initial table');
});

app.controller('reserveQueueControl', function($scope, socket,$location){
    $scope.qrCodeString = "TEST";
    if($location.search().companyId){
         socket.emit('join company', {'CompanyId': $location.search().companyId});
    }
    $scope.reserveSeats = function() {
        var Id = generateUniqueId();
        if($scope.customer && $scope.customer.Name != "" && IsNumeric($scope.customer.NumberOfSeats)){
            socket.emit('request reserve seats', {'Name': $scope.customer.Name, 'NumberOfSeats': $scope.customer.NumberOfSeats, 'Id': Id});
            $scope.customer.Name = "";
            $scope.customer.NumberOfSeats = "";
            $scope.qrCodeString = '{"CompanyId" : "' + $location.search().companyId+ '", "Id": "'+Id+'"}';
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

app.controller('createOrJoinCompanyControl', function($scope, socket,$window){
    socket.emit('global request initial companies');
    $scope.createCompany = function() {
        if($scope.newCompany && $scope.newCompany.Id != ""){
            socket.emit('global create company', {'CompanyId': $scope.newCompany.Id});
            $scope.newCompany.Id = "";
        }    
    };

    socket.on('global update companies', function(data) {
        $scope.companies = data;
        $scope.$digest();
    });

    $scope.selectReserveQueueCompany = function(company){
        //$state.go("reserveQueue", { comapnyId: company.companyId });
        //var url = $state.href('reserveQueue', {comapnyId: company.companyId});
        //window.open(url,'_blank');

        $window.open('/reserveQueue.html?companyId='+company.companyId);
        //$window.location.href = '/reserveQueue.html?companyId='+company.companyId;
    };
    $scope.selectQueueListsCompany = function(company){
        $window.open('/queueLists.html?companyId='+company.companyId);
    };
    $scope.selectNextQueueCompany = function(company){
        $window.open('/nextQueue.html?companyId='+company.companyId);
    };
});