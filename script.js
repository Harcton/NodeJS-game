
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
	var mouseW_m = false;
    
    var joinName;
    var joinProfession;
	var joinpopup = document.getElementById("joinpopup");
	var joinpopupOffset = $('#canvas').offset();
	$('#joinpopup').css({left: joinpopupOffset.left + canvas.width / 2 - 150 + "px"});
	$('#joinpopup').css({top: joinpopupOffset.top + canvas.height / 2 - 150 + "px"});

	$('.joinbutton').mousedown(function()
	{
		$('#joinpopup').css({display: 'none'});
		joinName = document.getElementById("joinname").value;
		if($(this).hasClass('archer'))
			joinProfession = 1;
		else if($(this).hasClass('bomber'))
			joinProfession = 2;
		else if($(this).hasClass('crusader'))
			joinProfession = 3;
			
		//Spawn
		socket.emit("spawn", {name: joinName, profession: joinProfession});
	});
	$('.joinbutton').mouseenter(function()
	{
		$(this).css("background-color", getRandomColor());
	});
	$('.joinbutton').mouseleave(function()
	{
		$(this).css("background-color", "#333333");
	});

	function SpriteObject(_sprite, _id, _x, _y, _r)
	{
		this.id = _id;
		this.x = _x;
		this.y = _y;
		this.xspeed = 0;
		this.yspeed = 0;
		this.rotation = _r;
		this.sprite = new Image();
		this.sprite.src = _sprite;
		this.scale = 1.0;
		
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
			if(this.id == myCharacterID)
				this.rotation = Math.atan2(mouseY - (this.y * camera.scale - camera.y), mouseX - (this.x * camera.scale - camera.x));
		};
	};

	if (canvas.getContext)
	{
		var ctx = canvas.getContext("2d");
		//ctx.scale(zoom, zoom);
		resizeCanvas();
		
		//Arrow added
		socket.on("a+", function(packet)
		{//DATA: int id, int faction, float x, float y, float direction, float velocity, float damage
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Arrow added: " + packet.id);
			arrows.push(new SpriteObject("arrow.png", packet.id, packet.x, packet.y, packet.direction));
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
			arrows.push(new SpriteObject("bomb.png", packet.id, packet.x, packet.y, packet.direction));
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
			
			switch (packet.profession)
			{
				case 1:
				characters.push(new SpriteObject("archer.png", packet.id, packet.x, packet.y, 0));		
					break;
				case 2:
				characters.push(new SpriteObject("bomber.png", packet.id, packet.x, packet.y, 0));
					break;
				case 3:
				characters.push(new SpriteObject("crusader.png", packet.id, packet.x, packet.y, 0));	
					break;
				default:
				console.log("error character faction!");
			}
			
			
			if (packet.name == joinName)
			{//My character detected, record ID
				myCharacterID = packet.id;
				playerCharacter = characters[characters.length - 1];
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
					characters.splice(i, 1);
					if (characters[i].id == myCharacterID)
					{
						alert("u ded");
					}
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
			{//DATA: int id, float x, float y, float moveDirection, float attackDirection, float velocity, bool isAttacking, DEBUG/string number
				for(var j = 0; j < characters.length; j++)
				{
					if(characters[j].id == packet[2][i].id)
					{
						characters[j].x = packet[2][i].x;
						characters[j].y = packet[2][i].y;
						if(characters[j] != playerCharacter)
							characters[j].rotation = packet[2][i].attackDirection;
						
						//TODO Rotation/direction/velocity!
					}
				}
			}
		});
		
		//Environment
		socket.on("e", function(packet)
		{//DATA: width, height
			console.log("environment: " + packet.width + ", " + packet.height);
			envWidth = packet.width;
			envHeight = packet.height;
			for (var x = 0; x < envWidth; x += markerDistance)
			{
				for (var y = 0; y < envHeight; x += markerDistance)
				{
					console.log("marker added");
					markers.push(new SpriteObject("marker.png", 0, x, y, Math.random() * 2 * Math.PI));
				}
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
			this.scale = 0.5;

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
		var markerDistance = 100;

		function draw()
		{
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			/*ctx.fillStyle = getRandomColor();
			ctx.fillRect(0, 0, canvas.width, canvas.height);*/
			ctx.fillStyle = canvasColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
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

			for(var i = 0; i < markers.length; i++)
			{
				markers[i].draw();
			}

			window.requestAnimationFrame(draw);
		}

		function update()
		{
			var zoomSpeed = 0.1;
			canvas.onmousemove = function(event)
			{
				mouseX = event.offsetX;
				mouseY = event.offsetY;
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
			camera.scale += mouseW * 0.00015;
			var maxZoom = 0.05;
			if (camera.scale < maxZoom)
				camera.scale = maxZoom;

			camera.update();
			
			for(var i = 0; i < arrows.length; i++)
			{
				arrows[i].update();
			}
			for(var i = 0; i < bombs.length; i++)
			{
				bombs[i].update();
			}
			for(var i = 0; i < characters.length; i++)
			{
				characters[i].update();
			}

				var debugtest = document.getElementById("debugtext");
				debugtext.innerHTML = joinName + ", " + joinProfession + ", " + myCharacterID;

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
