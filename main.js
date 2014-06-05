
socket = io.connect("http://" + ipAddress, {port: 8081, rememberTransport: false});
console.log('oi');
var init = false;
socket.on('connect', function() {
    // sends to socket.io server the host/port of oscServer
    // and oscClient
    socket.emit('config',
        {
            server: {
                port: 3343,
                host: ipAddress
            },
            client: {
                port: 3344,
                host: ipAddress
            }
        }
    );
    console.log(socket.socket.sessionid);
    socket.emit('message', '/create cube|' + socket.socket.sessionid);
    init = true;
    polydanceparty.init();
});

socket.on('message', function(obj) {
    var status = document.getElementById("status");
    status.innerHTML = obj[0];
    console.log(obj);
});

var polydanceparty = {
    init: function() {
        gyro.frequency = 40;
        var wrapper = document.getElementById('wrapper'),
            shape = document.getElementById('shape'),
            info = document.getElementById('info'),
            content = document.getElementById('content'),
            accel = document.getElementById('accel'),
            init = false,
            numShapes = 6,
            shapeNumber = this.randomIntFromInterval(1, numShapes);

        shape.src = "/img/Shape-" + shapeNumber + ".png";
        info.className = "shape" + shapeNumber;

        gyro.startTracking(function(o) {
            // o.x, o.y, o.z for accelerometer
            // o.alpha, o.beta, o.gamma for gyro
            if (o.alpha != null && !init) {
                polydanceparty.initOrientation.alpha = o.alpha;
                polydanceparty.initOrientation.beta = Math.abs(o.beta);
                polydanceparty.initOrientation.gamma = Math.abs(o.gamma);
                console.log(polydanceparty.initOrientation);
                init = true;
            } else {
                accel.innerHTML = "alpha: " + o.alpha + "<br>" +
                    "beta: " + o.beta + "<br>" +
                    "gamma: " + o.gamma + "<br>";
            }


            if (!init)
                return;

            var adjustedRotation = {
                alpha: o.alpha - polydanceparty.initOrientation.alpha,
                beta: o.beta - polydanceparty.initOrientation.beta,
                gamma: o.gamma - polydanceparty.initOrientation.gamma
            };

            var netAcceleration = polydanceparty.getAccelerationWithoutGravity(o);
            //socket.emit('message', '/rot ' + o.alpha + "|" + o.beta + "|" + o.gamma + "|" + socket.socket.sessionid);
            socket.emit('message', '/rot ' + adjustedRotation.alpha + "|" +
                    adjustedRotation.beta + "|" + adjustedRotation.gamma + "|" +
                    socket.socket.sessionid);
            socket.emit('message', '/acc ' + netAcceleration.x + "|" +
                    netAcceleration.y + "|" + netAcceleration.z + "|" +
                    socket.socket.sessionid);

            var smoothRotation = polydanceparty.getSmoothRotation(adjustedRotation.alpha, adjustedRotation.beta, adjustedRotation.gamma);

            accel.innerHTML = "x: " + o.x + "<br>" +
                "y: " + o.y + "<br>" +
                "z: " + o.z + "<br>" +
                "netX: " + netAcceleration.x + "<br>" +
                "netY: " + netAcceleration.y + "<br>" +
                "netZ: " + netAcceleration.z + "<br>" +
                "alpha: " + o.alpha + "<br>" +
                "beta: " + o.beta + "<br>" +
                "gamma: " + o.gamma + "<br>" + 
                "smoothAlpha: " + smoothRotation.alpha + "<br>" +
                "smoothBeta: " + smoothRotation.beta + "<br>" +
                "smoothGamma: " + smoothRotation.gamma + "<br>";

            //polydanceparty.rotateShape(smoothRotation, accel);
            polydanceparty.rotateShape(smoothRotation, shape);

            wrapper.style.backgroundColor = "hsl(" +
                Math.abs(o.alpha).toFixed(0) + ", " +
                "80%, " +
                "65%)";

        });
    },
    userAgent: navigator.userAgent.toLowerCase(),
    isFirefox: function() {
        if (this.userAgent.indexOf("firefox") > 0) {
            return true;
        }
        return false;
    },
    randomIntFromInterval: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },
    initOrientation: {
        alpha: 0,
        beta: 0,
        gamma: 0
    },
    accFilteringFactor: 0.1,
    rotFilteringFactor: 0.1,
    rotateShape: function(rotation, div) {
        //accel.innerHTML = rotation.alpha + ", " + rotation.beta + ", " + rotation.gamma;

        div.style.webkitTransform = "perspective(500) " +
            "rotateZ(" + rotation.alpha + "deg) " +
            "rotateX(" + rotation.beta + "deg) " +
            "rotateY(" + rotation.gamma + "deg)";
        div.style.MozTransform = "perspective(500px) " +
            "rotateZ(" + rotation.alpha + "deg) " +
            "rotateX(" + rotation.beta + "deg) " +
            "rotateY(" + rotation.gamma + "deg)";
        div.style.transform = "perspective(500) " +
            "rotateZ(" + rotation.alpha + "deg) " +
            "rotateX(" + rotation.beta + "deg) " +
            "rotateY(" + rotation.gamma + "deg)";
    },
    currentRotation: {
        alpha: 0,
        beta: 0,
        gamma: 0
    },
    getSmoothRotation: function(alpha, beta, gamma) {
        this.currentRotation.alpha = ((alpha * this.rotFilteringFactor) +
            (this.currentRotation.alpha * (1.0 - this.rotFilteringFactor))).toFixed(1);
        this.currentRotation.beta = ((beta * this.rotFilteringFactor) +
            (this.currentRotation.beta * (1.0 - this.rotFilteringFactor))).toFixed(1);
        this.currentRotation.gamma = ((gamma * this.rotFilteringFactor) +
            (this.currentRotation.gamma * (1.0 - this.rotFilteringFactor))).toFixed(1);
        return this.currentRotation;
    },
    currentAccel: {
        x: 0,
        y: 0,
        z: 0
    },
    getAccelerationWithoutGravity: function(acceleration) {
        var netAcceleration = {};
        // Use a basic low-pass filter to keep only the gravity component of each axis.
        this.currentAccel.x = (acceleration.x * this.accFilteringFactor) + (this.currentAccel.x * (1.0 - this.accFilteringFactor));
        this.currentAccel.y = (acceleration.y * this.accFilteringFactor) + (this.currentAccel.y * (1.0 - this.accFilteringFactor));
        this.currentAccel.z = (acceleration.z * this.accFilteringFactor) + (this.currentAccel.z * (1.0 - this.accFilteringFactor));
        netAcceleration.x = (acceleration.x - this.currentAccel.x).toFixed(1);
        netAcceleration.y = (acceleration.y - this.currentAccel.y).toFixed(1);
        netAcceleration.z = (acceleration.z - this.currentAccel.z).toFixed(1);
        return netAcceleration;
    }
};

// polydanceparty.init();