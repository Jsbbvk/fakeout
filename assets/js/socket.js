


const CREATING_LIE = 0;
const CHOOSING_ANSWER = 1;
const ANSWER_RESULTS = 2;
const CHOOSING_BEST_LIE = 3;
const BEST_LIE_RESULTS = 4;

var gamestate = -1;

var isLeaving = false;


window.onpagehide = function() {
    if (!isLeaving) socket.emit('delete player', roomID, nameID);
};


socket.on('get room id', function(cb){
    cb&&cb(roomID);
});


function leave(e) {
    e.preventDefault();
    socket.emit('delete player', roomID, nameID, function() {
        isLeaving = true;
        location.reload();
    });
}

function endGame(e) {
    e.preventDefault();
    socket.emit('end game', roomID);
}


$("#end-game-button").unbind().on("click tap", endGame);
$("#leave-game-button").unbind().on('click tap', leave);

socket.on('game ended', function() {
    backToWaitingRoom(function() {
        displayPrevScore = true;
        displayWaitingRoom();
    });
});

socket.on('display current view', function(gamestart, gs) {
    if (!gamestart) {
        //go to main menu
        backToWaitingRoom(function() {
            displayPrevScore=true;
            displayWaitingRoom();
        });
    } else {

        $('#playing').fadeOut(400, function() {
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

            if (gs == CREATING_LIE && gamestate != gs) {
                resetCreateLieDisplay();
                setupCreatingLie();
                $('#create-answer').css('display','block');
                $('#playing').fadeIn(400);
            } else if (gs==CHOOSING_ANSWER) {
                resetCreateLieDisplay();
                displayAnswerSelection(function() {
                    $('#selection-answers').css('display','block');
                    $('#playing').fadeIn(400);
                });
            } else if (gs==ANSWER_RESULTS) {
                displayResults(function() {
                    $('#results').css('display','block');
                    $('#playing').fadeIn(400);
                });
            } else if (gs==CHOOSING_BEST_LIE) {
                displayVotingForLie(function() {
                    $('#best-lie').css('display','block');
                    $('#playing').fadeIn(400);
                });
            } else if (gs==BEST_LIE_RESULTS) {
                displayLieResults(function() {
                    $('#lie-results').css('display','block');
                    $('#playing').fadeIn(400);
                });
            }
            gamestate = gs;
        });


    }
});


var resetting = false;
socket.on('player leave', function(gamestart, id) {
    if (gamestart && !resetting) {
        //playing
        if (nameID > id) nameID--;
        resetting = true;


        backToWaitingRoom(function() {
            $('#playerLeaveNotification').fadeIn(1500, function() {
                socket.emit('end game', roomID);
            }).fadeOut(400, function() {
                resetting = false;
                displayPrevScore=true;
                displayWaitingRoom();
            });
        });


    } else {
        //waiting
        if (id==nameID) {
            isLeaving = true;
            location.reload();
        } else {
            if (nameID > id) nameID--;

            socket.emit("get players", roomID, function(p){
                displayPlayersInWaiting(p);
            });

        }
    }
});

