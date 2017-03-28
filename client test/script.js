
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
	var arrows = {};
	var bombs = {};
	var characters = {};
	var playerCharacter;

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

	function SpriteObject(_sprite, _id, _x, _y, _r)
	{
		this.id = _id;
		this.x = _x;
		this.y = _y;
		this.xspeed = 0;
		this.yspeed = 0;
		this.rotation = 0;
		this.sprite = new Image();
		this.sprite.src = _sprite;
		
		this.draw = function()
		{
			ctx.translate(-camera.x + this.x * camera.scale, -camera.y + this.y * camera.scale);
			ctx.rotate(this.rotation);

			ctx.drawImage(this.sprite, -this.sprite.width / 2 * camera.scale, -this.sprite.height / 2 * camera.scale,
			 this.sprite.width * camera.scale, this.sprite.height * camera.scale);

			ctx.rotate(-this.rotation);
			ctx.translate(-(-camera.x + this.x * camera.scale), -(-camera.y + this.y * camera.scale));
		};
		this.update = function()
		{
			this.x += this.xspeed;
			this.y += this.yspeed;
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
			arrows.push(new SpriteObject("arrow.png", packet.id, packet.x, packet.y, packet.direction)); //TO BE CONTINUED FROM HERE...
		});
		
		//Arrow removed
		socket.on("a-", function(packet)
		{//DATA: int id
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Arrow removed: ID: " + packet.id);
		});
		
		//Bomb added
		socket.on("b+", function(packet)
		{//DATA: int id, int faction, float x, float y, float damage, float timer
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Bomb added: " + packet.id);
		});
		
		//Bomb removed
		socket.on("b-", function(packet)
		{//DATA: int id
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Bomb removed: ID: " + packet.id);
		});
		
		//Character added
		socket.on("c+", function(packet)
		{//DATA: int id, int faction, float x, float y, string name, int profession
			
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Character added: " + packet.name + ", ID: " + packet.id + " profession: " + packet.profession);
			
			if (packet.name == joinName)
			{//My character detected, record ID
				myCharacterID = packet.id;
			}
		});
		
		//Character removed
		socket.on("c-", function(packet)
		{//DATA: int id
			if (LOG_NETWORK_EVENTS >= 1)
				console.log("Character removed: ID: " + packet.id);
		});
		
		//Receive update
		socket.on("u", function(packet)
		{
			ctx.clearRect(0, 0, 500, 500);
			ctx.fillStyle = "black";
			
			if (LOG_NETWORK_EVENTS >= 2)
				console.log("Update received: Arrows:" + packet[0].length +" Bombs: " + packet[1].length + " Ccharacters: " + packet[2].length);
			
			//Read arrows
			for (var i = 0; i < packet[0].length; i++)
			{//DATA: int id, float x, float y, float direction, float velocity
				ctx.fillText("*", packet[0][i].x, packet[0][i].y);
			}
			//Read bombs
			for (var i = 0; i < packet[1].length; i++)
			{//DATA: int id, float x, float y
				ctx.fillText("+", packet[1][i].x, packet[1][i].y);
			}
			//Read characters
			for (var i = 0; i < packet[2].length; i++)
			{//DATA: int id, float x, float y, float moveDirection, float attackDirection, float velocity, bool isAttacking, DEBUG/string number
				ctx.fillText(packet[2][i].number, packet[2][i].x, packet[2][i].y);
			}
		});
		
		//Send update
		var updateBuffer = new Uint8Array(2);
		var needUpdate = true;
		setInterval(function()
		{
			if (needUpdate)
			{
				socket.emit("u", updateBuffer);
				needUpdate = false;
			}
		}, 1000/200);
		
		//Input management
		document.onkeydown = function(event)
		{
			if (event.keyCode == 68)
			{
				updateBuffer[0] |= 1;
				needUpdate = true;
			}
			if (event.keyCode == 87)
			{
				updateBuffer[0] |= 2;
				needUpdate = true;
			}
			if (event.keyCode == 65)
			{
				updateBuffer[0] |= 4;
				needUpdate = true;
			}
			if (event.keyCode == 83)
			{
				updateBuffer[0] |= 8;
				needUpdate = true;
			}
			if (event.keyCode == 32)
			{
				updateBuffer[0] |= 16;
				needUpdate = true;
			}
		}
		document.onkeyup = function(event)
		{
			if (event.keyCode == 68)
			{
				updateBuffer[0] &= ~1;
				needUpdate = true;
			}
			if (event.keyCode == 87)
			{
				updateBuffer[0] &= ~2;
				needUpdate = true;
			}
			if (event.keyCode == 65)
			{
				updateBuffer[0] &= ~4;
				needUpdate = true;
			}
			if (event.keyCode == 83)
			{			
				updateBuffer[0] &= ~8;
				needUpdate = true;
			}
			if (event.keyCode == 32)
			{
				updateBuffer[0] &= ~16;
				needUpdate = true;
			}
		}				
		setInterval(function()
		{
			updateBuffer[1] = 0 / Math.PI * 2.0 * 255;
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

				this.x = object.x * camera.scale - canvas.width / 2 + this.xlook;
				this.y = object.y * camera.scale - canvas.height / 2 + this.ylook;
			};
		};

		var markers = [];
		var markerDistance = 400;
		for (var x = -10; x < 10; x++)
		{
			for (var y = -10; y < 10; y++)
			{
				markers.push(new SpriteObject("marker.png", x * markerDistance, y * markerDistance));
			}
		}

		function draw()
		{
			ctx.clearRect(0, 0, canvas.width, canvas.height);
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
				debugtext.innerHTML = joinName + ", " + joinProfession;

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