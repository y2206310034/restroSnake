var chessBoard;//游戏场地
var squareSet;//游戏场地的地砖

var mainSnake;//玩家控制的蛇
var mainSnakeColor = "#6495ED";//玩家蛇的颜色
var snake = [];//蛇的集合，所有的蛇都存放在这里，包括玩家控制的蛇。玩家控制的蛇是第0个元素

var maxThingSize = 10;//允许存在的物体数量，在核心代码中，物体只有食物一个种类。可以通过扩展类来进行扩展。
var things = [];//所有生成的物体存放在这个集合中

var toward = {DOWN:{x:0, y:1},LEFT:{x:-1, y:0},UP:{x:0, y:-1},RIGHT:{x:1, y:0}};//方向枚举

var frame = 40;//刷新频率，40代表1s中刷新40次
var is3D = false;//是否有3D效果，无需设置，当引入T3D.js文件时会自动修改
var isStart = false;//标识游戏是否正在运行
var timer;//游戏刷新频率的定时器

var allowCrashSelf = true;//是否允许穿过自身，当前为预留字段。

function clone(obj) {//对象克隆方法，可以将一个对象克隆生成一个新的并且一模一样的对象。
    return JSON.parse(JSON.stringify(obj));
}

function Snake(headX, headY, nowToward, length, bgColor) {//贪吃蛇的模型类，参数分别是，蛇头的坐标，初始朝向，长度，背景颜色
    this.snakeBody = [];//贪吃蛇存放身体的集合
    this.nowToward = nowToward;//贪吃蛇当前蛇头的朝向
    this.headMoveX = nowToward.x;//横向移动速度
    this.headMoveY = nowToward.y;//纵向移动速度
    this.bgColor = bgColor;//背景颜色
    this.changeToward = null;//修改移动方向，当玩家或者AI修改方向时，会先更新这个字段，当判定可以转向后统一进行转向。由于刷新频率的存在，这种方式可以有效的放置快速连续点击造成的异常
    this.changeNextStation = 0;//点击间隔计时器，当用户或AI进行一次转向之后，并不可以连续转向，所以此时这个字段会设置一个值，每次刷新减一，当减为零时可以再次转换方向
    this.init = function (headX, headY, length, bgColor) {
        //初始化蛇
        for (var i = 0 ; i < length ; i ++) {
            //根据长度调用grow方法即可完成初始化
            this.grow(headX, headY, bgColor);
        }
    }
    this.grow = function (headX, headY, bgColor) {
        //成长方法，在初始化和吃食物时会被调用， 分为三种情况。蛇的成长是在蛇尾部位添加一个身体关节。
        var ball;
        if (this.snakeBody.length == 0) {
            //蛇身长度为0，此时生成的是蛇头，所以坐标由用户设置
            ball = createBall(headX, headY, "&nbsp;", bgColor);
        } else if (this.snakeBody[this.snakeBody.length - 1].point.length == 0) {
            //蛇尾距离蛇头之间没有拐点
            var lastBody = this.snakeBody[this.snakeBody.length - 1];
            ball = createBall(lastBody.lx + -1 * this.nowToward.x * 20, lastBody.ly + -1 * this.nowToward.y * 20, "&nbsp;", bgColor);
        } else {
            //蛇尾距离蛇头有拐点，遵循拐点方向
            var lastBody = this.snakeBody[this.snakeBody.length - 1];
            var point = lastBody.point[0];
            ball = createBall(lastBody.lx + -1 * point.speedX * 20, lastBody.ly + -1 * point.speedY * 20, "&nbsp;", bgColor);
            ball.point = clone(lastBody.point);
        }
        this.snakeBody.push(ball);
    }
    this.turnUp = function () {
        //向上转动
        this.nowToward = toward.UP;
        change(this, 0,-1);
    }
    this.turnDown = function () {
        //向下转动
        this.nowToward = toward.DOWN;
        change(this, 0,1);
    }
    this.turnLeft = function () {
        //向左转动
        this.nowToward = toward.LEFT;
        change(this, -1,0);
    }
    this.turnRight = function () {
        //向右转动
        this.nowToward = toward.RIGHT;
        change(this, 1,0);
    }
    this.over = function () {
        if (mainSnake == this) {
            clearInterval(timer);
            alert("游戏结束");
        } else {
            for (var i = 0 ; i < this.snakeBody.length ; i ++) {
                chessBoard.removeChild(this.snakeBody[i]);
                this.snakeBody[i].display = "none";
                thingFactory.createThing(this.snakeBody[i].lx, this.snakeBody[i].ly, thingFactory.typeEnums.food, )
            }
        }
    }
    this.init(headX, headY, length, bgColor);
}

var thingFactory = {
    //创建物体的工厂，在核心代码中只有一种类型——食物
    autoGenerateTimer: null,
    typeEnums: {
        //物体类型枚举，如果需要进行扩展，可以添加新的枚举类型。
        food: {
            name: "food", value:2, text: "+", bgColor: "#228B22", fgColor: "black",
            act:function (origin) {
                //当蛇触碰到物体时会触发的动作
                origin.grow(null, null, origin.bgColor);
            }
        }
    },
    createThing : function (x, y, type) {//创建物体
        var temp = createBall(x, y, type.text, type.bgColor, type.fgColor);//调用基础的createBall方法来创建一个物体模型
        temp.value = type.value;
        temp.act = this.typeEnums.food.act;
        things.push(temp);
        return temp;
    },
    randomGenerate: function () {//随机生成物体
        var x = parseInt(Math.random() * 480);
        var y = parseInt(Math.random() * 480);
        var temp = createBall(x, y, this.typeEnums.food.text, this.typeEnums.food.bgColor, this.typeEnums.food.fgColor);
        temp.act = this.typeEnums.food.act;
        things.push(temp);
    },
    autoGenerate: function () {//自动生成物体
        this.autoGenerateTimer = setInterval(function () {
            if (things.length < maxThingSize) {
                thingFactory.randomGenerate();
            }
        }, 1000);
    }
}

function createBall(x, y, text, bgColor, fgColor) {//创建一个物体模型，并添加到集合中
    var ball = document.createElement("div");
    var shadow = document.createElement("div");
    var circle = document.createElement("div");
    var over = document.createElement("div");
    var textDiv = document.createElement("span");
    textDiv.innerHTML = text;
    circle.appendChild(over);
    circle.appendChild(textDiv);
    ball.appendChild(shadow);
    ball.appendChild(circle);
    over.classList.add("over_circle");
    circle.classList.add("circle");
    shadow.classList.add("shadow");
    ball.classList.add("ball");

    if (bgColor) {
        ball.bgColor = bgColor;
    } else {
        ball.bgColor = mainsnakeColor;
    }

    if (is3D) {
        rendering3D(ball, ball.bgColor);
    } else {
        over.style.background = ball.bgColor;
    }

    if (fgColor) {
        textDiv.style.color = fgColor;
    }
    ball.lx = x;
    ball.ly = y;
    ball.point = [];
    chessBoard.appendChild(ball);
    return ball;
}

function repaint() {//物体2D渲染
    if (is3D) {
        repaint3D();
    } else {
        for (var i = 0 ; i < snake.length ; i ++) {
            for (var j = 0 ; j < snake[i].snakeBody.length ; j ++) {
                snake[i].snakeBody[j].style.left = snake[i].snakeBody[j].lx + "px";
                snake[i].snakeBody[j].style.top = snake[i].snakeBody[j].ly + "px";
                snake[i].snakeBody[j].style.display = "block";
            }
            snake[i].snakeBody[0].getElementsByClassName("circle")[0].getElementsByTagName("span")[0].innerText = "囧";
            snake[i].snakeBody[0].style.zIndex = "1";
        }
        for (var i = 0 ; i < things.length ; i ++) {
            things[i].style.left = things[i].lx + "px";
            things[i].style.top = things[i].ly + "px";
            things[i].style.display = "block";
        }
    }
}

function initSnake() {//初始化玩家贪吃蛇
    var main = new Snake(80, 0, toward.RIGHT, 5, mainSnakeColor);
    snake.push(main);
    mainSnake = main;
}

function initSquareSet () {//初始化地面纹路的方法
    squareSet = new Array(25);
    for (var i = 0 ; i < squareSet.length ; i ++) {
        squareSet[i] = new Array(25);
        for (var j = 0 ; j < squareSet[i].length ; j ++) {
            squareSet[i][j] = document.createElement("div");
            squareSet[i][j].classList.add("square");
            chessBoard.appendChild(squareSet[i][j]);
        }
    }
    return squareSet;
}

function getDistance(a, b) {//给出两个在游戏场地的模型，可以计算出两个模型中心的距离
    var snakeCenterX = a.lx + 10;
    var snakeCenterY = a.ly + 10;
    var thingsCenterX = b.lx + 10;
    var thingsCenterY = b.ly + 10;
    var absX = Math.abs(snakeCenterX - thingsCenterX);//获取横向距离绝对值
    var absY = Math.abs(snakeCenterY - thingsCenterY);//获取纵向距离绝对值
    var distance = Math.sqrt(Math.pow(absX, 2) + Math.pow(absY, 2), 2);//使用勾股定理计算出距离
    return distance;
}

function checkCrash() {//检查碰撞，主要检查蛇与边界的碰撞，蛇与蛇的碰撞，蛇与物体的碰撞
    for (var i = 0 ; i < snake.length ; ) {
        var x = snake[i].snakeBody[0].lx;
        var y = snake[i].snakeBody[0].ly;
        if (x < 0 || x > 480 || y < 0 || y > 480 ) {//检查蛇与边界的碰撞
            snake[i].over();
            snake.splice(i, 1);
            continue;
        }
        for (var j = 0 ; j < things.length ; j ++) {//检查蛇与食物的碰撞
            var distance = getDistance(snake[i].snakeBody[0], things[j]);
            if (distance < 20) {
                things[j].act(snake[i]);
                chessBoard.removeChild(things[j]);
                things.splice(j, 1);
            }
        }
        var isCrashed = false;
        for (var j = 0 ; j < snake.length ; j ++) {//检查蛇与蛇碰撞
            if (snake[i] == snake[j]) {
                continue;
            }
            for (var k = 0 ; k < snake[j].snakeBody.length ; k ++) {
                var distance = getDistance(snake[i].snakeBody[0], snake[j].snakeBody[k]);
                if (distance < 20) {
                    snake[i].over();
                    snake.splice(i, 1);
                    isCrashed = true;
                    break;
                }
            }
            if (isCrashed) {
                break;
            }
        }
        if (isCrashed) {
            continue;
        }
        i ++;
    }
}

function checkFinish() {
    //检查游戏是否结束
    if (snake.length == 1 && snake[0] == mainSnake) {
        alert("获胜~！");
        clearInterval(timer);
    }
}

function move() {
    //移动函数，操作每条蛇的每个节点的移动
    for (var i = 0 ; i < snake.length ; i ++) {
        //循环遍历每条蛇
        for (var j = 1 ; j < snake[i].snakeBody.length ; j ++) {
            //循环遍历蛇身的每个节点
            if (snake[i].snakeBody[j].point.length > 0) {
                snake[i].snakeBody[j].lx += snake[i].snakeBody[j].point[0].speedX;
                snake[i].snakeBody[j].ly += snake[i].snakeBody[j].point[0].speedY;
                if (snake[i].snakeBody[j].lx == snake[i].snakeBody[j].point[0].x && snake[i].snakeBody[j].ly == snake[i].snakeBody[j].point[0].y) {
                    snake[i].snakeBody[j].point.shift();
                }
            } else {
                snake[i].snakeBody[j].lx += snake[i].headMoveX;
                snake[i].snakeBody[j].ly += snake[i].headMoveY;
            }
        }
        snake[i].snakeBody[0].lx += snake[i].headMoveX;
        snake[i].snakeBody[0].ly += snake[i].headMoveY;
        snake[i].snakeBody[0].getElementsByClassName("circle")[0].getElementsByTagName("span")[0].innerText = "囧";
    }
    repaint();
}

function tryChangeToward() {
    //尝试进行转弯，因为有的方向时不需要进行方向转换的，比如相同方向或者相反方向
    for (var i = 0 ; i < snake.length ; i ++) {
        if (snake[i].changeNextStation > 0) {
            snake[i].changeNextStation -= 1;
            continue;
        }
        if (snake[i].changeToward && snake[i].changeToward.change != snake[i].nowToward) {//不能是相同方向
            if (snake[i].changeToward.change.x + snake[i].nowToward.x != 0 || snake[i].changeToward.change.y + snake[i].nowToward.y || 0) {
                snake[i].changeNextStation = 20;
                snake[i].nowToward = snake[i].changeToward.change;
                snake[i].changeToward.act.call(snake[i]);
            }
        }
    }
}
function change(snake, x, y) {
    //转换方向的方法
    var lastX = snake.snakeBody[0].lx;
    var lastY = snake.snakeBody[0].ly;
    var speedX = snake.headMoveX;
    var speedY = snake.headMoveY;
    for (var i = 1 ; i < snake.snakeBody.length ; i ++) {
        //因为蛇头进行旋转了，但是蛇身必须要走完当前这段路才能进行转弯，所以要将转弯的点记录下来。
        snake.snakeBody[i].point.push({x: lastX, y: lastY, speedX: speedX, speedY: speedY})
    }
    snake.headMoveX = x;
    snake.headMoveY = y;
}


function start() {
    //开始游戏
    if (isStart) {
        //防止连续点击开始按钮
        return;
    }
    isStart = true;

    timer = setInterval(function () {
        //开始计时器，刷新频率为上面初始化的数值
        tryChangeToward();//检查方向转换
        move();//蛇移动
        checkCrash();//检查碰撞
        // checkFinish();
    }, 1000 / frame);


    thingFactory.autoGenerate();

    document.onkeydown=function(event){//监听键盘事件
        var e = event || window.event || arguments.callee.caller.arguments[0];
        if (e.keyCode == 38) {
            mainSnake.changeToward = {change:toward.UP, act:mainSnake.turnUp};
        } else if (e.keyCode == 40) {
            mainSnake.changeToward = {change:toward.DOWN, act:mainSnake.turnDown};
        } else if (e.keyCode == 37) {
            mainSnake.changeToward = {change:toward.LEFT, act:mainSnake.turnLeft};
        } else if (e.keyCode == 39) {
            mainSnake.changeToward = {change:toward.RIGHT, act:mainSnake.turnRight};
        }
    };
}

window.onload = function () {
    chessBoard = document.getElementById("chess_board");
    initSquareSet();
    initSnake();
    if (is3D) {
        changeTo3D();
    }
    repaint();
}