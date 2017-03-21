var express = require("express");
var app = express();
var serv = require("http").Server(app);

//EXPRESS usage for a simple page system
app.get("/", function(req, res) {
	res.sendFile(__dirname + "/client/index.html");
});
//The client can only request files located in the client folder
app.use("/client", express.static(__dirname + "/client"));

//Start the server
serv.listen(2001);
console.log("Server started");

var SOCKET_LIST = {};
var ENTITY_LIST = {};
var currentSocketID = 1;//Positive direction
var currentNPCID = -1;//Negative direction

class Entity
{
	constructor(_id, _x, _y)
	{
		console.log("ENTITY CONSTRUCTOR");
		this.id = _id;
		this.x = 0;
		this.y = 0;
	}
	onDestroy()
	{
		console.log("ENTITY DESTRUCTOR");
	}
	update(deltaTime)
	{
		//console.log("ENTITY UPDATE");
		return true;
	}
}

class Arrow extends Entity
{
	constructor(_id, _x, _y, _damage, _direction)
	{
		super(_id, _x, _y);
		this.direction = _direction;
	}
	onDestroy()
	{
		super.onDestroy();
		console.log("ARROW DESTRUCTOR");
	}
	update(deltaTime)
	{
		if (!super.update(deltaTime))
			return false;
		
		this.x += Math.cos(this.direction) * 1.0;
		this.y += Math.cos(this.direction) * 1.0;
		
		return true;
	}
}

class Bomb extends Entity
{
	constructor(_id, _x, _y, _damage, _timer)
	{
		super(_id, _x, _y);
		this.damage = _damage;
		this.timer = _timer;
	}
	onDestroy()
	{
		super.onDestroy();
		console.log("BOMB DESTRUCTOR");
	}
	update(deltaTime)
	{
		if (!super.update(deltaTime))
			return false;
		
		//Decrement timer
		this.timer -= deltaTime;
		if (this.timer <= 0)
			return false;
		
		return true;
	}
}

class Character extends Entity
{
	constructor(_id, _x, _y, _profession)
	{		
		super(_id, _x, _y);
		console.log("CHARACTER CONSTRUCTOR: " + _profession);
		this.profession = _profession;
		this.name = _profession;
		this.attackTimer = 0.0;		
		
		//Profession specific attributes
		switch (this.profession)
		{
			case "Archer":
				this.attack = 1;
				this.rate = 1;
				this.speed = 1.0;
				this.health = 1;
				this.regeneration = 1;
				this.projectileRes = 1;
				this.bombRes = 1;
				this.meleeRes = 1;
				break;
			case "Bomber":
				this.attack = 1;
				this.rate = 1;
				this.speed = 1.0;
				this.health = 1;
				this.regeneration = 1;
				this.projectileRes = 1;
				this.bombRes = 1;
				this.meleeRes = 1;
				break;
			case "Crusader":
			
				this.attack = 1;
				this.rate = 1;
				this.speed = 1.0;
				this.health = 1;
				this.regeneration = 1;
				this.projectileRes = 1;
				this.bombRes = 1;
				this.meleeRes = 1;
				break;
		}
	}
	onDestroy()
	{
		super.onDestroy();
		console.log("CHARACTER DESTRUCTOR");
	}
	
	update(deltaTime)
	{
		if (!super.update(deltaTime))
			return false;
		
		return true;
	}
}

class Player extends Character
{
	constructor(_id, _x, _y, _profession, _name)
	{
		super(_id, _x, _y, _profession);
		console.log("PLAYER CONSTRUCTOR: " + _name);
		this.name = _name;
		this.number = "" + this.id;
		this.pressingRight = false;
		this.pressingLeft = false;
		this.pressingUp = false;
		this.pressingDown = false;
	}
	onDestroy()
	{
		super.onDestroy();
		console.log("PLAYER DESTRUCTOR");
	}	
	
	update(deltaTime)
	{
		if (!super.update(deltaTime))
			return false;
		
		if (this.pressingRight)
			this.x += this.speed;
		if (this.pressingLeft)
			this.x -= this.speed;
		if (this.pressingUp)
			this.y -= this.speed;
		if (this.pressingDown)
			this.y += this.speed;
		
		console.log("Position: " + this.x + ", " + this.y);		
		return true;
	}
}

class Enemy extends Character
{
	constructor(_id, _x, _y, _profession)
	{
		super(_id, _x, _y, _profession);
	}
	onDestroy()
	{
		super.onDestroy();
		console.log("ENEMY DESTRUCTOR");
	}
	update(deltaTime)
	{
		if (!super.update(deltaTime))
			return false;
		
		return true;
	}
}

var io = require("socket.io") (serv, {});
io.sockets.on("connection", function(socket){
	
	socket.id = currentSocketID++;
	SOCKET_LIST[socket.id] = socket;
	var player = new Player(socket.id, 0, 0, "Archer", "Dummy");
	
	socket.on("disconnect", function(){
		delete SOCKET_LIST[socket.id];
		var entity = ENTITY_LIST[socket.id];//Cast to entity
		entity.onDestroy();
		delete ENTITY_LIST[socket.id];
	});
	
	socket.on("spawn", function(buffer){
		console.log("Spawning player...");
		player = new Player(socket.id, 0, 0, buffer.profession, buffer.name);
		ENTITY_LIST[socket.id] = player;
	});
	
	socket.on("u", function(buffer){
		//console.log(buffer[0]);
		player.pressingRight	= ((buffer[0] & 1) !== 0);
		player.pressingUp		= ((buffer[0] & 2) !== 0);
		player.pressingLeft		= ((buffer[0] & 4) !== 0);
		player.pressingDown		= ((buffer[0] & 8) !== 0);
	});
})

//Update and send
setInterval(function(){
	var packet = [];
	for (var i in ENTITY_LIST)
	{
		var entity = ENTITY_LIST[i];
		
		if (!entity.update(1000.0/25.0))
		{
			ENTITY_LIST[entity.id].onDestroy();
			delete ENTITY_LIST[entity.id];
		}
		
		packet.push({
			x:entity.x,
			y:entity.y,
			number:entity.id
		});
	}
	
	for (var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit("u", packet);
	}
}, 1000/25);
