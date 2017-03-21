
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
	var zoom = 1;
	var canvas = document.getElementById("canvas");
	var canvasColor = getRandomColor();

	var mouseX = 0, mouseY = 0;

	if (canvas.getContext)
	{
		var ctx = canvas.getContext("2d");
		ctx.scale(1/zoom, 1/zoom);
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
			this.xs = 0;
			this.ys = 0;

			this.update = function()
			{
				this.x += this.xs;
				this.y += this.ys;

				this.x = object.x - canvas.width / 2;
				this.y = object.y - canvas.height / 2;
			};
		};

		var lines = new function()
		{
			this.amount = 20;

			this.draw = function()
			{
				var lineLength = 5000;
				ctx.fillStyle = '#000000';
				for(var x = 0; x < this.amount; x++)
				{
					for(var y = 0; y < this.amount; y++)
					{
						ctx.beginPath();
						ctx.moveTo(0 - camera.x, y * 100 - camera.y);
						ctx.lineTo(x * 100 - camera.x, y * 100 - camera.y);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(x * 100 - camera.x, 0 - camera.y);
						ctx.lineTo(x * 100 - camera.x, y * 100 - camera.y);
						ctx.stroke();
					}
				}
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
				ctx.translate(-camera.x + this.x, -camera.y + this.y);
				ctx.rotate(this.r);
				ctx.drawImage(this.ball, -this.ball.width / 2, -this.ball.height / 2);
				ctx.drawImage(this.indicator, -this.ball.width / 2, -this.ball.height / 2);
				ctx.rotate(-this.r);
				ctx.translate(-(-camera.x + this.x), -(-camera.y + this.y));
			};
			this.update = function()
			{
				this.x += this.xs;
				this.y += this.ys;
				this.r = Math.atan2(mouseY - (this.y - camera.y), mouseX - (this.x - camera.x));
			};
		};

		function draw()
		{
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = canvasColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			
			lines.draw();
			object.draw();

			window.requestAnimationFrame(draw);
		}

		function update()
		{
			var speed = 5.0;
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

				/*Camera movement
				if (event.keyCode == 37) //<
					camera.xs = -speed;
				if (event.keyCode == 39) //>
					camera.xs = speed;
				if (event.keyCode == 38) //^
					camera.ys = -speed;
				if (event.keyCode == 40) //v
					camera.ys = speed;*/
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

				/*Camera movement
				if (event.keyCode == 37) //<
					camera.xs = 0;
				if (event.keyCode == 39) //>
					camera.xs = 0;
				if (event.keyCode == 38) //^
					camera.ys = 0;
				if (event.keyCode == 40) //v
					camera.ys = 0;*/
			}
			canvas.onmousemove = function(event)
			{
				mouseX = event.pageX;
				mouseY = event.pageY;
			}
			object.update();
			camera.update();
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