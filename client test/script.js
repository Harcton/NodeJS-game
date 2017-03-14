
$(function()
{
	resizeCanvas();
});

$(document).ready(function()
{
	var zoom = 5;
	var canvas = document.getElementById("canvas");

	if (canvas.getContext)
	{
		var ctx = canvas.getContext("2d");
		ctx.scale(1/zoom, 1/zoom);
		resizeCanvas();

		var object = new function()
		{
			this.x = 50;
			this.y = 50;
			this.r = 0;
			this.image = new Image();

			this.image.onload = function()
			{
				ctx.drawImage(this.image, this.x, this.y);
			};
			this.image.src = "vene.png";
			
			this.draw = function()
			{
				ctx.drawImage(this.image, this.x, this.y);
			};
		};

		function draw()
		{
			ctx.fillStyle = '#ccccdd';
			ctx.fillRect(0, 0, canvas.width * zoom, canvas.height * zoom);
			
			ctx.rotate(object.r);
			ctx.translate(-object.x, -object.y);
			object.draw();
			ctx.rotate(-object.r);
			ctx.translate(object.x, object.y);
			object.x++;
			object.r += 0.001;
			window.requestAnimationFrame(draw);
		}

		object.draw();
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
    canvas.css("width", window.innerWidth - 100);
    canvas.css("height", window.innerHeight - 100);
}