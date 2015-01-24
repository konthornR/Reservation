var express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io').listen(http);

http.listen(process.env.PORT || 3000)

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});


var _ = require('underscore');

var customer_format = 	{
					'Name': '',
					'NumberOfSeats': 0,
					'Id': '',
					'SocketId': [],
					'NextQueueFlag': false
				};
var allCustomers = [];
var tableConfig = 	[{
						'greater' : 1,
						'less' : 3,
						'customers' : []
					},
					{
						'greater' : 4,
						'less' : 6,
						'customers' : []
					},
					{
						'greater' : 7,
						'less' : 9,
						'customers' : []
					},
					{
						'greater' : 10,
						'less' : 100,
						'customers' : []
					}];

var callingQueue = [];


io.sockets.on('connection', function(socket){

	socket.on('request reserve seats', function(data){		
		var customer = _.clone(customer_format);
		customer.Name = data.Name;
		customer.NumberOfSeats = data.NumberOfSeats;
		customer.Id = data.Id;
		customer.SocketId = _.clone(customer_format.SocketId);

		//Add customer in tableConfig
		for(var i =0; i<tableConfig.length; i++){
			if(customer.NumberOfSeats >= tableConfig[i].greater && customer.NumberOfSeats <= tableConfig[i].less){
				//check if this is the first customer in this category
				if(tableConfig[i].customers.length == 0){
					customer.NextQueueFlag = true;
				}
				tableConfig[i].customers.push(customer);
				break;
			}
		}

		allCustomers.push(customer);		

        io.sockets.emit('update table', allCustomers);    
    });  

    socket.on('next queue', function(data){		
    	var foundCustomerInTableConfig = false;
    	var tableConfigIndex = -1; 
    	var customersIndex = -1;

    	var currentQueueCustomer;
    	var nextFirstQueueCustomer;

		for(var i =0; i<tableConfig.length&& !foundCustomerInTableConfig; i++){
			//find where is next queue call customer in table config 
			for(var j = 0; j<tableConfig[i].customers.length; j++){
				if(data.Id == tableConfig[i].customers[j].Id){
					tableConfigIndex = i;
					customersIndex = j ;
					foundCustomerInTableConfig = true;

					currentQueueCustomer = tableConfig[i].customers[j];
					//Report Error if calling customer is not the first queue in the same catagory group.
					if(customersIndex != 0){
						console.log("---------------- Error: Call Customer that is not the first queue in the same catagory group. ");
					}
					break;
				}
			}
		}

		if(tableConfigIndex != -1){
			//Send out noticifation to all customers in same catagory
			_.each(tableConfig[tableConfigIndex].customers, function(customer, idx) { 
				_.each(customer.SocketId, function(socketId){
					if(socketId){
						io.sockets.socket(socketId).emit("call queue", {'QueueNumber': idx});	
					}
				});		
			 });

			tableConfig[tableConfigIndex].customers.splice(customersIndex, 1); //remove the first queue

			// Find currentQueueCustomer index in allCustomers array
			var customerIndex_InAllCustomers;
			_.each(allCustomers, function(customer, idx) { 
			   if (customer.Id == currentQueueCustomer.Id) {
			      customerIndex_InAllCustomers = idx;
			      return;
			   }
			 });
			//Romove this customers
			allCustomers.splice(customerIndex_InAllCustomers,1);


			if(tableConfig[tableConfigIndex].customers.length > 0){
				//set NextQueueFlag = true for next customer 
				nextFirstQueueCustomer = tableConfig[tableConfigIndex].customers[0];				
				nextFirstQueueCustomer.NextQueueFlag = true;
			}
			
			currentQueueCustomer.NextQueueFlag = false;
			callingQueue.push(currentQueueCustomer);
			//update Table information
			io.sockets.emit('update table', allCustomers); 
			io.sockets.emit('update calling table', callingQueue); 
		}
    });   
	
	socket.on('customer register code', function(data){	
		//insert socket id for customer in table config
		var foundCustomer = false;
		var thisCustomer = undefined;

		_.each(tableConfig, function(table, tableIdx) { 
			_.each(table.customers,function(customer,customerIdx){
				if(customer.Id == data.Id){
					customer.SocketId.push(data.SocketId);
					foundCustomer = true;
					thisCustomer = _.clone(customer);
					thisCustomer.QueueNumber = customerIdx+1;
					return;
				}
			});
		});

		if(!foundCustomer){
			//insert socket id for customer in callingQueue
			_.each(callingQueue, function(customer, idx) { 
			   if (customer.Id == data.Id) {
			      customer.SocketId.push(data.SocketId);
			      foundCustomer = true;
			      thisCustomer = _.clone(customer);
			      thisCustomer.QueueNumber = 0;
			      return;
			   }
			});
		}
		if(foundCustomer){
			_.each(thisCustomer.SocketId, function(socketId){
					if(socketId){
						io.sockets.socket(socketId).emit("customer information", thisCustomer);	
					}
			});		
		}		
		//update Table information
		io.sockets.emit('update table', allCustomers); 
		io.sockets.emit('update calling table', callingQueue); 

	});

	//Test Connection
	socket.on('test connection', function(data){	
		io.sockets.emit('test connection back', data); 
	});

});



app.use(express.static(__dirname+'/public'));
app.use(express.static(__dirname+'/bower_components'));