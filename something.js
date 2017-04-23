//arduino and leap inititialization
var five = require("johnny-five");
var Leap = require('leapjs');
// global variables

//variablee for  pin initialization
var pin_base = 0;
var pin_wrist = 0;
var pin_base_arm=0;
var claw_pin = 0;
var elbow_pin=0;

//variables for servo
var base;
var wrist;
var base_arm;
var claw;
var elbow;

var base_pos=90;
var base_arm_pos=90;
var wrist_pos=90;
var claw_pos=0.00;
var elbow_pos=90;

//other variables to use
var min_claw_distance=15.0;// Leap will not fully close
var finger_distance;
//Leap motion controller
var controller = new Leap.Controller();

controller.on('frame',function(frame)
{
  //Leap motion control loop
  if(frame.hands.length > 0)
  {
    //if hands is detected

  }
  if(frame.pointables.length > 1)
  {
    //get finger
    var f1 = frame.pointables[0];
    var f2= frame.pointables[1];
    //tip position is return an array [0,1,2] to [x,y,z]
    fingerDistance = distance(f1.tipPosition[0],f1.tipPosition[1],f1.tipPosition[2],
      f2.tipPosition[0],f2.tipPosition[1],f2.tipPosition[2]); //this might switch to 180-distance or just distance;
    claw_pos=(fingerDistance/1.5)-min_claw_distance;
    console.log(claw_pos);
  }
});

//on Connection with leap motion
controller.on('connect', function(frame) {
  console.log("Leap Connected.");

});

controller.connect();

board = new five.Board();
board.on("ready", function() {
  //start servo initialization
    base= new five.Servo(pin_base);
    wrist = new five.Servo(pin_wrist);
    base_arm = new five.Servo(pin_base_arm);
    claw = new five.Servo(claw_pin);
    elbow= new five.Servo(elbow_pin);
    base.to(90);
    wrist.to(90);
    base_arm.to(90);
    claw.to(90);
    elbow.to(90);
    //inner function
    //this is our f
    this.loop(30, function(){
    //here we weite to servos
    if(claw_pos >=0 && claw_pos <=140){
      claw.to(claw_pos);
    }
    if(base_pos >=0 && base_pos <= 180){
      base.to(base_pos);
    }
  });
});

//create utlilty functions
function distance(x1,y1,z1,x2,y2,z2) {
  return Math.sqrt(square(x2-x1)+square(y2-y1)+square(z2-z1));
}

function square(x) {
  return x*x;
}

function getbasepostition(x)
{
  var norm_b=100*normalize;
  x=1.5+2*x;
  var angle= 90+Math.cos(x)*90;
  return angle;
}

//uses leapfrog hand values to
//calculate into servo joint angles
function calculateInverseKinematics(y,z) {

  var hypotenuse = Math.sqrt(square(y) + square(z));
  var a = Math.atan(y / z);
  var b = Math.acos((square(LENGTH1) + square(hypotenuse) - square(LENGTH2)) / (2 * LENGTH1 * hypotenuse));
  var theta1 = todegrees(a + b);

  var c = Math.acos((square(LENGTH1) + square(LENGTH2) - square(hypotenuse)) / (2 * LENGTH1 * LENGTH2));
  var theta2 = todegrees(c);

  return {
    theta1: theta1,
    theta2: theta2
  }
}
