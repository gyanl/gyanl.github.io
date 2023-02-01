var i = 0;
var typeBox = document.getElementById("typewriter");
var txt = typeBox.innerHTML;
typeBox.innerHTML = "";
var speed = 30; /* The speed/duration of the effect in milliseconds */

function typeWriter(){
    if (i < txt.length) {
        typeBox.innerHTML += txt.charAt(i);
        console.log(txt.charAt(i));
        i++;
        setTimeout(typeWriter, speed);
      }
}

console.log("to");

window.onload = typeWriter;

