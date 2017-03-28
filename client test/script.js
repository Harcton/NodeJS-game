
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
			this.xd = 0;
			this.yd = 0;
			this.scale = 0.5;

			this.update = function()
			{
				//this.xd = (mouseX - canvas.width / 2) / 4;
				//this.yd = (mouseY - canvas.height / 2) / 4;

				this.x = object.x * camera.scale - canvas.width / 2 + this.xd;
				this.y = object.y * camera.scale - canvas.height / 2 + this.yd;
			};
		};

		var object = new function()
		{
			this.x = 0;
			this.y = 0;
			this.xs = 0;
			this.ys = 0;
			this.r = 0;
			this.ball = new Image();
			this.indicator = new Image();

			this.ball.src = "ball.png";
			this.indicator.src = "indicator.png";
			
			this.draw = function()
			{
				ctx.translate(-camera.x + (this.x - this.ball.width / 2) * camera.scale, -camera.y + (this.y - this.ball.height / 2) * camera.scale);
				ctx.rotate(this.r);

				ctx.drawImage(this.ball, -this.ball.width / 2 * camera.scale, -this.ball.height / 2 * camera.scale,
				 this.ball.width * camera.scale, this.ball.height * camera.scale);
				ctx.drawImage(this.indicator, -this.ball.width / 2 * camera.scale, -this.ball.height / 2 * camera.scale,
				 this.indicator.width * camera.scale, this.indicator.height * camera.scale);

				ctx.rotate(-this.r);
				ctx.translate(-(-camera.x + (this.x - this.ball.width / 2) * camera.scale), -(-camera.y + (this.y - this.ball.height / 2) * camera.scale));
			};
			this.update = function()
			{
				this.x += this.xs;
				this.y += this.ys;
				this.r = Math.atan2(mouseY - (this.y * camera.scale - camera.y), mouseX - (this.x * camera.scale - camera.x));
			};
		};

		var bullets = [];
		function Bullet(xspeed, yspeed, posx, posy)
		{
			this.x = posx;
			this.y = posy;
			this.xs = xspeed;
			this.ys = yspeed;

			this.bullet = new Image();

			this.bullet.src = "bullet.png";

			this.draw = function()
			{
				ctx.translate(-camera.x + this.x, -camera.y + this.y);
				ctx.drawImage(this.bullet, -this.bullet.width / 2 * camera.scale, -this.bullet.height / 2 * camera.scale,
				 this.bullet.width * camera.scale, this.bullet.height * camera.scale);
				ctx.translate(-(-camera.x + this.x), -(-camera.y + this.y));
			};
			this.update = function()
			{
				this.x += this.xs;
				this.y += this.ys;
			};
		};

		var markers = [];
		function Marker(posx, posy)
		{
			this.x = posx;
			this.y = posy;

			this.marker = new Image();
			this.marker.src = "marker.png";

			this.draw = function()
			{
				ctx.translate(-camera.x + this.x * camera.scale, -camera.y + this.y * camera.scale);
				ctx.drawImage(this.marker, -this.marker.width / 2 * camera.scale, -this.marker.height / 2 * camera.scale,
				 this.marker.width * camera.scale, this.marker.height * camera.scale);
				ctx.translate(-(-camera.x + this.x * camera.scale), -(-camera.y + this.y * camera.scale));
			};
		}
		var markerDistance = 400;
		for (var x = -10; x < 10; x++)
		{
			for (var y = -10; y < 10; y++)
			{
				markers.push(new Marker(x * markerDistance, y * markerDistance));
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
					object.xs = -speed;
				if (event.keyCode == 68) //d
					object.xs = speed;
				if (event.keyCode == 83) //s
					object.ys = speed;
				if (event.keyCode == 87) //w
					object.ys = -speed;

				if (event.keyCode == 32) //space
					bullets.push(new Bullet(bulletSpeed * Math.cos(object.r), bulletSpeed * Math.sin(object.r), object.x, object.y));
			}
			window.onkeyup = function(event)
			{
				if (event.keyCode == 65) //a
					object.xs = 0; 
				if (event.keyCode == 68) //d
					object.xs = 0;
				if (event.keyCode == 83) //s
					object.ys = 0;
				if (event.keyCode == 87) //w
					object.ys = 0;
			}
			canvas.onmousemove = function(event)
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
			camera.scale += mouseW * 0.00015;
			if (camera.scale < 0.1)
				camera.scale = 0.1;

			object.update();
			camera.update();
			for(var i = 0; i < bullets.length; i++)
			{
				var debugtest = document.getElementById("debugtext");
				debugtext.innerHTML = "bullets: " + bullets.length;
				bullets[i].update();
			}
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