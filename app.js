/* node -use_strict app.js 
 * 
*/ 
var express = require("express");
var app = express();
var serv = require("http").Server(app);

//EXPRESS usage for a simple page system
app.get("/", function(req, res) {
	res.sendFile(__dirname + "/default.html");
});
//The client can only request files located in the client folder
app.use("/", express.static(__dirname + "/"));

//Start the server
serv.listen(2000);
console.log("Server started");

var SOCKET_LIST = [];
var ENTITY_LIST = [];
var ARROW_LIST = [];
var BOMB_LIST = [];
var CHARACTER_LIST = [];
var ENEMY_LIST = [];
var PLAYER_LIST = [];
var currentSocketID = 1;//Positive direction
var currentNPCID = -1;//Negative direction
var LOG_ALLOCATIONS = false;
var INTERMISSION_DURATION = 1.5;//Time between waves
var NEXT_WAVE_TIMER = INTERMISSION_DURATION;//Time until new wave spawns after completing a wave
var WAVE_TIMER = 0.0;//Time the current wave has taken
var WAVE_LEVEL = 0;
var WIDTH = 50;
var HEIGHT = 50;
var CRUSADER_ATTACK_RANGE = 2.0;
var DELTA_TIME = 0.04;
var COMMON_EXPERIENCE_POOL = 0.0;
//Professions
var ARCHER = 1;
var BOMBER = 2;
var CRUSADER = 4;
//Attribute upgrades
var HEALTH = 0;
var REGENERATION = 1;
var DAMAGE = 2;
var SPEED = 3;
var ATTACK_SPEED = 4;
var ARROW_RES = 5;
var BOMB_RES = 6;
var MELEE_RES = 7;
var ATTRIBUTE_COUNT = 8;
function baseHealth(profession)
{
	switch (profession)
	{
		default:
		case ARCHER: return 100;
		case BOMBER: return 140;
		case CRUSADER: return 150;
	}
}
function baseRegeneration(profession)
{
	switch (profession)
	{
		default:
		case ARCHER: return 1.0;
		case BOMBER: return 1.0;
		case CRUSADER: return 1.75;
	}
}
function baseSpeed(profession)
{
	switch (profession)
	{
		default:
		case ARCHER: return 2.0;
		case BOMBER: return 2.5;
		case CRUSADER: return 3.5;
	}
}
function baseDamage(profession)
{
	switch (profession)
	{
		default:
		case ARCHER: return 15.0;
		case BOMBER: return 40.0;
		case CRUSADER: return 20.0;
	}
}
function baseAttackSpeed(profession)
{
	switch (profession)
	{
		default:
		case ARCHER: return 0.75;
		case BOMBER: return 0.75;
		case CRUSADER: return 0.5;
	}
}
function baseArrowRes(profession)
{
	switch (profession)
	{
		default:
		case ARCHER: return 1.0;
		case BOMBER: return 1.0;
		case CRUSADER: return 0.8;
	}
}
function baseBombRes(profession)
{
	switch (profession)
	{
		default:
		case ARCHER: return 1.0;
		case BOMBER: return 0.75;
		case CRUSADER: return 1.25;
	}
}
function baseMeleeRes(profession)
{
	switch (profession)
	{
		default:
		case ARCHER: return 1.0;
		case BOMBER: return 0.75;
		case CRUSADER: return 1.0;
	}
}


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
		
		ENTITY_LIST.push(this);
	}
	destroy()
	{
		if (LOG_ALLOCATIONS)
			console.log("ENTITY DESTRUCTOR");
		for (var i = 0; i < ENTITY_LIST.length; i++)
		{
			if (ENTITY_LIST[i].id == this.id)
			{
				ENTITY_LIST.splice(i, 1);
			}
		}
	}
	update()
	{
		//console.log("ENTITY UPDATE");
		
		//Limit x
		if (this.x < 0.0)
			this.x = 0.0;
		else if (this.x > WIDTH)
			this.x = WIDTH;
		
		//Limit y
		if (this.y < 0.0)
			this.y = 0.0;
		else if (this.y > HEIGHT)
			this.y = HEIGHT;
			
		return true;
	}
	spawnPacket()
	{
		console.log("ENTITY spawnPacket() called! Base class method not supposed to be ever called, noly deriving methods!");
	}
	distanceTo(x, y)
	{
		return Math.pow(Math.pow(x - this.x, 2.0) + Math.pow(y - this.y, 2.0), 0.5);
	}
	angleTo(x, y)
	{
		return Math.atan2(y - this.y, x - this.x);
	}
}
///////////
// ARROW //
///////////
class Arrow extends Entity
{
	constructor(_faction, _x, _y, _direction, _velocity, _damage, _master)
	{
		super(currentNPCID--, _faction, _x, _y);
		if (LOG_ALLOCATIONS)
			console.log("ARROW CONSTRUCTOR" + _damage);
		//Variables
		this.direction = _direction;
		this.velocity = _velocity;
		this.damage = _damage;
		this.master = _master;
		
		//Send an arrow added packet to all clients
		var packet = this.spawnPacket();	
		for (var i = 0; i < SOCKET_LIST.length; i++)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("a+", packet);
		}
		
		ARROW_LIST.push(this);
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
		for (var i = 0; i < SOCKET_LIST.length; i++)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("a-", packet);
		}
		
		for (var i = 0; i < ARROW_LIST.length; i++)
		{
			if (ARROW_LIST[i].id == this.id)
			{
				ARROW_LIST.splice(i, 1);
			}
		}
	}
	update()
	{
		if (this.x < 0 || this.x > WIDTH || this.y < 0 || this.y > HEIGHT)
			return false;
		
		if (!super.update())
			return false;
		
		this.x += Math.cos(this.direction) * this.velocity * DELTA_TIME;
		this.y += Math.sin(this.direction) * this.velocity * DELTA_TIME;
		
		
		for (var i = 0; i < CHARACTER_LIST.length; i++)
		{
			if (CHARACTER_LIST[i].faction !== this.faction)
			{//Other faction				
				if (Math.pow(Math.pow(CHARACTER_LIST[i].x - this.x, 2.0) + Math.pow(CHARACTER_LIST[i].y - this.y, 2.0), 0.5) < 0.25)
				{//Collision
					CHARACTER_LIST[i].health -= CHARACTER_LIST[i].arrowRes * this.damage;
					CHARACTER_LIST[i].lastAttacker = this.master;
					//console.log("Arrow hit! Remaining hp: "+ CHARACTER_LIST[i].health);
					return false;
				}
			}
		}
		
		return true;
	}
}
//////////
// BOMB //
//////////
class Bomb extends Entity
{
	constructor(_faction, _x, _y, _damage, _radius, _timer, _master)
	{
		super(currentNPCID--, _faction, _x, _y);
		if (LOG_ALLOCATIONS)
			console.log("BOMB CONSTRUCTOR");
		//Variables
		this.damage = _damage;
		this.radius = _radius;
		this.timer = _timer;
		this.master = _master;
		this.masterID = _master.id;
		
		//Send a bomb added packet to all clients
		var packet = this.spawnPacket();
		for (var i = 0; i < SOCKET_LIST.length; i++)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("b+", packet);
		}
		
		BOMB_LIST.push(this);
	}
	spawnPacket()
	{
		var packet =		
		{
			id: this.id,
			faction: this.faction,
			master: this.masterID,
			x: this.x,
			y: this.y,
			damage: this.damage,
			radius: this.radius,
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
		for (var i = 0; i < SOCKET_LIST.length; i++)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("b-", packet);
		}
		
		for (var i = 0; i < BOMB_LIST.length; i++)
		{
			if (BOMB_LIST[i].id == this.id)
			{
				BOMB_LIST.splice(i, 1);
			}
		}
	}
	update()
	{
		if (!super.update())
			return false;
		
		//Decrement timer
		this.timer -= DELTA_TIME;
		if (this.timer <= 0)
			return false;
		
		for (var i = 0; i < CHARACTER_LIST.length; i++)
		{
			if (CHARACTER_LIST[i].faction !== this.faction)
			{//Other faction
				if (Math.pow(Math.pow(CHARACTER_LIST[i].x - this.x, 2.0) + Math.pow(CHARACTER_LIST[i].y - this.y, 2.0), 0.5) < 0.5)
				{//Collision
					console.log("Bomb hit!");
					//AOE damage
					for (var i2 = 0; i2 < CHARACTER_LIST.length; i2++)
					{
						if (CHARACTER_LIST[i2].faction !== this.faction)
						{//Other faction
							var distance = Math.pow(Math.pow(CHARACTER_LIST[i2].x - this.x, 2.0) + Math.pow(CHARACTER_LIST[i2].y - this.y, 2.0), 0.5);
							CHARACTER_LIST[i2].health -= CHARACTER_LIST[i2].bombRes * this.damage * Math.max(0.0, (1.0 - (distance / this.radius)));
							CHARACTER_LIST[i2].lastAttacker = this.master;
							//console.log("Bomb damage inflicted: " + CHARACTER_LIST[i2].bombRes * this.damage * Math.max(0.0, (1.0 - (distance / this.radius))));
						}
					}
					return false;
				}
			}
		}
		
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
		this.moveDirection = Math.PI * 2.0 * Math.random();
		this.attackDirection = Math.PI * 2.0 * Math.random();
		this.isAttacking = false;
		this.attackedSinceLastSync = false;
		this.velocity = 0.0;
		this.level = 0;
		this.experience = 0.0;
		this.lastAttacker = false;
		this.upgradeLevels = [];
		for	(var i = 0; i < ATTRIBUTE_COUNT; i++)
			this.upgradeLevels.push(0);
		//Set by profession
		this.damage = baseDamage(this.profession);
		this.attackRate = baseAttackSpeed(this.profession);
		this.speed = baseSpeed(this.profession);
		this.maxHealth = baseHealth(this.profession);
		this.regeneration = baseRegeneration(this.profession);
		this.arrowRes = baseArrowRes(this.profession);
		this.bombRes = baseBombRes(this.profession);
		this.meleeRes = baseMeleeRes(this.profession);
		this.health = this.maxHealth;
		
		//Send a character added packet to all clients
		var packet = this.spawnPacket();
		for (var i = 0; i < SOCKET_LIST.length; i++)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("c+", packet);
		}
		
		CHARACTER_LIST.push(this);
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
		for (var i = 0; i < SOCKET_LIST.length; i++)
		{
			var socket = SOCKET_LIST[i];
			socket.emit("c-", packet);
		}
		
		for (var i = 0; i < CHARACTER_LIST.length; i++)
		{
			if (CHARACTER_LIST[i].id == this.id)
			{
				CHARACTER_LIST.splice(i, 1);
			}
		}
		
		//Regeneration
		this.health += DELTA_TIME * this.regeneration;
		if (this.health > this.maxHealth)
			this.health = this.maxHealth;
	}
	update()
	{
		if (!super.update())
			return false;
		
		if (this.health <= 0.0)
		{
			if (this.latestAttacker)
				this.latestAttacker.experience += this.experience * 0.5;
			return false;
		}
		
		this.x += Math.cos(this.moveDirection) * this.velocity * DELTA_TIME;
		this.y += Math.sin(this.moveDirection) * this.velocity * DELTA_TIME;
		
		if (this.isAttacking)
		{
			if (this.attackTimer <= 0.0)
			{//Perform attack
				this.attackedSinceLastSync = true;
				switch (this.profession)
				{
				case ARCHER:
					var arrow = new Arrow(this.faction, this.x, this.y, this.attackDirection, 8.0/*speed*/, this.damage, this/*master*/);
					break;
				case BOMBER:
					var bomb = new Bomb(this.faction, this.x, this.y, this.damage, 1.0/*radius*/, 10.0/*timer*/, this/*master*/);
					break;
				case CRUSADER:
					for (var i = 0; i < CHARACTER_LIST.length; i++)
					{
						if (CHARACTER_LIST[i].faction !== this.faction)
						{//Other faction
							
							var distance = CHARACTER_LIST[i].distanceTo(this.x, this.y);
							if (distance < CRUSADER_ATTACK_RANGE)
							{
								var angle = this.angleTo(CHARACTER_LIST[i].x, CHARACTER_LIST[i].y);
								var relativeAngle = angle - this.attackDirection;
								if (relativeAngle < 0)
									relativeAngle += Math.PI * 2.0;
								
								if (distance < 0.5 || 
									(relativeAngle < Math.PI * 0.25 || relativeAngle > Math.PI * 1.75))
								{//Collision
									CHARACTER_LIST[i].health -= CHARACTER_LIST[i].meleeRes * this.damage;
									CHARACTER_LIST[i].latestAttacker = this;
									//console.log("Melee hit! Remaining health: " + CHARACTER_LIST[i].health);
								}
							}
						}
					}
					break;
				}
				this.attackTimer = this.attackRate;
			}
			else
			{//Attack timer tick
				this.attackTimer -= DELTA_TIME;
			}
		}
		
		return true;
	}
	upgrade(attribute)
	{
		switch (attribute)
		{
			case HEALTH: this.maxHealth += 0.1 * baseHealth(this.profession); break;
			case REGENERATION: this.regeneration += 0.1 * baseRegeneration(this.profession); break;
			case SPEED: this.speed += 0.1 * baseSpeed(this.profession); break;
			case DAMAGE: this.damage += 0.1 * baseDamage(this.profession); break;
			case ATTACK_SPEED: this.attackSpeed *= 0.95; break;
			case ARROW_RES: this.arrowRes *= 0.95; break;
			case BOMB_RES: this.bombRes *= 0.95; break;
			case MELEE_RES: this.meleeRes *= 0.95; break;
			default: console.log("Invalid upgrade attribute! :" + attribute); return false;
		}
		this.upgradeLevels[attribute]++;
		return true;
	}
	findClosestEnemy(validProfessionMask, range)
	{
		var closest = false;
		var closestDistance = WIDTH + HEIGHT;//Must be equal or more than the environment max
		for (var i in CHARACTER_LIST)
		{
			var character = CHARACTER_LIST[i];
			if (character.faction !== this.faction && character.profession & validProfessionMask)
			{
				var distance = Math.pow(Math.pow(character.x - this.x, 2.0) + Math.pow(character.y - this.y, 2.0), 0.5);
				if (distance < closestDistance)
				{//Closest
					closest = character;
					closestDistance = distance;
					closestDistance = distance;
				}
			}
		}
		if (closestDistance > range)
			return false;
		return closest;
	}
	findClosestAlly(validProfessionMask, range)
	{
		var closest = false;
		var closestDistance = WIDTH + HEIGHT;//Must be equal or more than the environment max
		for (var i in CHARACTER_LIST)
		{
			var character = CHARACTER_LIST[i];
			if (character.faction === this.faction && character.profession & validProfessionMask)
			{
				var distance = Math.pow(Math.pow(character.x - this.x, 2.0) + Math.pow(character.y - this.y, 2.0), 0.5);
				if (distance < closestDistance)
				{//Closest
					closest = character;
					closestDistance = distance;
					closestDistance = distance;
				}
			}
		}
		if (closestDistance > range)
			return false;
		return closest;
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
		this.pressingRight = false;
		this.pressingLeft = false;
		this.pressingUp = false;
		this.pressingDown = false;
		this.upgradePoints = 10;
		this.syncUpgradePoints = true;
		this.syncUpgradeLevels = true;
		
		PLAYER_LIST.push(this);
	}
	destroy()
	{
		super.destroy();
		if (LOG_ALLOCATIONS)
			console.log("PLAYER DESTRUCTOR");
		
		for (var i = 0; i < PLAYER_LIST.length; i++)
		{
			if (PLAYER_LIST[i].id == this.id)
			{
				PLAYER_LIST.splice(i, 1);
			}
		}
	}
	update()
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
		if (!super.update())
			return false;
		
		//Experience
		if (this.experience > 3.0 + this.level)
		{
			this.level++;
			this.experience = 0.0;
			this.upgradePoints++;
			this.syncUpgradePoints = true;
		}
		
		//Sync upgrade points?
		if (this.syncUpgradePoints)
		{
			var packet = [];
			packet.push(this.upgradePoints)
			for (var i = 0; i < SOCKET_LIST.length; i++)
			{
				var socket = SOCKET_LIST[i];
				if (socket.id == this.id)
					socket.emit("k", packet);
			}
			this.syncUpgradePoints = false;
		}
		
		//Sync upgrade levels?
		if (this.syncUpgradeLevels)
		{
			var packet = [];
			for (var i = 0; i < ATTRIBUTE_COUNT; i++)
				packet.push(this.upgradeLevels[i]);
			for (var i = 0; i < SOCKET_LIST.length; i++)
			{
				var socket = SOCKET_LIST[i];
				if (socket.id == this.id)
					socket.emit("p", packet);
			}
			this.syncUpgradeLevels = false;
		}
		
		//console.log("Position: " + this.x + ", " + this.y);		
		return true;
	}
	upgrade(attribute)
	{
		if (super.upgrade(attribute))
		{
			this.syncUpgradePoints = true;
			this.syncUpgradeLevels = true;
		}
	}
}
///////////
// ENEMY //
///////////
class Enemy extends Character
{
	constructor(_x, _y, _profession, _level)
	{
		super(currentNPCID--, -1/*faction*/, _x, _y, _profession, _profession/*name*/);
		if (LOG_ALLOCATIONS)
			console.log("ENEMY CONSTRUCTOR");
		this.idle = false;
		this.idleTimer = 0.0;
		
		//Random upgrades
		this.experience = 1.0 + _level / 10.0;
		this.level = _level;
		for	(var i = 0; i < _level; i++)
			this.upgrade(Math.floor(Math.random() * ATTRIBUTE_COUNT));
		
		ENEMY_LIST.push(this);
	}
	destroy()
	{
		super.destroy();
				
		if (LOG_ALLOCATIONS)
			console.log("ENEMY DESTRUCTOR");
		
		for (var i = 0; i < ENEMY_LIST.length; i++)
		{
			if (ENEMY_LIST[i].id == this.id)
			{
				ENEMY_LIST.splice(i, 1);
			}
		}
		
		COMMON_EXPERIENCE_POOL += this.experience * 0.5;
	}
	update()
	{
		if (!super.update())
			return false;
		
		switch (this.profession)
		{
		case ARCHER:
			var closest = this.findClosestEnemy(BOMBER, WIDTH + HEIGHT);
			if (!closest)
				closest = this.findClosestEnemy(CRUSADER, WIDTH + HEIGHT);
			if (!closest)
				closest = this.findClosestEnemy(ARCHER, WIDTH + HEIGHT);
			if (closest)
			{
				var distance = this.distanceTo(closest.x, closest.y);
				if (distance < 5.0)
				{//Move away
					this.moveDirection = this.angleTo(closest.x, closest.y) + Math.PI;					
				}
				else
				{//Move towards
					this.moveDirection = this.angleTo(closest.x, closest.y);
				}
				this.attackDirection = this.angleTo(closest.x, closest.y);
				this.velocity = this.speed;	
				this.isAttacking = true;
				this.idle = false;
			}
			else
			{
				this.isAttacking = false;
				this.idle = true;
			}
			break;
		case BOMBER:
			var closest = this.findClosestAlly(ARCHER, WIDTH + HEIGHT);
			if (closest)
			{
				var direction = this.angleTo(closest.x, closest.y);
				var targetX = closest.x + Math.cos(direction + Math.PI * 0.9);
				var targetY = closest.y + Math.sin(direction + Math.PI * 0.9);
				direction = this.angleTo(targetX, targetY);
				this.moveDirection = direction;
				this.attackDirection = direction;
				this.velocity = this.speed;
				this.isAttacking = true;
				this.idle = false;
			}
			else
			{//No allied archers to "protect"
				closest = this.findClosestEnemy(CRUSADER, WIDTH + HEIGHT);
				if (closest)
				{//Target is crusader
					var distance = this.distanceTo(closest.x, closest.y);
					if (distance < CRUSADER_ATTACK_RANGE + 0.5)
					{//Move away
						this.moveDirection = this.angleTo(closest.x, closest.y) + Math.PI;					
					}
					else
					{//Move towards
						this.moveDirection = this.angleTo(closest.x, closest.y);
					}
					this.attackDirection = this.angleTo(closest.x, closest.y);
				}
				else
				{//No enemy crusaders
					closest = this.findClosestEnemy(ARCHER | BOMBER, WIDTH + HEIGHT);
					if (closest)
					{//Target is bomber/archer
						this.moveDirection = this.angleTo(closest.x, closest.y);
						this.attackDirection = this.angleTo(closest.x, closest.y);
					}
				}
			}
			
			if (closest)
			{//Any target was found
				this.velocity = this.speed;
				this.isAttacking = true;
				this.idle = false;
			}
			else
			{//No target
				this.isAttacking = true;
				this.idle = true;
			}
			break;
		case CRUSADER:
			var closest = this.findClosestEnemy(ARCHER | CRUSADER, WIDTH + HEIGHT);
			if (!closest)
				closest = this.findClosestEnemy(BOMBER, WIDTH + HEIGHT);
			if (closest)
			{
				this.moveDirection = this.angleTo(closest.x, closest.y);
				this.attackDirection = this.angleTo(closest.x, closest.y);
				this.velocity = this.speed;
				this.isAttacking = true;
				this.idle = false;
			}
			else
			{
				this.isAttacking = false;
				this.idle = true;
			}
			break;
		}
		
		if (this.idle)
		{
			if (this.idleTimer <= 0.0)
			{
				this.idleTimer = 2.0;
				this.moveDirection = this.angleTo(Math.random() * WIDTH, Math.random() * HEIGHT);
				this.attackDirection = this.moveDirection;
				this.velocity = this.speed * 0.666;
			}
			else
			{
				this.idleTimer -= DELTA_TIME;
			}
		}
		
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
	SOCKET_LIST.push(socket);
	
	//Send create packets of entities
	for (var i = 0; i < ARROW_LIST.length; i++)
	{
		var arrow = ARROW_LIST[i];
		var packet = arrow.spawnPacket();
		socket.emit("a+", packet);
	}
	for (var i = 0; i < BOMB_LIST.length; i++)
	{
		var bomb = BOMB_LIST[i];
		var packet = bomb.spawnPacket();
		socket.emit("b+", packet);
	}
	for (var i = 0; i < CHARACTER_LIST.length; i++)
	{
		var character = CHARACTER_LIST[i];
		var packet = character.spawnPacket();
		socket.emit("c+", packet);
	}
	
	{//Environment
		var environment = 
		{
			width: WIDTH,
			height: HEIGHT,
		};
		socket.emit("e", environment);
	}
	
	{//Wave level
		var packet = [];
		packet.push(WAVE_LEVEL);
		socket.emit("w", packet);
	}
	
	var player;
	
	socket.on("disconnect", function()
	{
		//Remove socket from sockets list
		for (var i = 0; i < SOCKET_LIST.length; i++)
		{
			if (SOCKET_LIST[i].id == socket.id)
			{
				SOCKET_LIST.splice(i, 1);
			}
		}
		
		//Remove character
		for (var i = 0; i < CHARACTER_LIST.length; i++)
		{
			if (CHARACTER_LIST[i].id == socket.id)
			{
				var character = CHARACTER_LIST[i];//Cast to character
				character.destroy();
			}
		}
	});
	
	socket.on("spawn", function(buffer)
	{
		var spawned = false;
		for (var i = 0; i < CHARACTER_LIST.length; i++)
		{
			if (CHARACTER_LIST[i].id == socket.id)
			{
				spawned = true;
				break;
			}
		}
		if (!spawned)
		{
			console.log("Spawning player...");
			//Create character and add to character list
			player = new Player(socket.id, WIDTH / 2, HEIGHT / 2, buffer.profession, buffer.name);
		}
	});
	
	socket.on("u", function(buffer)
	{
		//console.log(buffer[0]);
		if (player)
		{
			player.pressingRight	= ((buffer[0] & 1) !== 0);
			player.pressingUp		= ((buffer[0] & 2) !== 0);
			player.pressingLeft		= ((buffer[0] & 4) !== 0);
			player.pressingDown		= ((buffer[0] & 8) !== 0);
			player.isAttacking		= ((buffer[0] & 16) !== 0);
			player.attackDirection	= buffer[1] / 255.0 * 2.0 * Math.PI;
			//player.attackDirection = Math.PI * 2.0 - player.attackDirection;//HACK: client side rotation is horizontally flipped
		}
	});
	
	socket.on("k", function(buffer)
	{
		if (player && player.upgradePoints > 0)
		{
			player.upgrade(buffer.upgrade);
			player.upgradePoints--;
			console.log(player.name + " upgraded " + buffer.upgrade);
		}
	});
})
//Update and send
setInterval(function()
{
	if (ENEMY_LIST.length > 0.0)
	{//Wave ongoing
		//console.log("Remaining enemies: " + ENEMY_LIST.length);
	}
	else
	{//Intermission
		
		NEXT_WAVE_TIMER -= DELTA_TIME;
		if (PLAYER_LIST.length === 0)
		{//No players present
			NEXT_WAVE_TIMER = INTERMISSION_DURATION;
			WAVE_LEVEL = 0;
		}
		
		if (NEXT_WAVE_TIMER <= 0.0)
		{//Spawn new wave
			WAVE_LEVEL++;
			NEXT_WAVE_TIMER = INTERMISSION_DURATION;
			console.log("Starting wave " + WAVE_LEVEL + "...");
			for (var i = 0; i < PLAYER_LIST.length + WAVE_LEVEL - 1; i++)
			{
				var lvl = Math.floor(Math.random() * Math.pow(WAVE_LEVEL, 0.5) * 3.0);
				if (Math.random() < 0.333)
					new Enemy(Math.random() * WIDTH, Math.random() * HEIGHT, ARCHER, lvl);
				else if (Math.random() < 0.5)
					new Enemy(Math.random() * WIDTH, Math.random() * HEIGHT, BOMBER, lvl);
				else
					new Enemy(Math.random() * WIDTH, Math.random() * HEIGHT, CRUSADER, lvl);
			}
			console.log("Entity count: " + ENTITY_LIST.length);
			console.log("Enemy count: " + ENEMY_LIST.length);
			console.log("Character count: " + CHARACTER_LIST.length);
			
			var packet = [];
			packet.push(WAVE_LEVEL);
			for	(var i = 0; i < SOCKET_LIST.length; i++)
				SOCKET_LIST[i].emit("w", packet);
		}
	}
	
	//Common experience distribution
	if (COMMON_EXPERIENCE_POOL)
	{
		var exp = COMMON_EXPERIENCE_POOL / PLAYER_LIST.length;
		for (var i = 0; i < PLAYER_LIST.length; i++)
			PLAYER_LIST[i].experience += exp;
		COMMON_EXPERIENCE_POOL = 0.0;
	}
	
	//Arrows
	var arrows = [];
	for (var i = 0; i < ARROW_LIST.length;)
	{
		var arrow = ARROW_LIST[i];
		if (!arrow.update())
		{
			arrow.destroy();
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
			i++;
		}
	}
	//Bombs
	var bombs = [];
	for (var i = 0; i < BOMB_LIST.length;)
	{
		var bomb = BOMB_LIST[i];
		if (!bomb.update())
		{
			bomb.destroy();
		}
		else
		{
			bombs.push({
				id: bomb.id,
				x: bomb.x,
				y: bomb.y,
			});
			i++;
		}
	}
	//Characters
	var characters = [];
	for (var i = 0; i < CHARACTER_LIST.length;)
	{
		var character = CHARACTER_LIST[i];
		if (!character.update())
		{
			character.destroy();
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
				isAttacking: character.attackedSinceLastSync,
				health: character.health / character.maxHealth,
			});
			character.attackedSinceLastSync = false;
			i++;
		}
	}
	
	//Construct update packet
	var packet = [];
	packet.push(arrows);
	packet.push(bombs);
	packet.push(characters);
	for (var i = 0; i < SOCKET_LIST.length; i++)
	{
		var socket = SOCKET_LIST[i];
		socket.emit("u", packet);
	}
}, DELTA_TIME * 1000/*to milliseconds*/);
