/**
TO DO:
allow for deletion
add shift for straight line ability

add global parameters
create way to save to mysql database
create way to load from mysql database

Checkboxes:
Alter string width based on zoom
Alter string pitch based on width and length (more physically modeled)

Hold control + drag to pan
Hover over a string and click delete to delete it
Hold shift + drag to create a straight line
Hold space to move over strings without triggering sound

*/

(function() {
  var width =  window.innerWidth;
  var svg_area;
  var height = window.innerHeight;
  var waveType = "square";
  var volume = .04;
  var barheight = 39;
  var release = .9;
  var dragline;
  var lineArray = [];
  var saveArray = [];
  var context;
  var dragx;
  var dragy;
  var controls = true;
  var color = "red";
  var lastX;
  var lastY;
  var transform = {
    k: 1,
    x: 0,
    y: 0,
  };

  var keyMap = d3.map()

  initDetune();

  function createDragLine() {
    return svg_area.append('g')
    .attr("class", "line")
    .append('line')
      .attr('id', "dragline")
      .attr("stroke", "black")
      .attr("stroke-dasharray", "3,3");
  }

  function createSvgArea() {
    //Add the svg area
    return d3.select("#graphic_area").append("svg")
        .attr("id", "svg_area")
        .attr("width", width +"px")
        .attr("height", height + "px");
  }

  function zoomed() {
    d3.selectAll("line").transition().duration(400).attr("transform", d3.event.transform);
    transform = d3.event.transform;
  }

  function setupAudioContext() {
    window.addEventListener('load', init, false);
    function init() {
      try {
        // Fix up for prefixing
        window.AudioContext = window.AudioContext||window.webkitAudioContext;
        context = new AudioContext();
      }
      catch(e) {
        alert('Web Audio API is not supported in this browser');
      }
    }
  }


  function playSound(line) {
    var osc = context.createOscillator();
    osc.frequency.value = getFrequencyOfLength(getLength(line));
    osc.type = waveType;

    var waveArray = new Float32Array(2);
    waveArray[0] = volume;
    waveArray[1] = 0;

    var gainNode = context.createGain();
    osc.connect(gainNode);
    gainNode.connect(context.destination);
    let thisRelease =
    gainNode.gain.setValueCurveAtTime(waveArray, context.currentTime, release * (getLength(line) / 1000));
    osc.start(0);
    osc.stop(context.currentTime + 5);
  }

  function addFunctionality() {
    svg_area.call(d3.drag()
      .on("start", started)
      .on("drag", dragged)
      .on("end", ended)
    );
  }

  function started() {

    var x1 = d3.mouse(d3.select("#svg_area").node())[0];
    var y1 = d3.mouse(d3.select("#svg_area").node())[1] - barheight;

    x1 = (x1 - transform.x) / transform.k;
    y1 = (y1 - transform.y) / transform.k;

    dragline.attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x1)
      .attr("y2", y1)
      .attr("transform", transform);
  }

  function dragged() {
    var x2 = d3.mouse(d3.select("#svg_area").node())[0];;
    var y2 = d3.mouse(d3.select("#svg_area").node())[1]; - barheight;

    x2 = (x2 - transform.x) / transform.k;
    y2 = (y2 - transform.y) / transform.k;
    dragline.attr("x2", x2)
      .attr("y2", y2);
  }

  function ended() {
    //creates a line, gives id, resets dragline, adds behavior to new line, updates all event listeners
    var line = dragline;
    var i = lineArray.length;
    var length =  getLength(line);
    var linewidth = length * .02;
    if (length > 20) {
      line.attr("id", "line-" + i)
        .attr("class", "pluck-string")
        .attr("stroke-width", 5 / transform.k + "px")
        .attr("stroke-dasharray", "none");
    /*  lineArray.push( {
          "waveType": waveType,
          "release": .7,
          "position": [
                      line.attr('x1'),
                      line.attr('y1'),
                      line.attr('x2'),
                      line.attr('y2')
                    ],
          "pitchfactor": 1,
          "linelength": getLength(line),
          "key": i + 49,
          "line": line._groups[0][0]
        })*/
        lineArray.push({
          "line": line,
          "position": [
                      line.attr('x1'),
                      line.attr('y1'),
                      line.attr('x2'),
                      line.attr('y2')
                    ]
        });

        saveArray.push([line.attr('x1'), line.attr('y1'), line.attr('x2'), line.attr('y2')]);

//        $("#svg_area").off().mousemove(function(e) {

        svg_area.on("mousemove", function() {
          var x = d3.mouse(d3.select("#svg_area").node())[0];
          var y = d3.mouse(d3.select("#svg_area").node())[1];

          for (var j = 0; j < lineArray.length; j++) {
            if (linesIntersect(x, y, lastX, lastY, lineArray[j].line.attr('x1')*transform.k + transform.x, lineArray[j].line.attr('y1')*transform.k + transform.y, lineArray[j].line.attr('x2')*transform.k + transform.x, lineArray[j].line.attr('y2')*transform.k + transform.y)) {
              lineArray[j].line.style("animation", "");
              playSound(lineArray[j].line);
              var storeline = lineArray[j].line;
                setTimeout(function() {
                  storeline.style("animation", "pluck .4s");
                }, 10);
              }

          }

          lastX = x;
          lastY = y;
        })



    } else {
      line.remove();
    }

    dragline = createDragLine();
  }

  function linesIntersect(a, b, c, d, p, q, r, s) {
    var det, gamma, lambda;
     det = (c - a) * (s - q) - (r - p) * (d - b);
     if (det === 0) {
       return false;
     } else {
       lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
       gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
       return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
     }
  }

  function initDetune() {
    setupAudioContext();
    d3.select("body").style("width", width +"px")
    .style("height", height + "px");

    $("body").on("click", function() {
      d3.select("#intro").style("display", "none");
      d3.select("#graphic_area").style("display", "block");

      $("body").off();

      $('#volume').change(function() {
        var val = $('#volume').val();
        volume = val * .001;
      });

      $("#bottom-bar").keypress(function(e) {
        if(e.which == 13 && $('#color').val() != "") {
            color = $('#color').val();
            console.log(color);
        }
      });

      svg_area = createSvgArea();

      let zoom = d3.zoom()
      .scaleExtent([-1, 40])
    //  .translateExtent([[-100, -100], [width + 90, height + 100]])
      .on("zoom", zoomed);

      d3.select("#graphic_area").call(zoom);
      dragline = createDragLine();
      addFunctionality();
    })
  }

  function getLength(selection) {
    var x1 = selection.attr("x1");
    var y1 = selection.attr("y1");
    var x2 = selection.attr("x2");
    var y2 = selection.attr("y2");
    var length = Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));

    return length;
  }

  function getMidpoint(selection) {
    var x1 = +selection.attr("x1");
    var y1 = +selection.attr("y1");
    var x2 = +selection.attr("x2");
    var y2 = +selection.attr("y2");
    return [(x1 + x2) / 2, (y1 + y2) /2];
  }

  function getFrequencyOfLength(length) {
    return 90000 / length;
  }

  $("#save").click(function() {
        makeRequest('assets/d3tun3d.php', saveArray);
  });

  function makeRequest(url, array) {
    console.log(array);
    $.ajax({type: "POST",
           url: 'assets/d3tun3d.php',
           data: "array=" + array,
           processData: false,
           success: function(response) {
               console.log(response);
           }
    });
  }

})();
