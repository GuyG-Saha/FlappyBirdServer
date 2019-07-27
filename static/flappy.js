const socket = io();
var myGamePiece;
var myObstacles = [];
var myScore;
var opponents = [];
var parsedName;


function registerPlayer() {
    let keyPressed = false;
    var url_string = window.location.href;
    var url = new URL(url_string);
    parsedName = url.searchParams.get("name");
    console.log(parsedName);
    socket.emit('new_player', parsedName);

    document.addEventListener('keydown', (event) => {
        if (event.keyCode === 32 || event.keyCode === 38) {
            if (!keyPressed) {
                keyPressed = true;
                decreaseGravity();
            }
        }
    });
    document.addEventListener('keyup', (event) => {
        if (event.keyCode === 32 || event.keyCode === 38) {
            if (keyPressed) {
                keyPressed = false;
                increaseGravity();
            }
        }
    });

    myGameArea.canvas.style.userSelect = 'none';
    myGameArea.canvas.addEventListener('mousedown', decreaseGravity);
    myGameArea.canvas.addEventListener('mouseup', increaseGravity);
}

function playerReady() {

    socket.emit('player_ready', parsedName);
}

function startGame() {
    //"#"+((1<<24)*Math.random()|0).toString(16)
    myGamePiece = new component(30, 30, "red", 10, 120);
    myGamePiece.gravity = 0.05;
    myScore = new component("30px", "Consolas", "black", 280, 40, "text");
    myGameArea.start();
}

var myGameArea = {
    canvas: document.createElement("canvas"),
    nextObstacle: undefined,
    gameStarted: false,
    isAlive: true,
    start: function() {
        this.canvas.width = 480;
        this.canvas.height = 270;
        this.context = this.canvas.getContext("2d");
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.frameNo = 0;
        this.isAlive = true;
        this.gameStarted = true;
        this.interval = setInterval(updateGameArea, 20);
    },
    finish: function() {
        this.gameStarted = false;
        clearInterval(this.interval);
        myObstacles = [];
    },
    clear: function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    /* removeGameBoard: function() {
        document.body.removeChild(this.canvas);
    } */
}

function component(width, height, color, x, y, type) {
    this.type = type;
    this.score = 0;
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;
    this.x = x;
    this.y = y;
    this.color = color;
    this.gravity = 0;
    this.gravitySpeed = 0;

    this.update = function () {
        ctx = myGameArea.context;
        if (this.type == "text") {
            ctx.font = this.width + " " + this.height;
            ctx.fillStyle = color;
            ctx.fillText(this.text, this.x, this.y);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    this.newPos = function () {
        this.gravitySpeed += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY + this.gravitySpeed;
        this.hitBottom();
        socket.emit('position', {
            x: this.x,
            y: this.y
        });
    }
    this.hitBottom = function () {
        const rockbottom = myGameArea.canvas.height - this.height;
        if (this.y > rockbottom) {
            this.y = rockbottom;
            this.gravitySpeed = 0;
        }
    }
    this.crashWith = function (otherobj) {
        const myleft = this.x;
        const myright = this.x + (this.width);
        const mytop = this.y;
        const mybottom = this.y + (this.height);
        const otherleft = otherobj.x;
        const otherright = otherobj.x + (otherobj.width);
        const othertop = otherobj.y;
        const otherbottom = otherobj.y + (otherobj.height);
        
        return !((mybottom < othertop) || (mytop > otherbottom) || (myright < otherleft) || (myleft > otherright))
    }
}

function updateGameArea() {
    if (myGameArea.isAlive) {
        for (i = 0; i < myObstacles.length; i += 1) {
            if (myGamePiece.crashWith(myObstacles[i])) {
                myGameArea.isAlive = false;
                socket.emit('player_dead');
                return;
            }
        }
    }
    myGameArea.clear();
    myGameArea.frameNo += 1;
    if (myGameArea.nextObstacle) {
        x = myGameArea.canvas.width;
        const height = myGameArea.nextObstacle.height;
        const gap = myGameArea.nextObstacle.gap;
        myObstacles.push(new component(10, height, "green", x, 0));
        myObstacles.push(new component(10, x - height - gap, "green", x, height + gap));

        delete myGameArea.nextObstacle;
    }

    for (i = 0; i < myObstacles.length; i += 1) {
        myObstacles[i].x += -1;
        myObstacles[i].update();
    }
    ctx = myGameArea.context;
    opponents.forEach(player => {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, 30, 30);
    });

    myScore.text = "SCORE: " + myGameArea.frameNo;
    myScore.update();
    if (myGameArea.isAlive) {
        myGamePiece.newPos();
        myGamePiece.update();
    }
}

let btnDown = false;

function decreaseGravity() {
    if (myGamePiece) {
        btnDown = true;
        myGamePiece.gravity = -0.2;
        setTimeout(() => {
            if (btnDown === true) {
                increaseGravity();
            }
        }, 200);
    }
}

function increaseGravity() {
    if(myGamePiece) {
        btnDown = false;
        myGamePiece.gravity = 0.05;
    }
}

function playerDead() {
    socket.emit('player_dead');
}

socket.on('count_down', (count) => {
    let countDownDiv = document.getElementById("count_down");
    if (count === 0) {
        countDownDiv.innerHTML = "";
        //startGame();
    } else {
        countDownDiv.innerHTML = "game start in " + count;
    }
});

socket.on('start', () => {
    // start the game
    //myGameArea.gameStarted = true;
    let winnerDiv = document.getElementById("winner");
    winnerDiv.innerHTML = "";
    startGame();
});

socket.on('obstacle', (obstacle) => {
    myGameArea.nextObstacle = obstacle;
});

socket.on('finish', (winner) => {
    // display the winner
    //alert('The winner is: ' + winner.name + ', color: ' + winner.color);
    console.log(winner);
    let winnerDiv = document.getElementById("winner");
    winnerDiv.innerHTML = winner.name + " is the winner";
    
    myGameArea.finish();
});

socket.on('state', (players) => {
    //console.log(players);
    opponents = players;
    //opponets = [...players];
});
