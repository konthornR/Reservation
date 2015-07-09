var express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io').listen(http);

http.listen(process.env.PORT || 3000)

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

app.get('/QueueLists', function (req, res) {
  res.sendfile(__dirname + '/public/queueLists.html');
});

app.get('/ReserveQueue', function (req, res) {
  res.sendfile(__dirname + '/public/reserveQueue.html');
});

app.get('/CreateOrJoinCompany', function (req, res) {
  res.sendfile(__dirname + '/public/createOrJoinCompany.html');
});
app.get('/NextQueue', function (req, res) {
  res.sendfile(__dirname + '/public/nextQueue.html');
});


var _ = require('underscore');

var mysql = require('mysql');
var pool = mysql.createPool({
  host     : 'us-cdbr-iron-east-02.cleardb.net',
  user     : 'b74609e180ce2b',
  password : '87b88840',
  database : 'heroku_ec961a3d2debbe8'
});


var customer_format = 	{
					'Name': '',
					'NumberOfSeats': 0,
					'Id': '',
					'SocketId': [],
					'NextQueueFlag': false,
					'QueuePosition' : 0,
					'GroupColor' : ""
				};

/*============================   Global Entity Start  =================================*/	
var GlobalCompany = function(){
	this.allCompany = [];
};
GlobalCompany.prototype.getCompanyById = function(id){
	for(var i =0; i<this.allCompany.length; i++){
		if(this.allCompany[i].companyId == id){
			return this.allCompany[i];
		}
	}
};
GlobalCompany.prototype.addCompany = function(company){
	this.allCompany.push(company);
};

var globalCompany = new GlobalCompany();
/*============================   Global Entity End  =================================*/	


/*============================   Each Company Entity Start  =================================*/			
var Company = function(id){
	this.companyId = id;
	this.allCustomers = [];
	//default table config
	this.tableConfig = 	[{
						'greater' : 1,
						'less' : 3,
						'customers' : [],
						'latestQueuePosition' : 0,
						'groupColor' : "red"
					},
					{
						'greater' : 4,
						'less' : 6,
						'customers' : [],
						'latestQueuePosition' : 0,
						'groupColor' : "green"						
					},
					{
						'greater' : 7,
						'less' : 9,
						'customers' : [],
						'latestQueuePosition' : 0,
						'groupColor' : "blue"		
					},
					{
						'greater' : 10,
						'less' : 100,
						'customers' : [],
						'latestQueuePosition' : 0,
						'groupColor' : "black"		
					}]; 
	this.callingQueue = [];
};

/*============================   Each Comapany Entity End  =================================*/	

io.sockets.on('connection', function(socket){;
	//console.log("=================" + socket.id + " connect ========================")
	io.sockets.socket(socket.id).emit("socket id connection", {'SocketId': socket.id});

	/*============================   Global Function Start  =================================*/	
	socket.on('global create company', function(data){		
		var newCompany = new Company(data.CompanyId);
		globalCompany.addCompany(newCompany);
		io.sockets.emit('global update companies', globalCompany.allCompany); 
    });  

    socket.on('global request initial companies', function(data){				
		io.sockets.emit('global update companies', globalCompany.allCompany); 
    });  
	/*============================   Global Function end  =================================*/

	/*============================   Each Company Function Start  =================================*/
    socket.on('join company', function(data){	
    	if(socket.companyId){
    		// leave the current room (stored in session)
			socket.leave(socket.companyId);
    	}		
		// join this room id
		socket.join(data.CompanyId);
		socket.companyId = data.CompanyId;
    });

    socket.on('request reserve seats', function(data){	
    	thisCompany = globalCompany.getCompanyById(socket.companyId);
    	if(thisCompany){
	    	tableConfig = thisCompany.tableConfig;
	    	allCustomers = thisCompany.allCustomers;
	    	callingQueue = thisCompany.callingQueue;

			var customer = _.clone(customer_format);
			customer.Name = data.Name;
			customer.NumberOfSeats = data.NumberOfSeats;
			customer.Id = data.Id;
			customer.SocketId = _.clone(customer_format.SocketId);

			//Add customer into database
			var start = new Date();
			var start_sqlFormat = start.getFullYear() + "-" + (start.getMonth()+1) + "-" + start.getDate() + " " + start.getHours() + ":" + start.getMinutes() + ":" + start.getSeconds();
			var post  = {
				qrcode: data.Id, 
				timestart: start_sqlFormat,		 
				name: data.Name,
				numseat: data.NumberOfSeats
			};
			/*pool.getConnection(function(err, connection){
				var query = connection.query('INSERT INTO reservation SET ?', post, function(err, result) {
				  	if (err) { 
				        throw err;
			      	}
				});
				connection.release();
			});*/

			
			//Add customer in tableConfig
			for(var i =0; i<tableConfig.length; i++){
				if(customer.NumberOfSeats >= tableConfig[i].greater && customer.NumberOfSeats <= tableConfig[i].less){
					//check if this is the first customer in this category
					if(tableConfig[i].customers.length == 0){
						customer.NextQueueFlag = true;
					}
					tableConfig[i].latestQueuePosition = tableConfig[i].latestQueuePosition + 1;
					customer.QueuePosition = tableConfig[i].latestQueuePosition;
					customer.GroupColor = tableConfig[i].groupColor;
					tableConfig[i].customers.push(customer);
					break;
				}
			}

			allCustomers.push(customer);		

	        io.sockets.in(socket.companyId).emit('update table', allCustomers);    
        }
    });  

	socket.on('next queue', function(data){		
		thisCompany = globalCompany.getCompanyById(socket.companyId);
		if(thisCompany){
	    	tableConfig = thisCompany.tableConfig;
	    	allCustomers = thisCompany.allCustomers;
	    	callingQueue = thisCompany.callingQueue;

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

				//Update end Timestamp for currentQueueCustomer into database
				var end = new Date();
				var end_sqlFormat = end.getFullYear() + "-" + (end.getMonth()+1) + "-" + end.getDate() + " " + end.getHours() + ":" + end.getMinutes() + ":" + end.getSeconds();
				var post  = {
					timeend: end_sqlFormat
				};
				/*pool.getConnection(function(err, connection){
					var query = connection.query('UPDATE reservation SET ? WHERE qrcode = ?', [post, currentQueueCustomer.Id], function(err, result){
						if (err) { 
					        throw err;
				      	}  
					});
					connection.release();
	  			});*/

				//update Table information
				io.sockets.in(socket.companyId).emit('update table', allCustomers); 
				io.sockets.in(socket.companyId).emit('update calling table', callingQueue); 
			}
		}
    });   

	socket.on('customer register code', function(data){	
		if(socket.companyId){
    		// leave the current room (stored in session)
			socket.leave(socket.companyId);
    	}		
		// join this room id
		socket.join(data.CompanyId);
		socket.companyId = data.CompanyId;
		
		thisCompany = globalCompany.getCompanyById(socket.companyId);
		if(thisCompany){
	    	tableConfig = thisCompany.tableConfig;
	    	allCustomers = thisCompany.allCustomers;
	    	callingQueue = thisCompany.callingQueue;

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

				var post  = {
								doesusemobile: 'true'
							};
				/*pool.getConnection(function(err, connection){
					var query = connection.query('UPDATE reservation SET ? WHERE qrcode = ?', [post, data.Id], function(err, result){
						if (err) { 
					        throw err;
				      	}  
					});
					connection.release();
	  			});*/
			}		
			//update Table information
			io.sockets.in(socket.companyId).emit('update table', allCustomers); 
			io.sockets.in(socket.companyId).emit('update calling table', callingQueue); 
		}
	});

	//Find Customer in Next Queue
	socket.on('request customer in next queue', function(data){
		thisCompany = globalCompany.getCompanyById(socket.companyId);
		if(thisCompany){
	    	tableConfig = thisCompany.tableConfig;
	    	allCustomers = thisCompany.allCustomers;
	    	callingQueue = thisCompany.callingQueue;

			if(data.customerType){
				//Current this server have only 0,1,2,3 customer type
				if(data.customerType > 3){
					data.customerType = 3; 
				}
				if(tableConfig[data.customerType].customers.length > 0){
					requestNextCustomer = tableConfig[data.customerType].customers[0]
					io.sockets.in(socket.companyId).emit('respond customer in next queue', requestNextCustomer);
				}else{
					io.sockets.in(socket.companyId).emit('respond customer in next queue', "no more customer waiting in this customer group type");
				}
			}else{
				io.sockets.in(socket.companyId).emit('respond customer in next queue', "require customerType parameter");
			}	
		}		 
	});

	//Customer does attend 
	socket.on('customer attend', function(data){	
		thisCompany = globalCompany.getCompanyById(socket.companyId);
		if(thisCompany){
	    	tableConfig = thisCompany.tableConfig;
	    	allCustomers = thisCompany.allCustomers;
	    	callingQueue = thisCompany.callingQueue;

			// Find data customer index in calling Queue array
			var customerIndex_IncallingQueue;
			_.each(callingQueue, function(customer, idx) { 
			   if (customer.Id == data.Id) {
			      customerIndex_IncallingQueue = idx;
			      return;
			   }
			 });

			var post  = {
					doesattend: "true"
				};
			/*pool.getConnection(function(err, connection){
				var query = connection.query('UPDATE reservation SET ? WHERE qrcode = ?', [post, data.Id], function(err, result){
					if (err) { 
				        throw err;
			      	}  
				});
				connection.release();
			});*/

			//Romove this customers in calling queue
			callingQueue.splice(customerIndex_IncallingQueue,1);

			io.sockets.in(socket.companyId).emit('update table', allCustomers); 
			io.sockets.in(socket.companyId).emit('update calling table', callingQueue); 
		}
	});

	//Customer doesn't attend 
	socket.on('customer does not attend', function(data){	
		thisCompany = globalCompany.getCompanyById(socket.companyId);
		if(thisCompany){
	    	tableConfig = thisCompany.tableConfig;
	    	allCustomers = thisCompany.allCustomers;
	    	callingQueue = thisCompany.callingQueue;

			// Find data customer index in calling Queue array
			var customerIndex_IncallingQueue;
			_.each(callingQueue, function(customer, idx) { 
			   if (customer.Id == data.Id) {
			      customerIndex_IncallingQueue = idx;
			      return;
			   }
			 });

			//Romove this customers in calling queue
			callingQueue.splice(customerIndex_IncallingQueue,1);

			io.sockets.in(socket.companyId).emit('update table', allCustomers); 
			io.sockets.in(socket.companyId).emit('update calling table', callingQueue); 
		}
	});

	//Send Initial Table
	socket.on('request initial table', function(data){	
		thisCompany = globalCompany.getCompanyById(socket.companyId);
		if(thisCompany){
	    	tableConfig = thisCompany.tableConfig;
	    	allCustomers = thisCompany.allCustomers;
	    	callingQueue = thisCompany.callingQueue;
			io.sockets.in(socket.companyId).emit('update table', allCustomers); 
			io.sockets.in(socket.companyId).emit('update calling table', callingQueue); 
		}
	});

	//Test Connection
	socket.on('test connection', function(data){	
		io.sockets.emit('test connection back', data); 
	});


    /*============================   Each Company Function End  =================================*/
});

app.use(express.static(__dirname+'/public'));
app.use(express.static(__dirname+'/bower_components'));