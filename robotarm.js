//arduino and leap inititialization
var five = require("johnny-five");
var Leap = require('leapjs');
// global variables

//variables for pin initialization
var pin_base = 10;
var pin_wrist = 5;
var pin_base_arm=9;
var claw_pin = 3;
var elbow_pin=6;

//variables for servo
var base,wrist,base_arm,claw,elbow;

//movement variables
var base_pos=90;
var base_arm_pos=90;
var wrist_pos=90;
var claw_pos=0.00;
var elbow_pos=90;
//other variables to use

// length of lower arm and upper arm, respectively
var LENGTH1 = 120;
var LENGTH2 = 120;

//create restrictions in leapspace for palmPosition;
var MIN_Z=6;
var MAX_Z =2000;
var MIN_Y=0;
var MAX_Y =2000;

var a  = 0.0;
var b  = 0.0;
var c  = 0.0;
var hyp = 0.0;

var normalize = 3;
var num_smoothingFrames = 15;
var min_claw_distance=10.0;// Leap will not fully close

//Leap variables
var handposition;
var handHistory=[];
var finger_distance;
var frames=[];
var armAngles;
//Leap motion controller
var controller = new Leap.Controller();
//Leap motion control loop
controller.on('frame',function(frame)
{
  if(frame.hands.length > 0)
  {
    //create a handposition variable
    frame.hands[0].palmPosition[1] -= 200;
    frame.hands[0].palmPosition[2] = 110 + (-1*frame.hands[0].palmPosition[2]);
    handposition = frame.hands[0].palmPosition;
    //0-x
    //1-y
    //2-z
    console.log("y:"+frame.hands[0].palmPosition[1]);

    //console.log("wrist radians:"+frame.hands[0].pitch());
    var smoothedInput = smoothInput(handposition);
    smoothingQueue(handposition);
    if(smoothedInput.y < MIN_Y){smoothedInput.y = MIN_Y};
    if(smoothedInput.y >MAX_Y){smoothedInput.y = MAX_Y};
    if(smoothedInput.z < MIN_Z){smoothedInput.z = MIN_Z};
    if(smoothedInput.z >MAX_Z){smoothedInput.z = MAX_Z};

    base_pos = getbasepostition(smoothedInput.x,smoothedInput.z);

    wrist_pos = todegrees(frame.hands[0].pitch());
    wrist_pos =five.Fn.map(wrist_pos,-90,90,0,180);

    armAngles=getArmAngles(smoothedInput.y,smoothedInput.z);
    base_arm_pos =armAngles.theta1;
    elbow_pos=armAngles.theta2;
    //console.log("wrist degrees:"+wristAngle);
  }
  if(frame.pointables.length > 1)
  {
    //get finger
    var f1 = frame.pointables[0];
    var f2 = frame.pointables[1];
    //tip position is return an array [0,1,2] to [x,y,z]
    fingerDistance = distance(f1.tipPosition[0],f1.tipPosition[1],f1.tipPosition[2],
      f2.tipPosition[0],f2.tipPosition[1],f2.tipPosition[2]); //this might switch to 180-distance or just distance;
    claw_pos=140-fingerDistance;

    //console.log("clawVal:"+claw_pos);
  }
  //push current frame
  frames.push(frame);
});

//on Connection with leap motion
controller.on('connect', function(frame) {
  console.log("Leap Connected.");
  setTimeout(function(){
    var time= frames.length/2;
  } ,200);
});//call an inner function evvery 200ms


controller.connect();

board = new five.Board();
board.on("ready", function() {
  //start servo initialization
    base= new five.Servo(pin_base);
    wrist = new five.Servo(pin_wrist);
    base_arm = new five.Servo(pin_base_arm);
    claw = new five.Servo(claw_pin);
    elbow= new five.Servo(elbow_pin);
  //INITIAL POSITION OF ARM *TO FIX*
    claw.to(90);
    wrist.to(90);
    base.to(90);
    base_arm.to(170);
    elbow.to(90);
    //inner function
    this.loop(30, function(){

    //here we write values to servos
    if(claw_pos >= 0 && claw_pos <=120){
      claw.to(claw_pos);
    }
    if(wrist_pos >= 30 && wrist_pos <= 180){
      wrist.to(wrist_pos);
    }
     if(base_pos >= 0 && base_pos <= 180){
       base.to(base_pos);
    }
    if(!isNaN(base_arm_pos) && !isNaN(elbow_pos)) {
      base_arm.to(base_arm_pos);
       elbow.to(elbow_pos);
     }
  });
});

// takes the average value of up to 10 frames to smooth out input
function smoothInput(current) {
  //stack empty? do nothing
  if(handHistory.length === 0) {
    return current;
  }

  var x = 0;
  var y = 0;
  var z = 0;
  var totalFrames = handHistory.length;

  //add up all of the stored frames in the queue
  x += current[0];
  y += current[1];
  z += current[2];
  for(var i = 0; i < totalFrames; i++) {
    x += handHistory[i][0];
    y += handHistory[i][1];
    z += handHistory[i][2];
  }
  totalFrames += 1;

  //return the averages of the xyz values
  return {x: x/totalFrames, y: y/totalFrames, z: z/totalFrames};
}

//pushes hand frames to a queue to be used by smoothInput()
function smoothingQueue(current) {
  handHistory.unshift(current);
  if(handHistory.length > num_smoothingFrames) {
    handHistory.pop();
  }
}
//create utlilty functions
function distance(x1,y1,z1,x2,y2,z2) {
  return Math.sqrt(square(x2-x1)+square(y2-y1)+square(z2-z1));
}

function todegrees(r){
  return r * 57.2958;
}

function square(x) {
  return x*x;
}

function getbasepostition(x,z)
{
  var angle = Math.tan(x/z);
  return 0.65 * (todegrees(angle) + 90);
}

//uses leapmotion hand (palm) values to
//calculate into servo joint angles
//http://cnx.org/contents/BDDH_rPS@12/Protein-Inverse-Kinematics-and
function getArmAngles(y,z) {
//console.log("y: "+y);
  console.log("z: "+z);
  hyp = Math.sqrt(square(y)+square(z));
  //console.log("hypo: "+hyp);
  a = Math.atan(y/z);
//  console.log("a: "+a);
  var unit = (square(LENGTH1)+square(hyp)-square(LENGTH2))/(2*LENGTH1*hyp);
  if(unit > 1) {
    unit = 1;
  }
  if(unit < -1) {
    unit = -1;
  }
  b = Math.acos(unit);
//  console.log("b: "+b);
  var theta1 = todegrees(a+b) + 90;

  // Get second angle
  var unit2 = (square(LENGTH2)+square(LENGTH1)-square(hyp))/(2*LENGTH1*LENGTH2);
  if(unit2 > 1) {
    unit2 = 1;
  }
  if(unit2 < -1) {
    unit2 = -1;
  }
  c = Math.acos(unit2);
  var theta2 = 180 - todegrees(c);
  console.log("theta1: "+theta1);
  console.log("theta2: "+theta2);

  return {
    theta1: theta1,
    theta2: theta2
  }
}
