/**
TO DO:
allow for deletion
make global parameters work
create example json files
*/

(function() {
  let width = window.innerWidth;
  let svg_area;
  let height = window.innerHeight;

  // global parameters for the sound of strings
  let waveType = "triangle";
  let volume = .04;
  let release = .9;
  let zoom2width = true;
  let width2pitch = false;
  let repitch = 1;
  let stringColor = "black";
  let backgroundColor = "white";

  let dragline;
  let lineArray = [];
  let saveArray = [];
  let context;
  let dragx;
  let dragy;
  let controls = true;

  // stores last mouse position
  let lastX;
  let lastY;

  let deleteMode = false;

  //stores current transform;
  let transform = {
      "k": 1,
      "x": 0,
      "y": 0
    };
  //start program
  initDetune();

  //creates the dotted line seen when dragging
  function createDragLine() {
    return svg_area.append('g')
    .attr("class", "line")
    .append('line')
      .attr('id', "dragline")
      .attr("stroke", "black")
      .attr("stroke-dasharray", "3,3");
  }

  //creates the svg area
  function createSvgArea() {
    //Add the svg area
    return d3.select("#graphic_area").append("svg")
        .attr("id", "svg_area")
        .attr("height", height + "px");
  }

  // zooms every line over 400ms, stores this info in global variable transform
  function zoomed() {
    d3.selectAll("line").transition().duration(400).attr("transform", d3.event.transform);
    transform = d3.event.transform;
  }

  //does exactly that
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

  //creates the sound for a given line; oscillator, volume, and release based on global parameters, pitch based on line length
  function playSound(line) {
    let osc = context.createOscillator();
    osc.frequency.value = getFrequencyOfLength(getLength(line));
    osc.type = waveType;

    let waveArray = new Float32Array(2);
    waveArray[0] = volume;
    waveArray[1] = 0;

    let gainNode = context.createGain();
    osc.connect(gainNode);
    gainNode.connect(context.destination);
    gainNode.gain.setValueCurveAtTime(waveArray, context.currentTime, release);
    osc.start(0);
    osc.stop(context.currentTime + release);
  }

  //adds drag functionality to the main svg
  function addFunctionality() {
    svg_area.call(d3.drag()
      .on("start", started)
      .on("drag", dragged)
      .on("end", ended)
    );
  }

  //creates the starting point of the drag line based on mouse location, accounting for scale factor
  function started() {

    let x1 = d3.mouse(d3.select("#svg_area").node())[0];
    let y1 = d3.mouse(d3.select("#svg_area").node())[1];

    // adjusting for current scale and zoom
    x1 = (x1 - transform.x) / transform.k;
    y1 = (y1 - transform.y) / transform.k;

    dragline.attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x1)
      .attr("y2", y1)
      .attr("transform", transform);
  }

  // moves end point of the line to the current mouse location
  function dragged() {
    let x2 = d3.mouse(d3.select("#svg_area").node())[0];
    let y2 = d3.mouse(d3.select("#svg_area").node())[1];

    x2 = (x2 - transform.x) / transform.k;
    y2 = (y2 - transform.y) / transform.k;
    dragline.attr("x2", x2)
      .attr("y2", y2);

    document.getElementById("length").innerHTML = "Length: " + parseInt(getLength(dragline), 10);

  }

  // creates an actual line, stores its selecion and location, and adds mouseover functionality.
  function ended() {
    //creates a line, gives id, resets dragline, adds behavior to new line, updates all event listeners
    let line = dragline;
    let i = lineArray.length;
    let length =  getLength(line);
    let linewidth = length * .02;
    if (length > 20 / transform.k) {
      line.attr("id", "line-" + i)
        .attr("class", "pluck-string")
        .attr("stroke", stringColor)
        .attr("stroke-width", 5 / transform.k + "px")
        .attr("stroke-dasharray", "none");
        lineArray.push({
          "line": line,
          "position": [
                      line.attr('x1'),
                      line.attr('y1'),
                      line.attr('x2'),
                      line.attr('y2')
                    ]
        });
        saveArray.push({"line": "",
        "position": [line.attr('x1'), line.attr('y1'), line.attr('x2'), line.attr('y2')]
        });
        updateLineListeners();
    } else {
      //don't allow lines which are too short
      line.remove();
    }
      //reset the dragline
    dragline = createDragLine();
  }

  //calculates whether two lines intersect based on endpoints - based on posts here http://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
  function linesIntersect(a, b, c, d, p, q, r, s) {
    let det, gamma, lambda;
     det = (c - a) * (s - q) - (r - p) * (d - b);
     if (det === 0) {
       return false;
     } else {
       lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
       gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
       return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
     }
  }

  //sets up audio context, adds click functionality and intro screen, sets up svg area
  function initDetune() {
    setupAudioContext();
    setupLoad();
  //create intro to fill screen
    d3.select("#intro").style("width", width +"px")
    .style("height", height + "px");

  //remove intro on click, add functionality to sidebar buttons
    $("#intro").on("click", function() {
      d3.select("#intro").style("display", "none");
      d3.select("#graphic_area").style("display", "block");
      d3.select("#top-bar")
        .style("display", "block")
        .style("height", height + "px")
        .style("border-right", "3px solid red");

      setupListeners();

      svg_area = createSvgArea();
      dragline = createDragLine();

      let zoom = d3.zoom()
      .scaleExtent([-2, 10])
      .on("zoom", zoomed);

      d3.select("#graphic_area").call(zoom);

      addFunctionality();
    })
  }

  // adds functionality to side bar buttons
  function setupListeners() {
    $('#volume').change(function() {
      let val = $('#volume').val();
      volume = val * .001;
    });

    $("#stringcolor").change(function() {
      stringColor = $("#stringcolor").val();
      svg_area.selectAll("line").style("stroke", stringColor);
    });

    $("#backgroundcolor").change(function() {
      backgroundColor = $("#backgroundcolor").val()
      svg_area.style("background-color", backgroundColor);
    });

    $('#release').change(function() {
      let val = ($('#release').val() != 0) ? $('#release').val() : 1
      release = val / 30;
    });

    $("#reset").click(function() {
      svg_area.selectAll("line").remove();
      lineArray = [];
      d3.select("#dragline").remove();
      dragline = createDragLine();
    });

    $("#save").click(function() {save();});

    $("#load").click(function() {
      $("#fileupload").click();
    })


    $("#instructions").click(function() {
      if ($("#instruction_area").css("display") == "none") {
        d3.select("#instruction_area")
          .style("display", "block")
          .style("width", width)
          .style("height", height);

        d3.select("#svg_area")
          .style("display", "none");
      } else {
        d3.select("#instruction_area").style("display", "none");
        d3.select("#svg_area").style("display", "block");
      }

    })

    $('#switch_sine').click(function() {switchTo('sine');})
    $('#switch_square').click(function() {switchTo('square');})
    $('#switch_triangle').click(function() {switchTo('triangle');})

    document.addEventListener("keydown", function(event) {
      if (event.which == 8) {
        deleteMode = !deleteMode;
      }

      if (deleteMode) {
        $("#svg_area").css('opacity', .5);
      } else {
        $("#svg_area").css("opacity", 1);
      }
    })
  }

  //gets the length of a line given its d3 selection
  function getLength(selection) {
    let x1 = selection.attr("x1");
    let y1 = selection.attr("y1");
    let x2 = selection.attr("x2");
    let y2 = selection.attr("y2");
    let length = Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));

    return length;
  }

  // naive version of frequency calculation based on length of string - doesn't account for tension, material, etc.
  function getFrequencyOfLength(length) {
    return 110000 / length;
  }

  // adds mouseover functionality to all of the strings currently in lineArray
  function updateLineListeners() {
    svg_area.on("mousemove", function() {
      let x = d3.mouse(d3.select("#svg_area").node())[0];
      let y = d3.mouse(d3.select("#svg_area").node())[1];

      for (let j = 0; j < lineArray.length; j++) {
        // if the line segment formed by the last mouse position and the current mouse position intersects one of the drawn lines, animate that line and play a sound
        if (linesIntersect(x, y, lastX, lastY, lineArray[j].line.attr('x1')*transform.k + transform.x, lineArray[j].line.attr('y1')*transform.k + transform.y, lineArray[j].line.attr('x2')*transform.k + transform.x, lineArray[j].line.attr('y2')*transform.k + transform.y)) {
          if (!deleteMode) {
            lineArray[j].line.style("animation", "");
            playSound(lineArray[j].line);

            let storeline = lineArray[j].line;
              setTimeout(function() {
                document.getElementById("length").innerHTML = "Length: " + parseInt(getLength(storeline), 10);
                  storeline.style("animation", "pluck .4s");
              }, 10);
            } else {
              lineArray[j].line.remove();
              lineArray.splice(j, 1);
            }
          }

      }
      // store mouse location
      lastX = x;
      lastY = y;
    })
  }

  // saves the current arrangement of strings
  function save() {
    let jsonSave = {
      "waveType": waveType,
      "volume": volume,
      "release": release,
      "zoom2width": zoom2width,
      "width2pitch": width2pitch,
      "repitch": repitch,
      "stringColor": stringColor,
      "backgroundColor": backgroundColor,
      "transform": transform,
      "strings": saveArray
    }

    let d3tunedsave = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonSave));
    let savelink = document.createElement('a');
    savelink.href = 'data:' + d3tunedsave;
    savelink.download = 'd3tunedsave.json';
    savelink.id = "saving";

    document.getElementById('buttons').appendChild(savelink);
    savelink.click();
    savelink.remove();
  }

  function setupLoad() {
    window.onload = function() {
      let fileupload = document.getElementById('fileupload');
        fileupload.addEventListener('change', function(e) {
          let file = fileupload.files[0];
          let reader = new FileReader();
          reader.onload = function(e) {
              result = reader.result;
              load(JSON.parse(result));
          }
          reader.readAsText(file);
        });
      }
  }

// loads json file containing parameter and string data and creates the screen and adds functionality
  function load(result) {
    waveType = result.waveType;
    volume = result.volume;
    release = result.release;
    width2pitch = result.width2pitch;
    zoom2width = result.zoom2width;
    repitch = result.repitch;
    stringColor = result.stringColor;
    backgroundColor = result.backgroundColor;
    transform = result.transform;
    saveArray = result.strings;

    $("#backgroundcolor").val(backgroundColor);
    $("#svg_area").css("background-color", backgroundColor);
    $("#stringcolor").val(stringColor);

    svg_area.selectAll("line").remove();

    lineArray = [];

    for (let i = 0; i < saveArray.length; i++) {
      let line = svg_area.append("line");
      line.attr("id", "line-" + i)
        .attr("class", "pluck-string")
        .attr("stroke", stringColor)
        .attr("stroke-width", 5 / transform.k + "px")
        .attr("stroke-dasharray", "none")
        .attr("x1", saveArray[i].position[0])
        .attr("y1", saveArray[i].position[1])
        .attr("x2", saveArray[i].position[2])
        .attr("y2", saveArray[i].position[3]);

        lineArray.push({
          "line": line,
          "position": [
                      line.attr('x1'),
                      line.attr('y1'),
                      line.attr('x2'),
                      line.attr('y2')
                    ]
        });

    }

    d3.select("#dragline").remove();
    dragline = createDragLine();
    transform = result.transform;
    updateLineListeners();
  }

  function switchTo(newWaveType) {
     waveType = newWaveType;
     let id = "switch_" + waveType;
     d3.selectAll(".waveSelection").style("border", "2px solid lightgray");
     d3.select("#" + id).style("border", "2px solid black");
  }

})();
