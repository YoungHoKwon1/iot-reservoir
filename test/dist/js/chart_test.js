Chart.types.Line.extend({
  name: "LineAlt",
  draw: function () {
    Chart.types.Line.prototype.draw.apply(this, arguments);

    var index = 1;
    var datasetIndex = 0;

    var hasValue = function(item){
      return item.value !== null;
    },
        previousPoint = function (point, collection, index) {
          return Chart.helpers.findPreviousWhere(collection, hasValue, index) || point;
        };

    var ctx = this.chart.ctx;
    var dataset = this.datasets[datasetIndex];
    var pointsWithValues = Chart.helpers.where(dataset.points, hasValue);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.beginPath();
    var point = dataset.points[index];
    ctx.moveTo(point.x, point.y);
    point = dataset.points[index + 1];
    var previous = previousPoint(point, pointsWithValues, index + 1);
    ctx.bezierCurveTo(
      previous.controlPoints.outer.x,
      previous.controlPoints.outer.y,
      point.controlPoints.inner.x,
      point.controlPoints.inner.y,
      point.x,
      point.y
    );
    ctx.stroke();
  }
});

var data = {
  labels: ["Dec", "Jan", "Feb", "March", "April", "May", "June"],
  datasets: [
    {
      label: "My Second dataset",
      fillColor: "rgba(151,187,205,0.2)",
      strokeColor: "rgba(151,187,205,1)",
      pointColor: "rgba(151,187,205,1)",
      pointStrokeColor: "#fff",
      pointHighlightFill: "#fff",
      pointHighlightStroke: "rgba(151,187,205,1)",
      data: [28, 48, 40, 19, 86, 27, 90]
    }
  ]
};


var ctx = document.getElementById("myChart").getContext("2d");
var myLineChart = new Chart(ctx).LineAlt(data);