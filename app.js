/* node -use_strict app.js 
 * 
*/ 
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
var ARROW_LIST = {};
var BOMB_LIST = {};
var CHARACTER_LIST = {};
var currentSocketID = 1;//Positive direction
var currentNPCID = -1;//Negative direction
var LOG_ALLOCATIONS = false;

////////////
// ENTITY //
////////////
class Entity
{
	constructor(_id, _faction, _x, _y)
	{
		if (LOG_ALLOCATIONS)
			console.log("ENTITY CONSTRUCTOR");
		//Variables
		this.id = _id;
		this.faction = _faction;
		this.x = _x;
		this.y = _y;
	}
	destroy()
	{
		if (LOG_ALLOCATIONS)
			console.log("ENTITY DESTRUCTOR");
	}
	update(deltaTime)
	{
		//console.log("ENTITY UPDATE");
		return true;
	}
	spawnPacket()
	{
		console.log("ENTITY spawnPacket() called! Base class method not supposed to be ever called, noly deriving methods!");
	}
}
///////////
// ARROW //
///////////
class Arrow extends Entity
{
	constructor(_faction, _x, _y, _direction, _velocity, _damage)
	{
		super(currentNPCID--, _faction, _x, _y);
		if (LOG_ALLOCATIONS)
			console.log("ARROW CONSTRUCTOR");
		//Variables
		this.direction = _direction;
		this.velocity = _velocity;
		this.damage = _damage;
		
		//Send an arrow added packet to all clients
		var packet = this.spawnPacket();	
		for (var i in SOCKET_LIST)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("a+", packet);
		}
		
		ARROW_LIST[this.id] = this;
	}
	spawnPacket()
	{
		var packet =
		{
			id: this.id,
			faction: this.faction,
			x: this.x,
			y: this.y,
			direction: this.direction,
			velocity: this.velocity,
			damage: this.damage,
		}
		return packet;
	}
	destroy()
	{
		super.destroy();
		if (LOG_ALLOCATIONS)
			console.log("ARROW DESTRUCTOR");
		
		//Send an arrow removed packet to all clients
		var packet = { id: this.id };
		for (var i in SOCKET_LIST)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("a-", packet);
		}
		
		delete ARROW_LIST[this.id];
	}
	update(deltaTime)
	{
		if (!super.update(deltaTime))
			return false;
		
		this.x += Math.cos(this.direction) * 1.0;
		this.y += Math.cos(this.direction) * 1.0;
		
		if (this.x < 0 || this.x > 500 || this.y < 0 || this.y > 500)
			return false;
		
		return true;
	}
}
//////////
// BOMB //
//////////
class Bomb extends Entity
{
	constructor(_factiom, _x, _y, _damage, _timer)
	{
		super(currentNPCID--, _faction, _x, _y);
		if (LOG_ALLOCATIONS)
			console.log("BOMB CONSTRUCTOR");
		//Variables
		this.damage = _damage;
		this.timer = _timer;
		
		//Send a bomb added packet to all clients
		var packet = this.spawnPacket();	
		for (var i in SOCKET_LIST)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("b+", packet);
		}
		
		BOMB_LIST[this.id] = this;
	}
	spawnPacket()
	{
		var packet =		
		{
			id: this.id,
			faction: this.faction,
			x: this.x,
			y: this.y,
			damage: this.damage,
			timer: this.timer,
		};
		return packet;
	}
	destroy()
	{
		super.destroy();
		if (LOG_ALLOCATIONS)
			console.log("BOMB DESTRUCTOR");
		
		//Send bomb removed packet to all clients
		var packet = { id: this.id };
		for (var i in SOCKET_LIST)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("b-", packet);
		}
		
		delete BOMB_LIST[this.id];
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
///////////////
// CHARACTER //
///////////////
class Character extends Entity
{
	constructor(_id, _faction, _x, _y, _profession, _name)
	{
		super(_id,  _faction, _x, _y);
		if (LOG_ALLOCATIONS)
			console.log("CHARACTER CONSTRUCTOR: " + _profession + " called " + _name);		
		////Variables
		this.profession = _profession;
		this.name = _name;
		this.attackTimer = 0.0;
		this.moveDirection = Math.PI * 0.5;
		this.attackDirection = Math.PI * 0.5;
		this.isAttacking = false;
		this.velocity = 0.0;
		//Set by profession
		this.attack = 1;
		this.attackRate = 1;
		this.speed = 1.0;
		this.health = 1;
		this.regeneration = 1;
		this.projectileRes = 1;
		this.bombRes = 1;
		this.meleeRes = 1;
		
		//Profession specific attributes
		switch (this.profession)
		{
			case 1://ARCHER
				console.log("Setting archer attributes...");
				this.attack = 1;
				this.attackRate = 2;
				this.speed = 1.0;
				this.health = 10.0;
				this.regeneration = 1.0;
				this.projectileRes = 1.0;
				this.bombRes = 1.0;
				this.meleeRes = 1.0;
				break;
			case 2://Bomber
				console.log("Setting bomber attributes...");
				this.attack = 2;
				this.attackRate = 1.5;
				this.speed = 1.5;
				this.health = 15.0;
				this.regeneration = 1.5;
				this.projectileRes = 1.0;
				this.bombRes = 1.0;
				this.meleeRes = 1.0;
				break;
			case 3://Crusader
				console.log("Setting crusader attributes...");
				this.attack = 3;
				this.attackRate = 0.5;
				this.speed = 2.0;
				this.health = 20.0;
				this.regeneration = 2.0;
				this.projectileRes = 1.0;
				this.bombRes = 1.0;
				this.meleeRes = 1.0;
				break;
		}
		
		//Send a character added packet to all clients
		var packet = this.spawnPacket();
		for (var i in SOCKET_LIST)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("c+", packet);
		}
		
		CHARACTER_LIST[this.id] = this;
	}
	spawnPacket()
	{
		var packet =
		{
			id: this.id,
			faction: this.faction,
			x: this.x,
			y: this.y,
			name: this.name,
			profession: this.profession,
		};
		return packet;
	}	
	destroy()
	{
		super.destroy();
		if (LOG_ALLOCATIONS)
			console.log("CHARACTER DESTRUCTOR: " + this.name);
		
		//Send character removed packet to all clients
		var packet = { id: this.id };
		for (var i in SOCKET_LIST)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("c-", packet);
		}
		
		delete CHARACTER_LIST[this.id];
	}
	update(deltaTime)
	{
		if (!super.update(deltaTime))
			return false;
		
		this.x += Math.cos(this.moveDirection) * this.velocity;
		this.y += Math.sin(this.moveDirection) * this.velocity;
		
		if (this.isAttacking)
		{
			if (this.attackTimer <= 0.0)
			{//Perform attack
				this.attackTimer = this.attackRate;
				var arrow = new Arrow(this.faction, this.x, this.y, this.attackDirection, 1.0, this.attack);
			}
			else
			{//Attack timer tick
				this.attackTimer -= deltaTime;
			}
		}
		
		return true;
	}
}
////////////
// PLAYER //
////////////
class Player extends Character
{
	constructor(_id, _x, _y, _profession, _name)
	{
		super(_id, 1/*faction*/, _x, _y, _profession, _name);
		if (LOG_ALLOCATIONS)
			console.log("PLAYER CONSTRUCTOR: " + _name);
		//Variables
		this.number = "" + this.id;
		this.pressingRight = false;
		this.pressingLeft = false;
		this.pressingUp = false;
		this.pressingDown = false;
	}
	destroy()
	{
		super.destroy();
		if (LOG_ALLOCATIONS)
			console.log("PLAYER DESTRUCTOR");
	}
	
	update(deltaTime)
	{
		//Before super update...
		var x = 0.0;
		var y = 0.0;
		if (this.pressingRight)
			x += this.speed;
		if (this.pressingLeft)
			x -= this.speed;
		if (this.pressingUp)
			y -= this.speed;
		if (this.pressingDown)
			y += this.speed;
		if (Math.abs(x) !== 0.0 || Math.abs(y) !== 0.0)
		{
			this.velocity = this.speed;
			this.moveDirection = Math.atan2(y, x);
		}
		else
			this.velocity = 0.0;
		
		//Super update
		if (!super.update(deltaTime))
			return false;		
		
		//console.log("Position: " + this.x + ", " + this.y);		
		return true;
	}
}
///////////
// ENEMY //
///////////
class Enemy extends Character
{
	constructor(_x, _y, _profession)
	{
		super(currentNPCID--, -1/*faction*/, _x, _y, _profession, _profession/*name*/);
		if (LOG_ALLOCATIONS)
			console.log("ENEMY CONSTRUCTOR");
	}
	destroy()
	{
		super.destroy();
		if (LOG_ALLOCATIONS)
			console.log("ENEMY DESTRUCTOR");
	}
	update(deltaTime)
	{
		if (!super.update(deltaTime))
			return false;
		
		return true;
	}
}
//////////
// GAME //
//////////
//Socket
var io = require("socket.io") (serv, {});
io.sockets.on("connection", function(socket)
{	
	socket.id = currentSocketID++;
	SOCKET_LIST[socket.id] = socket;
	
	//Send create packets of entities
	for (var i in ARROW_LIST)
	{
		var arrow = ARROW_LIST[i];
		var packet = arrow.spawnPacket();
		socket.emit("a+", packet);
	}
	for (var i in BOMB_LIST)
	{
		var bomb = BOMB_LIST[i];
		var packet = bomb.spawnPacket();
		socket.emit("b+", packet);
	}
	for (var i in CHARACTER_LIST)
	{
		var character = CHARACTER_LIST[i];
		var packet = character.spawnPacket();
		socket.emit("c+", packet);
	}
	
	var player;
	var spawned = false;
	
	socket.on("disconnect", function()
	{
		//Remove socket from sockets list
		delete SOCKET_LIST[socket.id];
		//Remove character
		if (spawned)
		{
			var character = CHARACTER_LIST[socket.id];//Cast to character
			if (character)
				character.destroy();
				spawned = false;
		}
	});
	
	socket.on("spawn", function(buffer)
	{
		console.log("Spawning player...");
		//Create character and add to character list
		player = new Player(socket.id, 250, 250, buffer.profession, buffer.name);
		spawned = true;
	});
	
	socket.on("u", function(buffer)
	{
		//console.log(buffer[0]);
		if (spawned)		
		{
			player.pressingRight	= ((buffer[0] & 1) !== 0);
			player.pressingUp		= ((buffer[0] & 2) !== 0);
			player.pressingLeft		= ((buffer[0] & 4) !== 0);
			player.pressingDown		= ((buffer[0] & 8) !== 0);
			player.isAttacking		= ((buffer[0] & 16) !== 0);
			player.attackDirection	= buffer[1] / 255.0 * Math.PI;
		}
	});
})
//Update and send
setInterval(function()
{	
	//Arrows
	var arrows = [];
	for (var i in ARROW_LIST)
	{
		var arrow = ARROW_LIST[i];
		if (!arrow.update(1000.0/25.0))
		{
			ARROW_LIST[arrow.id].destroy();
		}
		else
		{
			arrows.push({
				id: arrow.id,
				x: arrow.x,
				y: arrow.y,
				direciton: arrow.direction,
				velocity: 1.0,
			});
		}
	}
	//Bombs
	var bombs = [];
	for (var i in BOMB_LIST)
	{
		var bomb = BOMB_LIST[i];		
		if (!bomb.update(1000.0/25.0))
		{
			BOMB_LIST[bomb.id].destroy();
		}
		else
		{
			bombs.push({
				id: bomb.id,
				x: bomb.x,
				y: bomb.y,
			});
		}
	}
	//Characters
	var characters = [];
	for (var i in CHARACTER_LIST)
	{
		var character = CHARACTER_LIST[i];
		if (!character.update(1000.0/25.0))
		{
			CHARACTER_LIST[character.id].destroy();
		}
		else
		{
			characters.push({
				id: character.id,
				x: character.x,
				y: character.y,
				moveDirection: character.moveDirection,
				attackDirection: character.attackDirection,				
				velocity: character.velocity,
				isAttacking: character.isAttacking,
				number: character.id,
			});
		}
	}
	
	//Construct update packet
	var packet = [];
	packet.push(arrows);
	packet.push(bombs);
	packet.push(characters);
	for (var i in SOCKET_LIST)
	{
		var socket = SOCKET_LIST[i];
		socket.emit("u", packet);
	}
}, 1000/25);
