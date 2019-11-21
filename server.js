var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var questionManager = require('./js/questions.js');

app.use('/assets', express.static('assets'));


app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});


class Room {
    constructor(roomid) {
        this.roomid = roomid;
        this.startingGame = false;
        this.endingGame = false;
        this.gamestart = false;
        this.gamestate = -1;
        this.player = [];

        this.question = "";
        this.answer = "";
    }
    addPlayer(p) {this.player.push(p);}
    getPlayerById(id) {
        for (var p of this.player) {
            if (p.id == id) return p;
        }
        return null;
    }
}

class Player {
    constructor(name, id, roomid) {
        this.roomid = roomid;
        this.id = id;
        this.name = name;
        this.isready = false;
        this.nextRound = false;
        this.continue1 = false;
        this.points = 0;
        this.lie = "";
        this.submittedlie = false;
        this.answerID = -1;
        this.lieID = -1;
        this.selectedAnswer = false;
        this.selectedBestLie = false;

    }
}

const CREATING_LIE = 0;
const CHOOSING_ANSWER = 1;
const ANSWER_RESULTS = 2;
const CHOOSING_BEST_LIE = 3;
const BEST_LIE_RESULTS = 4;


var rooms = {};


io.on('connection', function(socket) {
    console.log("connected");


    socket.emit('get room id', function(id){
        if (id!="") {
            if (rooms[id] != null) {
                socket.join(id);
                socket.emit('display current view', rooms[id].gamestart, rooms[id].gamestate);
            }
        }
    });


    function setupRoom(roomid) {
      var qq = questionManager.getRandomQuestion();
      rooms[roomid].question = qq.question;
      rooms[roomid].answer = qq.answer[parseInt(qq.answer.length*Math.random())];
      rooms[roomid].gamestate = CREATING_LIE;
    }

    socket.on('submit lie', function(roomid, nameid, lie) {
       if (rooms[roomid]==null)return;
       rooms[roomid].player[nameid-1].lie = lie;
       rooms[roomid].player[nameid-1].submittedlie = true;

       var c = 0;
       for (var p of rooms[roomid].player) {
           if (p.submittedlie) c++;
       }
       io.to(roomid).emit("submitted lie", c, rooms[roomid].player.length);

       if (c==rooms[roomid].player.length) rooms[roomid].gamestate = CHOOSING_ANSWER;
    });

    socket.on('player continue 1', function(roomid, id) {
        if (rooms[roomid]==null)return;

        rooms[roomid].player[id-1].continue1 = true;
        var c = 0;
        for (var p of rooms[roomid].player) {
            if (p.continue1) c++;
        }
        io.to(roomid).emit("player continue 1", c, rooms[roomid].player.length);
        if (c==rooms[roomid].player.length) rooms[roomid].gamestate = CHOOSING_BEST_LIE;
    });

    function resetRound(roomid) {
      for (var i = 0; i < rooms[roomid].player.length; i++) {
        rooms[roomid].player[i].isready = false;
        rooms[roomid].player[i].nextRound = false;
        rooms[roomid].player[i].continue1 = false;
        rooms[roomid].player[i].submittedlie = false;
        rooms[roomid].player[i].selectedAnswer = false;
        rooms[roomid].player[i].selectedBestLie = false;
        rooms[roomid].player[i].lie = "";
        rooms[roomid].player[i].answerID = -1;
        rooms[roomid].player[i].lieID = -1;
      }
      setupRoom(roomid);
    }

    socket.on('player next round', function(roomid, id) {
        if (rooms[roomid]==null)return;

        rooms[roomid].player[id-1].nextRound = true;
        var c = 0;
        for (var p of rooms[roomid].player) {
            if (p.nextRound) c++;
        }
        io.to(roomid).emit("player next round", c, rooms[roomid].player.length);

        if (c==rooms[roomid].player.length) resetRound(roomid);
    });

    socket.on('player selected answer', function(roomid, nameid, aid) {
        if (rooms[roomid]==null)return;

        rooms[roomid].player[nameid-1].answerID = aid;
        rooms[roomid].player[nameid-1].selectedAnswer = true;
        var c = 0;
        for (var p of rooms[roomid].player) {
            if (p.selectedAnswer) c++;
        }
        io.to(roomid).emit("player selected answer", c, rooms[roomid].player.length);

        if (c == rooms[roomid].player.length) {
            calculateResults(roomid);
            rooms[roomid].gamestate = ANSWER_RESULTS;
        }


    });

    socket.on('player selected lie', function(roomid, nameid, lid) {
        if (rooms[roomid]==null)return;

        rooms[roomid].player[nameid-1].lieID = lid;
        rooms[roomid].player[nameid-1].selectedBestLie = true;
        var c = 0;
        for (var p of rooms[roomid].player) {
            if (p.selectedBestLie) c++;
        }
        io.to(roomid).emit("player selected lie", c, rooms[roomid].player.length);

        if (c == rooms[roomid].player.length) {
            calculateBestLie(roomid);
            rooms[roomid].gamestate = BEST_LIE_RESULTS;
        }
    });

    function calculateBestLie(roomid) {
      var pp = [];
      for (var i = 0; i < rooms[roomid].player.length; i++) pp[i] = 0;

      for (var i = 0; i < rooms[roomid].player.length; i++) {
        var ppp = rooms[roomid].player[i];
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


      for (var i =0;i < pM.length; i++) {
        rooms[roomid].player[pM[i]].points = rooms[roomid].player[pM[i]].points + 2;
      }
    }

    function calculateResults(roomid) {
        for (var i = 0; i < rooms[roomid].player.length; i++) {
            var p = rooms[roomid].player[i];
            if (p.answerID == 0) rooms[roomid].player[i].points = rooms[roomid].player[i].points + 2;
            else
                rooms[roomid].player[p.answerID - 1].points = rooms[roomid].player[p.answerID - 1].points + 1;
        }
    }



    socket.on('end game', function(roomid) {
        if (rooms[roomid]==null)return;
        if(rooms[roomid].endingGame)return;
        rooms[roomid].endGame = true;
        rooms[roomid].gamestart = false;
        rooms[roomid].startingGame = false;
        io.to(roomid).emit('game ended');
    });

    socket.on('start game', function(roomid) {
        if (rooms[roomid]==null)return;
        if (rooms[roomid].player.length < 3) return;
        if (rooms[roomid].startingGame) return;
        rooms[roomid].startingGame = true;
        rooms[roomid].endingGame = false;
        rooms[roomid].gamestart = true;

        for (var i = 0; i < rooms[roomid].player.length; i++) {
            rooms[roomid].player[i].points = 0;
        }

        resetRound(roomid);

        io.to(roomid).emit('game start');
    });

    socket.on('get players', function(roomid, cb) {
        if (rooms[roomid]==null) return;
        cb&&cb(rooms[roomid].player);
        return;
    });

    socket.on('get room info', function(roomid, cb) {
        if (rooms[roomid]==null) return;
        cb&&cb(rooms[roomid]);
        return;
    });

    socket.on('join room', function(roomid, name, callback){
        if (rooms[roomid]==null) {
            callback&&callback("null", 0);
            return;
        }
        if (rooms[roomid].gamestart) {
            callback&&callback("started", 0);
            return;
        }
        if (rooms[roomid].player.length > 30) {
            callback&&callback("full", 0);
            return;
        }

        var numPlayers = rooms[roomid].player.length+1;
        socket.join(roomid);
        rooms[roomid].addPlayer(new Player(name, numPlayers, roomid));
        callback&&callback("success", numPlayers);
        io.to(roomid).emit("update players");
    });

    socket.on('create room', function(roomid, name, callback) {

        if (rooms[roomid]!=null) {
            callback&&callback("taken");
            return;
        }

        var ro = new Room(roomid);
        ro.addPlayer(new Player(name, 1, roomid));
        rooms[roomid] = ro;
        socket.join(roomid);
        callback && callback("success");
    });

    socket.on('delete player', function(roomid, id, callback) {
        if (rooms[roomid]==null) return;
        var pl = rooms[roomid].player.slice();
        if (pl.length ==1) {
            delete rooms[roomid];
            callback && callback();
            return;
        }

        for (var i = id; i < pl.length; i++) {
            rooms[roomid].player[i-1].name = pl[i].name;
            rooms[roomid].player[i-1].id = pl[i].id-1;
            rooms[roomid].player[i-1].points = pl[i].points;
        }
        rooms[roomid].player.splice(pl.length-1, 1);
        io.to(roomid).emit('player leave', rooms[roomid].gamestart, id);
        callback && callback();
    });

    socket.on('change player name', function(roomid, id, n) {
        if (rooms[roomid]==null) return;
        rooms[roomid].player[id-1].name = n;
        io.to(roomid).emit("update players");
    });

});


http.listen(8000, function(){
    console.log('listening on *:8000');
});
