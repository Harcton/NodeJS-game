
$(function()
{
	resizeCanvas();
});

function getRandomColor() 
{
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++ )
    {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

function getRandomString()
{
	var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var result = '';
	var numLetters = 3 + Math.floor(Math.random() * 4);
	for(var i = 0; i < numLetters; i++)
	{
		result += letters[Math.floor(Math.random() * 26)];
	}
	return result;
};

$(document).ready(function()
{
	var canvas = document.getElementById("canvas");
	var canvasColor = getRandomColor();
	var socket = io();
	var LOG_NETWORK_EVENTS = 0;//0=nothing, 1=one-time events, 2=continuous update

	var myCharacterID;

	//Entity containers
	var arrows = [];
	var bombs = [];
	var characters = [];
	var playerCharacter = 0;

	var mouseX = 0, mouseY = 0, mouseW = 0;
	var offset = $('#canvas').offset();
	var mouseW_m = false;
	
	//const vars
	var ARCHER = 1;
	var BOMBER = 2;
	var CRUSADER = 4;
		
	var movableInterval;
	var pos;
	var mouseSX, mouseSY;
	var movable;
	$('.movable').mousedown(function()
	{
		pos = $(this).position();
		mouseSX = mouseX;
		mouseSY = mouseY;
		movable = $(this);
		movableInterval = setInterval(function()
		{
			movable.css({left: pos.left + (mouseX - mouseSX) + "px"});
			movable.css({top: pos.top + (mouseY - mouseSY) + "px"});
		}, 25);
	});
	$(document).mouseup(function()
	{
		clearInterval(movableInterval);
	});
	$('.movable').mouseenter(function()
	{
		$(this).css("border-color", "#00aa00");
	});
	$('.movable').mouseleave(function()
	{
		$(this).css("border-color", "white");
	});

	$('.titleletter').mouseenter(function()
	{
		$(this).css("color", getRandomColor());
	});
	
	//Upgrade GUI	
	var upgradeTitle = document.getElementById("upgradeTitle");
	var upgradeOpen = true;
	var upgradePoints = 0;

	$('#upgrades').css({display: 'none'});
	$('#upgrades').css({left: offset.left + canvas.width / 1.2 - 150 + "px"});
	$('#upgrades').css({top: offset.top + canvas.height / 3 - 150 + "px"});
	
	$('.upgradebutton').mousedown(function()
	{
		var upgradeIndex = $(this).index() - 1;
		socket.emit("k", {upgrade: upgradeIndex});
	});
	$('.upgradebutton').mouseenter(function()
	{
		$(this).css("border", "1px solid #00ff00");
	});
	$('.upgradebutton').mouseleave(function()
	{
		$(this).css("border", "1px solid white");
	});
	
	var waveLevel = 0;
    
    var joinName;
    var joinProfession;
	var joinpopup = document.getElementById("joinpopup");
	$('#joinpopup').css({left: offset.left + canvas.width / 2 - 150 + "px"});
	$('#joinpopup').css({top: offset.top + canvas.height / 2 - 150 + "px"});

	$('.joinbutton').mousedown(function()
	{
		$('#joinpopup').css({display: 'none'});
		joinName = document.getElementById("joinname").value;
		if(joinName = " ")
			joinName = getRandomString();

		if($(this).hasClass('archer'))
			joinProfession = ARCHER;
		else if($(this).hasClass('bomber'))
			joinProfession = BOMBER;
		else if($(this).hasClass('crusader'))
			joinProfession = CRUSADER;
			
		//Spawn
		socket.emit("spawn", {name: joinName, profession: joinProfession});
		$('#upgrades').css({display: 'initial'});
	});
	$('.joinbutton').mouseenter(function()
	{
		$(this).css("background-color", getRandomColor());
	});
	$('.joinbutton').mouseleave(function()
	{
		$(this).css("background-color", "#333333");
	});

	function SpriteObject(_sprite, _id, _x, _y, _r, _s)
	{
		this.id = _id;
		this.x = _x;
		this.y = _y;
		this.xspeed = 0;
		this.yspeed = 0;
		this.rotation = _r;
		this.scale = _s;

		this.sprite = new Image();
		this.sprite.src = _sprite;
		
		this.draw = function()
		{
			ctx.translate(-camera.x + this.x * camera.scale, -camera.y + this.y * camera.scale);
			ctx.rotate(this.rotation);

			ctx.drawImage(this.sprite, -this.sprite.width / 2 * camera.scale * this.scale, -this.sprite.height / 2 * camera.scale * this.scale,
			this.sprite.width * camera.scale * this.scale, this.sprite.height * camera.scale * this.scale);

			ctx.rotate(-this.rotation);
			ctx.translate(-(-camera.x + this.x * camera.scale), -(-camera.y + this.y * camera.scale));
		};
		this.update = function()
		{
			this.x += this.xspeed;
			this.y += this.yspeed;
		};
	};
	function CharacterObject(_profession, _faction, _id, _x, _y, _r)
	{
		this.id = _id;
		this.x = _x;
		this.y = _y;
		this.xspeed = 0;
		this.yspeed = 0;
		this.health = 1.0;
		this.rotation = _r;
		this.scale = 0.003;
		this.attacking = false;

		this.weaponDistance = 1.0;

		this.character = new Image();
		if(_id == myCharacterID)
		{
			this.character.src = "art/character_player.png";
		}
		else if(_faction == -1)
		{
			this.character.src = "art/character_enemy.png";
		}
		else if (_faction == 1)
		{
			this.character.src = "art/character_ally.png";
		}
		else
		{
			console.log("error faction!");
		}

		this.weapon = new Image();
		switch(_profession)
		{
			case ARCHER:
				this.weapon.src = 'art/crossbow.png';
			break;

			case BOMBER:
				this.weapon.src = 'art/handbomb.png';
			break;

			case CRUSADER:
				this.weapon.src = 'art/spear.png';
			break;
			
			default: console.log("error profession!"); break;
		}
		
		this.draw = function()
		{
			ctx.translate(-camera.x + this.x * camera.scale, -camera.y + this.y * camera.scale);

			//Healthbar

			if(this.id == myCharacterID)
				ctx.fillStyle = '#00ff00';
			else if(this.id > 0)
				ctx.fillStyle = '#0000ff';
			else if(this.id < 0)
				ctx.fillStyle = '#ff0000';
			else
				ctx.fillStyle = '#111111';
			ctx.fillRect((this.x - this.character.width) * this.scale * camera.scale, 
					(this.y - this.character.height) * this.scale * camera.scale, 
					(this.health * 1.0) * camera.scale, 
					0.1 * camera.scale);

			ctx.rotate(this.rotation);

			//Character
			ctx.drawImage(this.character, -this.character.width / 2 * camera.scale * this.scale, 
										-this.character.height / 2 * camera.scale * this.scale,
										this.character.width /2 * camera.scale * this.scale, 
										this.character.height / 2 * camera.scale * this.scale);
			
			//Weapon
			ctx.drawImage(this.weapon, (-this.weapon.width / 2 + Math.abs(Math.cos(this.rotation)) * this.weaponDistance) * camera.scale * this.scale,
										(-this.weapon.height / 2 +  Math.abs(Math.sin(this.rotation)) * this.weaponDistance) * camera.scale * this.scale,
										this.weapon.width * camera.scale * this.scale, 
										this.weapon.height * camera.scale * this.scale);

			ctx.rotate(-this.rotation);
			ctx.translate(-(-camera.x + this.x * camera.scale), -(-camera.y + this.y * camera.scale));
		};
		this.update = function()
		{
			this.x += this.xspeed;
			this.y += this.yspeed;
			if(this.id == myCharacterID)
				this.rotation = Math.atan2(mouseY - (this.y * camera.scale - camera.y), mouseX - (this.x * camera.scale - camera.x));
			
			if(this.attacking)
				this.weaponDistance = 150.0;
			else
				this.weaponDistance *= 0.8;
		};
	};

	if (canvas.getContext)
	{
		var ctx = canvas.getContext("2d");
		//ctx.scale(zoom, zoom);
		resizeCanvas();
		
		//Upgrade packet
		socket.on("k", function(packet)
		{//DATA: upgradePoints
			//console.log("k points: " + packet[0]);
			upgradePoints = packet[0]; //uuuugly
		});
		
		//Upgrade Levels
		socket.on("p", function(packet)
		{//DATA: level array
			//console.log("p");
			for(var i = 0; i < 8; i++)
			{
				$('.upgradebutton').eq(i).children('.upgradelevel').css("width", (packet[i] * 15) + "px");
			}
		});
		
		//Wave level
		socket.on("w", function(packet)
		{//Data: 0: wave level
			waveLevel = packet[0];
		});
		
		//Arrow added
		socket.on("a+", function(packet)
		{//DATA: int id, int faction, float x, float y, float direction, float velocity, float damage
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Arrow added: " + packet.id);
			arrows.push(new SpriteObject("art/arrow.png", packet.id, packet.x, packet.y, packet.direction, 0.005));
		});
		
		//Arrow removed
		socket.on("a-", function(packet)
		{//DATA: int id
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Arrow removed: ID: " + packet.id);
			for(var i = 0; i < arrows.length; i++)
			{
				if(arrows[i].id == packet.id)
				{
					arrows.splice(i, 1);
				}
			}
		});
		
		//Bomb added
		socket.on("b+", function(packet)
		{//DATA: int id, int faction, float x, float y, float damage, float radius, float timer
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Bomb added: " + packet.id);

			if(packet.master == myCharacterID)
				bombs.push(new SpriteObject("art/bomb_own.png", packet.id, packet.x, packet.y, 0, 0.0025));
			else if(packet.faction == 1)
				bombs.push(new SpriteObject("art/bomb_ally.png", packet.id, packet.x, packet.y, 0, 0.0025));
			else if(packet.faction == -1)
				bombs.push(new SpriteObject("art/bomb_enemy.png", packet.id, packet.x, packet.y, 0, 0.0025));
			else
				console.log("invalid faction");
		});
		
		//Bomb removed
		socket.on("b-", function(packet)
		{//DATA: int id
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Bomb removed: ID: " + packet.id);
			for(var i = 0; i < bombs.length; i++)
			{
				if(bombs[i].id == packet.id)
				{
					bombs.splice(i, 1);
				}
			}
		});
		
		//Character added
		socket.on("c+", function(packet)
		{//DATA: int id, int faction, float x, float y, string name, int profession
			
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Character added: " + packet.name + ", ID: " + packet.id + " profession: " + packet.profession);
			
			if (packet.name == joinName)
			{//My character detected, record ID
				myCharacterID = packet.id;
				characters.push(new CharacterObject(packet.profession, packet.faction, packet.id, packet.x, packet.y, 0));
				playerCharacter = characters[characters.length - 1];
			}
			else
			{
				characters.push(new CharacterObject(packet.profession, packet.faction, packet.id, packet.x, packet.y, 0));
			}			
		});
		
		//Character removed
		socket.on("c-", function(packet)
		{//DATA: int id
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Character removed: ID: " + packet.id);
			for(var i = 0; i < characters.length; i++)
			{
				if(characters[i].id == packet.id)
				{
					if (characters[i].id == myCharacterID)
					{
						$('#joinpopup').css({display: 'initial'});
						$('#joinpopup').css({left: offset.left + canvas.width / 2 - 150 + "px"});
						$('#joinpopup').css({top: offset.top + canvas.height / 2 - 150 + "px"});
						$('#upgrades').css({display: 'none'});
					}
					characters.splice(i, 1);
				}
				
			}
		});
		
		//Receive update
		socket.on("u", function(packet)
		{			
			if (LOG_NETWORK_EVENTS >= 2)
				console.log("Update received: Arrows:" + packet[0].length +" Bombs: " + packet[1].length + " Characters: " + packet[2].length);
							
			//Read arrows
			for (var i = 0; i < packet[0].length; i++)
			{//DATA: int id, float x, float y, float direction, float velocity
				for(var j = 0; j < arrows.length; j++)
				{
					if(arrows[j].id == packet[0][i].id)
					{
						arrows[j].x = packet[0][i].x;
						arrows[j].y = packet[0][i].y;
						//TODO Rotation/direction/velocity!
					}
				}
			}
			//Read bombs
			for (var i = 0; i < packet[1].length; i++)
			{//DATA: int id, float x, float y
				for(var j = 0; j < bombs.length; j++)
				{
					if(bombs[j].id == packet[1][i].id)
					{
						bombs[j].x = packet[1][i].x;
						bombs[j].y = packet[1][i].y;
					}
				}
			}
			//Read characters
			for (var i = 0; i < packet[2].length; i++)
			{//DATA: int id, float x, float y, float moveDirection, float attackDirection, float velocity, bool isAttacking, float health
				for(var j = 0; j < characters.length; j++)
				{
					if(characters[j].id == packet[2][i].id)
					{
						characters[j].x = packet[2][i].x;
						characters[j].y = packet[2][i].y;
						if(characters[j] != playerCharacter)
							characters[j].rotation = packet[2][i].attackDirection;
						characters[j].health = packet[2][i].health;
						characters[j].attacking = packet[2][i].isAttacking;
					}
				}
			}
		});
		
		//Environment
		socket.on("e", function(packet)
		{//DATA: width, height
			envWidth = packet.width;
			envHeight = packet.height;
			
			for (var x = markerDistance / 2; x < envWidth;)
			{
				for (var y = markerDistance / 2; y < envHeight;)
				{
					markers.push(new SpriteObject("art/background.png", 0, x, y, Math.random() * 2 * Math.PI, 0.013 + Math.random() * 0.005));
					y += markerDistance;
				}
				x += markerDistance;
			}
		});
		
		//Send update
		var updateBuffer = new Uint8Array(2);
		var needUpdate = true;
		setInterval(function()
		{
			//needupdate?
			socket.emit("u", updateBuffer);
			needUpdate = false;
		}, 1000/200);
		
		//Input management
		document.onkeydown = function(event)
		{
			if (event.keyCode == 68) //D
			{
				updateBuffer[0] |= 1;
				needUpdate = true;
			}
			if (event.keyCode == 87) //W
			{
				updateBuffer[0] |= 2;
				needUpdate = true;
			}
			if (event.keyCode == 65) //A
			{
				updateBuffer[0] |= 4;
				needUpdate = true;
			}
			if (event.keyCode == 83) //S
			{
				updateBuffer[0] |= 8;
				needUpdate = true;
			}
			if (event.keyCode == 32) //SPACE
			{
				updateBuffer[0] |= 16;
				needUpdate = true;
			}
		}
		document.onkeyup = function(event)
		{
			if (event.keyCode == 68) //D
			{
				updateBuffer[0] &= ~1;
				needUpdate = true;
			}
			if (event.keyCode == 87) //W
			{
				updateBuffer[0] &= ~2;
				needUpdate = true;
			}
			if (event.keyCode == 65) //A
			{
				updateBuffer[0] &= ~4;
				needUpdate = true;
			}
			if (event.keyCode == 83) //S
			{
				updateBuffer[0] &= ~8;
				needUpdate = true;
			}
			if (event.keyCode == 32) //SPACE
			{
				updateBuffer[0] &= ~16;
				needUpdate = true;
			}
		}
		//Rotation update		
		setInterval(function()
		{
			if(playerCharacter)
				updateBuffer[1] = playerCharacter.rotation / (Math.PI * 2.0) * 255;
			else
				updateBuffer[1] = 0;
		}, 1000/25);
		
		canvas.oncontextmenu = function(event)
		{
			//Prevent right click menu on canvas
			event.preventDefault();
		};

		var camera = new function()
		{
			this.x = 0;
			this.y = 0;
			this.xlook = 0;
			this.ylook = 0;
			this.scale = 50;

			this.update = function()
			{
				this.xlook = (mouseX - canvas.width / 2) / 4;
				this.ylook = (mouseY - canvas.height / 2) / 4;
								
				if(playerCharacter != 0)
				{
					this.x = playerCharacter.x * camera.scale - canvas.width / 2 + this.xlook;
					this.y = playerCharacter.y * camera.scale - canvas.height / 2 + this.ylook;
				}
			};
		};
		
		var envWidth, envHeight;
		var markers = [];
		var markerDistance = 5;

		function draw()
		{
			ctx.clearRect(-1, -1, canvas.width + 1, canvas.height + 1);
			
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			ctx.fillStyle = canvasColor;
			ctx.fillRect(-camera.x, 
						-camera.y, 
						envWidth * camera.scale,
						envHeight * camera.scale);

			for(var i = 0; i < markers.length; i++)
			{
				markers[i].draw();
			}
			
			for(var i = 0; i < arrows.length; i++)
			{
				arrows[i].draw();
			}
			for(var i = 0; i < bombs.length; i++)
			{
				bombs[i].draw();
			}
			for(var i = 0; i < characters.length; i++)
			{
				characters[i].draw();
			}

			window.requestAnimationFrame(draw);
		}

		function update()
		{
			var zoomSpeed = 0.1;
			document.onmousemove = function(event)
			{
				mouseX = event.pageX;
				mouseY = event.pageY;
			}
			canvas.onmousewheel = function(event)
			{
				mouseW_m = true;
				mouseW = event.wheelDelta;
			}

			if (mouseW_m == true)
			{
				mouseW_m = false;
			}
			else
			{
				mouseW *= 0.9;
			}
			camera.scale += mouseW * 0.0004 * camera.scale;
			
			var maxZoom = 0.05;
			if (camera.scale < maxZoom)
				camera.scale = maxZoom;

			camera.update();
			//console.log("Mouse:" + mouseX + ", " + mouseY);
			
			for(var i = 0; i < arrows.length; i++)
			{
				arrows[i].update();
			}
			for(var i = 0; i < bombs.length; i++)
			{
				//bombs[i].update();
				bombs[i].rotation += 0.05;
			}
			for(var i = 0; i < characters.length; i++)
			{
				characters[i].update();
			}

			for(var i = 0; i < markers.length; i++)
			{
				if(i % 2)
					markers[i].rotation += 0.0016;
				else
					markers[i].rotation -= 0.0016;
			}
			
			upgradeTitle.innerHTML = "UPGRADES | " + upgradePoints;
			
			var waveLevelText = document.getElementById("waveleveltext");
			waveLevelText.innerHTML = "Wave: " + waveLevel;

			var debugtest = document.getElementById("debugtext");
			switch(joinProfession)
			{
				case ARCHER:
					debugtext.innerHTML = joinName + ", Archer";
				break;
				case BOMBER:
					debugtext.innerHTML = joinName + ", Bomber";
				break;
				case CRUSADER:
					debugtext.innerHTML = joinName + ", Crusader";
				break;
				default:
					debugtext.innerHTML = joinName + ", Unknown";
				break;
			}

			window.requestAnimationFrame(update);
		}

		window.requestAnimationFrame(update);
		window.requestAnimationFrame(draw);
	}
	else
	{
		//Canvas not supported...
	}
});

$(window).on('resize', function()
{
	resizeCanvas();
});
function resizeCanvas()
{
    var canvas = $('#canvas');
    canvas.attr("width", window.innerWidth - 100);
    canvas.attr("height", window.innerHeight - 100);
}
