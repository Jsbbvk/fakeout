

function resetAll() {
    $('#create-answer, #selection-answers, #results, #best-lie, #lie-results').css('display','none');

    $("#menu").removeClass('mSlideDown');
    $("#menu").removeClass('mSlideUp');
    document.getElementById('toggleMenuButton').innerHTML = '<i class="fas fa-caret-down"></i>';
    $('#toggleMenuButton').css('top', '100%');
    menuActive = false;

    updateScoreboard();
    updateTriviaQuestion();

    socket.removeAllListeners("player continue 1");
    socket.removeAllListeners("player selected lie");
    socket.removeAllListeners("player next round");
    socket.removeAllListeners("submitted lie");
    socket.removeAllListeners("player selected answer");

}

function setupCreatingLie(cb) {
    resetCreateLieDisplay();
  $('#create_submit-lie-button').on('click', submitLie);
  setupRound();
  cb&&cb();
}

function updateTriviaQuestion() {
    socket.emit('get room info', roomID, function(rm) {
        $('#trivia-question').html(rm.question);
    });
}

function setupRound() {
    updateScoreboard();
    gamestate = CREATING_LIE;
    updateTriviaQuestion();
}

function submitLie() {
    var lie = $('#create_lie').val();
    if (lie=="") return;
    $("#create_lie").attr("readonly", true);

    $('#create_submit-lie-button').off().fadeOut(400);
    $('#create_ready-text').fadeIn(400, function() {
        socket.on('submitted lie', function(numReady, numTotal){
            $('#create_ready-text').text(numReady + " / " + numTotal + " Ready");
            if (numReady / numTotal >= 0.75) $('#create_ready-text').css('color', '#1fb50e');
            else if (numReady / numTotal > 0.5) $('#create_ready-text').css('color', '#f4cd07');
            else $('#create_ready-text').css('color', '#bc3838');

            if (numReady == numTotal) {
                socket.removeAllListeners("submitted lie");
                $('#create-answer').fadeOut(400, function() {
                   resetCreateLieDisplay();
                    displayAnswerSelection(function() {
                        $('#selection-answers').fadeIn(400);
                    });
                });
            }
        });
        socket.emit('submit lie', roomID, nameID, lie);
    });

}

function resetCreateLieDisplay() {
    socket.removeAllListeners("submitted lie");
    $('#create_lie').val("");
    $("#create_lie").attr("readonly", false);
    $('#create_ready-text').css('display','none');
    $('#create_submit-lie-button').css('display','block');
    $('#create_ready-text').css('color', '#bc3838');
    $('#create_ready-text').text("Ready");
}


function displayAnswerSelection(cb) {
    gamestate = CHOOSING_ANSWER;

    socket.emit('get room info', roomID, function(rm) {
        var pl = rm.player;
        document.getElementById("selection-list").innerHTML = "";

        for (var i = 0; i < pl.length; i++) {
            var n = parseInt(Math.random()*pl.length);
            var c = pl[i];
            pl[i] = pl[n];
            pl[n] = c;
        }

        var randN = parseInt(Math.random()*pl.length);
        for (var i = 0; i < pl.length; i++) {
            if (i==randN) {
                var d = document.createElement("DIV");
                d.classList.add("selection-choice");
                d.innerText = rm.answer;
                d.setAttribute("data-aid", 0);
                document.getElementById("selection-list").appendChild(d);
            }

            if (pl[i].id == nameID) {
                document.getElementById("selection_player-answer").innerText = pl[i].lie;
                continue;
            }
            var d1 = document.createElement("DIV");
            d1.classList.add("selection-choice");
            d1.innerText = pl[i].lie;
            d1.setAttribute("data-aid", pl[i].id);
            document.getElementById("selection-list").appendChild(d1);


        }

        setupSelectableAnswers();
        cb&&cb();
    });
}

var selectedAID = -1;
//0 is the answer

function setupSelectableAnswers() {
    $("#chooseAnswerButton").css("background-color", "white");
    $("#chooseAnswerButton").text("Select Answer");

    $("#selection-list").children(".selection-choice").on("click tap", function(e) {
        e.preventDefault();
        if (!$(this).hasClass("selectedAnswer")) {

            for (var c of $("#selection-list").children(".selection-choice")) {
                $(c).removeClass("selectedAnswer");
            }
            $(this).addClass("selectedAnswer");
            selectedAID = $(this).attr("data-aid");

            $("#chooseAnswerButton").css("background-color", "#bdffbd");
            $("#chooseAnswerButton").text("Confirm");

        }
        else {
            $(this).removeClass("selectedAnswer");

            $("#chooseAnswerButton").css("background-color", "white");
            $("#chooseAnswerButton").text("Select Answer");

            selectedAID = -1;
        }
    });

    $('#chooseAnswerButton').off().on('click tap', function(e) {
        e.preventDefault();
        if (selectedAID==-1)return;

        $('#chooseAnswerButton').off();
        $("#selection-list").children(".selection-choice").off();
        $("#chooseAnswerButton").css("background-color", "#40d15d");

        socket.on('player selected answer', function(numReady, numTotal) {
            $("#chooseAnswerButton").text(numReady + " / " + numTotal + " Ready");

            if (numReady==numTotal) {
                socket.removeAllListeners("player selected answer");
                $('#selection-answers').fadeOut(400, function() {
                    updateScoreboard();
                   displayResults(function() {
                       $('#results').fadeIn(400);
                   });
                });
            }
        });

        socket.emit('player selected answer', roomID, nameID, selectedAID);
    });
}

function displayResults(cb) {
    gamestate = ANSWER_RESULTS;


    $("#continue1Button").text("Continue");
    $('#continue1Button').css("background-color","#bdffbd");

    $('#continue1Button').off().on('click tap', function(e) {
        e.preventDefault();
        $(this).off();
        $("#continue1Button").css("background-color", "#40d15d");

        socket.on('player continue 1', function(numReady, numTotal) {
            $("#continue1Button").text(numReady + " / " + numTotal + " Ready");

            if (numReady==numTotal) {
                socket.removeAllListeners("player continue 1");
                $('#results').fadeOut(400);
                displayVotingForLie(function() {
                    $('#best-lie').fadeIn(400);
                });
            }
        });

        socket.emit('player continue 1', roomID, nameID);
    });

    socket.emit('get room info', roomID, function(rm) {
        document.getElementById("results-list").innerHTML = "";
        var pl = rm.player;

        var playersChosenAnswers = [];
        for (var i = 0; i < pl.length+1; i++) {
            playersChosenAnswers[i] = [];
        }

        for (var i = 0; i < pl.length; i++) {
            playersChosenAnswers[pl[i].answerID].push(pl[i]);
        }

        for (var i = 0; i < pl.length+1; i++) {
            var d = document.createElement("DIV");
            d.classList.add("result-choice");
            if (i==0) d.classList.add("result-answer");
            if (i==nameID) d.classList.add("result-pl");

            /* Start title */
            var title = document.createElement("P");
            title.classList.add("result-choice-title");

            var n = document.createElement("SPAN");
            n.classList.add("result-choice-name");
            n.innerText = ((i==0)?"ANSWER": pl[i-1].name);
            if (i==nameID) n.innerText = pl[i-1].name + " (You)";

            var np = document.createElement("SPAN");
            np.classList.add("result-choice-point");
            np.innerText = ((i==0)?"": "+" + playersChosenAnswers[i].length);

            title.appendChild(n); title.appendChild(np);
            d.appendChild(title); d.appendChild(document.createElement("HR"));
            /* End title */

            /* Start Answer */
            var ans = document.createElement("P");
            ans.classList.add("result-choice-text");
            ans.innerText = ((i==0)?rm.answer: pl[i-1].lie);
            d.appendChild(ans); d.appendChild(document.createElement("HR"));
            /* End Answer */

            /* Start Players */
            var sl = document.createElement("DIV");
            sl.classList.add("result-choice-players");
            for (var j = 0; j < playersChosenAnswers[i].length; j++) {
                var slT = document.createElement("P");
                slT.classList.add("result-choice-player-title");
                if (playersChosenAnswers[i][j].id == nameID)
                    slT.classList.add("result-pl");

                var sltN = document.createElement("SPAN");
                sltN.classList.add("result-choice-name");
                sltN.innerText = playersChosenAnswers[i][j].name;
                if (playersChosenAnswers[i][j].id==nameID)
                    sltN.innerText = playersChosenAnswers[i][j].name + " (You)";


                var sltP = document.createElement("SPAN");
                sltP.classList.add("result-choice-point");
                sltP.innerText = ((i==0)?"+2": "");

                slT.appendChild(sltN); slT.appendChild(sltP);
                sl.appendChild(slT);
            }
            d.appendChild(sl);
            /* End Players */


            document.getElementById("results-list").appendChild(d);

        }

        cb&&cb();
    });
}


function displayVotingForLie(cb) {
    gamestate = CHOOSING_BEST_LIE;
  socket.emit('get room info', roomID, function(rm) {
    var pl = rm.player;

    document.getElementById("lie-list").innerHTML = "";

    for (var i = 0; i < pl.length; i++) {
        var n = parseInt(Math.random()*pl.length);
        var c = pl[i];
        pl[i] = pl[n];
        pl[n] = c;
    }

    for (var i = 0; i < pl.length; i++) {

        if (pl[i].id == nameID) {
            document.getElementById("lie_player-answer").innerText = pl[i].lie;
            continue;
        }
        var d1 = document.createElement("DIV");
        d1.classList.add("lie-choice");
        d1.innerText = pl[i].lie;
        d1.setAttribute("data-lid", pl[i].id);
        document.getElementById("lie-list").appendChild(d1);
    }

    setupSelectableLies();
    cb&&cb();
  });
}

var selectedLID = -1;

function setupSelectableLies() {
  $("#chooseLieButton").css("background-color", "white");
  $("#chooseLieButton").text("Select Best Lie");

  $("#lie-list").children(".lie-choice").on("click tap", function(e) {
      e.preventDefault();
      if (!$(this).hasClass("selectedLie")) {

          for (var c of $("#lie-list").children(".lie-choice")) {
              $(c).removeClass("selectedLie");
          }
          $(this).addClass("selectedLie");
          selectedLID = $(this).attr("data-lid");

          $("#chooseLieButton").css("background-color", "#bdffbd");
          $("#chooseLieButton").text("Confirm");

      }
      else {
          $(this).removeClass("selectedLie");

          $("#chooseLieButton").css("background-color", "white");
          $("#chooseLieButton").text("Select Best Lie");

          selectedLID = -1;
      }
  });

  $('#chooseLieButton').off().on('click tap', function(e) {
      e.preventDefault();
      if (selectedLID==-1)return;

      $('#chooseLieButton').off();
      $("#lie-list").children(".lie-choice").off();
      $("#chooseLieButton").css("background-color", "#40d15d");

      socket.on('player selected lie', function(numReady, numTotal) {
          $("#chooseLieButton").text(numReady + " / " + numTotal + " Ready");

          if (numReady==numTotal) {
              socket.removeAllListeners("player selected lie");
              $('#best-lie').fadeOut(400, function() {
                  updateScoreboard();
                 displayLieResults(function() {
                     $('#lie-results').fadeIn(400);
                 });
              });
          }
      });

      socket.emit('player selected lie', roomID, nameID, selectedLID);
  });
}


function displayLieResults(cb) {
    gamestate = BEST_LIE_RESULTS;

    $("#nextRoundButton").text("Next Round");
    $('#nextRoundButton').css("background-color","#bdffbd");

    $('#nextRoundButton').off().on('click tap', function(e) {
        e.preventDefault();
        $(this).off();
        $("#nextRoundButton").css("background-color", "#40d15d");

        socket.on('player next round', function(numReady, numTotal) {
            $("#nextRoundButton").text(numReady + " / " + numTotal + " Ready");

            if (numReady==numTotal) {
                socket.removeAllListeners("player next round");
                $('#playing').fadeOut(400, function(){
                    $('#lie-results').css('display','none');
                    $('#create-answer').css('display','block');
                    setupCreatingLie();
                    $('#playing').fadeIn(400);
                });
            }
        });

        socket.emit('player next round', roomID, nameID);
    });

    socket.emit('get room info', roomID, function(rm) {
      document.getElementById("lie-results-list").innerHTML = "";
      var pl = rm.player;

      var playersChosenLies = [];
      for (var i = 0; i < pl.length; i++) {
          playersChosenLies[i] = [];
      }

      for (var i = 0; i < pl.length; i++) {
          playersChosenLies[pl[i].lieID-1].push(pl[i]);
      }


      var pp = [];
      for (var i = 0; i < pl.length; i++) pp[i] = 0;

      for (var i = 0; i < pl.length; i++) {
        var ppp = pl[i];
        pp[ppp.lieID-1] = pp[ppp.lieID-1] + 1;
      }

      var mx = -1;
      var pM = [];
      for (var i =0; i < pp.length; i++) {
        if (pp[i] > mx) {
          mx = pp[i];
          pM = [];
          pM.push(i);
        } else if (pp[i]==mx) {
          pM.push(i);
        }
      }


      var dList = [];

      for (var i = 0; i < pl.length; i++) {
          var d = document.createElement("DIV");
          d.classList.add("result-choice");
          if (i==nameID-1) d.classList.add("result-pl");

          /* Start title */
          var title = document.createElement("P");
          title.classList.add("result-choice-title");

          var n = document.createElement("SPAN");
          n.classList.add("result-choice-name");
          n.innerText = pl[i].name;
          if (i==nameID-1) n.innerText = pl[i].name + " (You)";

          var np = document.createElement("SPAN");
          np.classList.add("result-choice-point");
          np.innerText = ((pM.includes(i))? "+2" : "");

          title.appendChild(n); title.appendChild(np);
          d.appendChild(title); d.appendChild(document.createElement("HR"));
          /* End title */

          /* Start Answer */
          var ans = document.createElement("P");
          ans.classList.add("result-choice-text");
          ans.innerText = pl[i].lie;
          d.appendChild(ans); d.appendChild(document.createElement("HR"));
          /* End Answer */

          /* Start Players */
          var sl = document.createElement("DIV");
          sl.classList.add("result-choice-players");
          for (var j = 0; j < playersChosenLies[i].length; j++) {
              var slT = document.createElement("P");
              slT.classList.add("result-choice-player-title");
              if (playersChosenLies[i][j].id == nameID)
                  slT.classList.add("result-pl");

              var sltN = document.createElement("SPAN");
              sltN.classList.add("result-choice-name");
              sltN.innerText = playersChosenLies[i][j].name;
              if (playersChosenLies[i][j].id==nameID)
                  sltN.innerText = playersChosenLies[i][j].name + " (You)";


              var sltP = document.createElement("SPAN");
              sltP.classList.add("result-choice-point");
              sltP.innerText = "";

              slT.appendChild(sltN); slT.appendChild(sltP);
              sl.appendChild(slT);
          }
          d.appendChild(sl);
          /* End Players */

          if (pM.includes(i)) dList.unshift(d);
          else dList.push(d);

      }

      for (var dp of dList) {
        document.getElementById("lie-results-list").appendChild(dp);
      }


      cb&&cb();
  });
}
