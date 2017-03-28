
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

	var mouseX = 0, mouseY = 0, mouseW = 0;
	var mouseW_m = false;

	if (canvas.getContext)
	{
		var ctx = canvas.getContext("2d");
		//ctx.scale(zoom, zoom);
		resizeCanvas();
		
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

		function SpriteObject(_sprite, _x, _y)
		{
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

		var object = new SpriteObject("ball.png", 0, 0);

		var bullets = [];

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
			
			object.draw();
			for(var i = 0; i < bullets.length; i++)
			{
				bullets[i].draw();
			}
			for(var i = 0; i < markers.length; i++)
			{
				markers[i].draw();
			}

			window.requestAnimationFrame(draw);
		}

		function update()
		{
			var speed = 5.0;
			var bulletSpeed = 20.0;
			var zoomSpeed = 0.1;
			window.onkeydown = function(event)
			{
				if (event.keyCode == 65) //a
					object.xspeed = -speed;
				if (event.keyCode == 68) //d
					object.xspeed = speed;
				if (event.keyCode == 83) //s
					object.yspeed = speed;
				if (event.keyCode == 87) //w
					object.yspeed = -speed;

				if (event.keyCode == 32) //space
				{
					bullets.push(new SpriteObject("bullet.png", object.x, object.y));
					bullets[bullets.length - 1].xspeed = bulletSpeed * Math.cos(object.rotation);
					bullets[bullets.length - 1].yspeed = bulletSpeed * Math.sin(object.rotation);
				}
			}
			window.onkeyup = function(event)
			{
				if (event.keyCode == 65) //a
					object.xspeed = 0; 
				if (event.keyCode == 68) //d
					object.xspeed = 0;
				if (event.keyCode == 83) //s
					object.yspeed = 0;
				if (event.keyCode == 87) //w
					object.yspeed = 0;
			}
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

			object.update();
			camera.update();
			for(var i = 0; i < bullets.length; i++)
			{
				bullets[i].update();
			}

				var debugtest = document.getElementById("debugtext");
				debugtext.innerHTML = "mouseX: " + mouseX + ", mouseY: " + mouseY;

			window.requestAnimationFrame(update);
		}

		object.draw();
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