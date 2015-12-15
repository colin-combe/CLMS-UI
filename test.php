<!doctype html>
<html>
	<head>
		<title>Hello Backbone</title>
        <script type="text/javascript" src="./vendor/underscore.js"></script>
        <script type="text/javascript" src="./vendor/zepto.js"></script>
        <script type="text/javascript" src="./vendor/backbone.js"></script>
	</head>
	<body>

		<div id="hello">
		</div>

		<script>
			//<![CDATA[

				var Model = Backbone.Model.extend({
					//~ defaults: {
						//~ title: 'When seagulls attack',
						//~ completed: false
					//~ },
					urlRoot:"./API/v1/"
				});

				var View = Backbone.View.extend({
					render: function(){
						el.innerHTML = JSON.stringify(this.model.attributes);
					}
				});

				var model = new Model({id:'1.php'});
				model.fetch();
				//var View = new View (document.getElementById('hello'));

				document.getElementById('hello').innerHTML =
								JSON.stringify(model.attributes);

			//]]>
		</script>	

	</body>
</html>
