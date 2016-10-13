/**
TO DO:
fix delete
add zoom ability
add global parameters
create way to save to mysql database
*/

(function() {
  var width =  window.innerWidth;
  var svg_area;
  var height = window.innerHeight;
  var waveType = "sine";
  var volume = .04;
  var barheight = 39;
  var dragline;
  var lineArray = [];
  var context;
  var dragx;
  var dragy;
  var controls = true;
  var color = "red";
  var lastX;
  var lastY;

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
        .style("background-color", "lightblue")
        .attr("width", width +"px")
        .attr("height", height + "px")
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
    osc.type = "sine";

    var waveArray = new Float32Array(2);
    waveArray[0] = volume;
    waveArray[1] = 0;

    var gainNode = context.createGain();
    osc.connect(gainNode);
    gainNode.connect(context.destination)
    gainNode.gain.setValueCurveAtTime(waveArray, context.currentTime, .9);
    osc.start(0);
    osc.stop(context.currentTime + 5);
  }

  function addFunctionality() {
    svg_area.call(d3.drag()
      .on("start", started)
      .on("drag", dragged)
      .on("end", ended)
    )
  }

  function started() {
    var x1 = d3.event.x;
    var y1 = d3.event.y - barheight;

    dragline.attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x1)
      .attr("y2", y1);
  }

  function dragged() {
    var x2 = d3.event.x;
    var y2 = d3.event.y - barheight;
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
        .attr("stroke-width", "5px")
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
        lineArray.push(line)

        $("#svg_area").off().mousemove(function(e) {
          var x = e.clientX;
          var y = e.clientY - 39;

          for (var j = 0; j < lineArray.length; j++) {
            if (linesIntersect(x, y, lastX, lastY, lineArray[j].attr('x1'), lineArray[j].attr('y1'), lineArray[j].attr('x2'), lineArray[j].attr('y2'))) {
              lineArray[j].style("animation", "");
              playSound(lineArray[j]);
              var storeline = lineArray[j];
                setTimeout(function() {
                  storeline.style("animation", "pluck .4s");
                }, 10);
              }

          }

          lastX = x;
          lastY = y;
        })

      line
        .on("dblclick", function(d,i) {
          d3.select(this).remove();
          lineArray.splice(i, 1);
          resetKeys();
          updateEventListeners();
        });
      /*    .call(d3.drag()
            .on("start", function() {
              dragx = d3.event.x;
              dragy = d3.event.y;
            })
            .on("drag", function() {
              //fix this later
                d3.select(this).attr("transform", function(d) {
                    var x = d3.event.x - dragx,
                    y = d3.event.y - dragy;
                    return "translate(" + x + ", " + y + ")";
                  });

            })
            .on("end", function(d,i) {
                dragx = 0;
                dragy = 0;

                lineArray[i].position = [
                            line.attr('x1'),
                            line.attr('y1'),
                            line.attr('x2'),
                            line.attr('y2')
                          ]
            })
          );*/

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

  function resetKeys() {
    keyMap.clear();
    for (var i = 0; i < lineArray.length; i++) {
      keyMap.set(lineArray[i].key, lineArray[i]);
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
      dragline = createDragLine();
      addFunctionality();
      enableControlMode()

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
    return 50000 / length;
  }

  function updateEventListeners() {
    $("body").unbind();
      $("body").on("keydown", function() {
        keyMap.each(function(value, key) {
          if (event.which == key) {
            pluckString(value);
          }
        })
      }
    )
  }

  function enableControlMode() {
    var source   = $("#control-template").html();
    var template = Handlebars.compile(source);

      $("html").on("keydown", function() {
        if (event.which == 67) {
          if (controls) {
            d3.select("#controls")
              .style("width", width + "px")
              .style("height", height + "px")
              .style("display", "block");
              controls = false;
              keyMap.each(function(value, key) {
                var context = {
                  "wavetype": value.waveType,
                  "release": +value.release * 20,
                  "pitchfactor": value.pitchfactor,
                  "key": value.key,
                  "class": value.line.id
                }
                var html = template(context);
                var midpoint =  getMidpoint(d3.select(value.line));
                d3.select("#controls").append("div")
                  .html(html)
                  .style("position", "absolute")
                  .style("left", midpoint[0]  + "px")
                  .style("top", midpoint[1] + "px")
                  .on("mouseover", function() {
                    d3.select(value.line).attr("stroke", color);
                  })
                  .on("mouseout", function() {
                    d3.select(value.line).attr("stroke", "black");
                  });

                  document.getElementById(value.line.id + "-key").addEventListener("keydown", function(e) {
                      e.preventDefault();
                    d3.select("#" + value.line.id + "-key").property("value", e.which);
                  });

                  //save button
                  d3.select("." + value.line.id).on("click", function() {
                    var line = d3.select(value.line);
                    keyMap.each(function(value, key) {
                      if (d3.select(value.line).attr("stroke") === color) {
                          for (var i = 0; i < lineArray.length; i++) {
                            if (lineArray[i].line.id === value.line.id) {
                                lineArray.splice(i, 1);
                                lineArray.push( {
                                      "waveType": d3.select("#" + value.line.id + "-wave").property("value"),
                                      "release": (d3.select("#" + value.line.id + "-release").property("value") == 0) ? .01 : d3.select("#" + value.line.id + "-release").property("value") / 20,
                                      "position": [
                                                  line.attr('x1'),
                                                  line.attr('y1'),
                                                  line.attr('x2'),
                                                  line.attr('y2')
                                                ],
                                      "pitchfactor": d3.select("#" + value.line.id + "-pitchfactor").property("value"),
                                      "linelength": getLength(line),
                                      "key": d3.select("#" + value.line.id + "-key").property("value"),
                                      "line": line._groups[0][0]
                                    })
                                }
                            }
                            resetKeys();
                          }
                      })
                    });
                  });
          } else {
            d3.select("#controls").style("display", "none");
            d3.selectAll(".control-div").remove();
            controls = true;
          }
        }
      })
  }

  function pluckString(lineData) {
    pluckBegin(lineData);
    playSound(getFrequencyOfLength(lineData.linelength) * lineData.pitchfactor, lineData.waveType, lineData.release);
    setTimeout(function() {pluckEnd(lineData)}, 10);
  }

  function pluckBegin(lineData) {
    d3.select(lineData.line).style("animation", "");
  }

  function pluckEnd(lineData) {
    if (d3.select("#lineshadow-" + lineData.key) != undefined) d3.select("#lineshadow-" + lineData.key).remove();


    d3.select(lineData.line).style("animation", "pluck .4s");

    ///CHANGR SHADOW TO CIRCLE IT WILL BE COOL
    svg_area.append("line")
      .attr("id", "lineshadow-" + lineData.key)
      .attr("x1", d3.select(lineData.line).attr("x1"))
      .attr("y1", d3.select(lineData.line).attr("y1"))
      .attr("y2", d3.select(lineData.line).attr("y2"))
      .attr("x2", d3.select(lineData.line).attr("x2"))
      .style("opacity", .8)
      .style("transition", ".6s");


    setTimeout(function() {
      d3.select("#lineshadow-" + lineData.key).style("stroke", color)
      .style("stroke-width", "50px")
      .style("opacity", 0);
    }, 10);
  }
})();
