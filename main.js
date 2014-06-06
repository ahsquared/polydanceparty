// constant globals
var IS_IOS = /(iPad|iPhone|iPod)/g.test( navigator.userAgent );


socket = io.connect("http://" + location.hostname, {port: 8081, rememberTransport: false});
socket.on('connect', function() {
    // sends to socket.io server the host/port of oscServer
    // and oscClient
    socket.emit('config',
            {
                server: {
                    port: 3333,
                    host: location.hostname
                },
                client: {
                    port: 3334,
                    host: location.hostname
                }
            }
    );
    //console.log(socket.socket.sessionid);
    polydanceparty.init();

});

socket.on('message', function(obj) {
    console.log(obj);
    var log = document.getElementById('log');
    log.innerHTML = obj;
});

var polydanceparty = {
    shapeNumber: 0,
    init: function() {
        gyro.frequency = 40;
        var wrapper = document.getElementById('wrapper'),
                shape = document.getElementById('shape'),
                info = document.getElementById('info'),
                content = document.getElementById('content'),
                VideoPlayer = document.getElementById('VideoPlayer'),
                AudioPlayer = document.getElementById('AudioPlayer'),
                BeginTheParty = document.getElementById('BeginTheParty'),
                BeginThePartyBtn = document.getElementById('BeginThePartyBtn'),
                init = false,
                numShapes = 6;
        //shapeNumber = this.randomIntFromInterval(1, numShapes);

        function touchHandler(e){
            e.preventDefault();
            if(IS_IOS){
                AudioPlayer.play();
                AudioPlayer.volume = 0;
            }else{
                VideoPlayer.play();
                VideoPlayer.volume = 0;
            }
            BeginTheParty.className = 'hide';
            BeginThePartyBtn.removeEventListener('touchstart', touchHandler);
        }
        BeginThePartyBtn.addEventListener('touchstart', touchHandler);

        gyro.startTracking(function(o) {
            // o.x, o.y, o.z for accelerometer
            // o.alpha, o.beta, o.gamma for gyro
            if (o.alpha != null && !init) {
                polydanceparty.initOrientation.alpha = o.alpha;
                polydanceparty.initOrientation.beta = Math.abs(o.beta);
                polydanceparty.initOrientation.gamma = Math.abs(o.gamma);
                init = true;
                polydanceparty.shapeNumber = polydanceparty.randomIntFromInterval(1, 6);
                shape.src = "/img/Shape-" + polydanceparty.shapeNumber + ".png";
                info.className = "shape" + polydanceparty.shapeNumber;
                var h = polydanceparty.randomIntFromInterval(1, 360) / 360;
                var hsl = h + ",0.8,0.65";
                var rgb = polydanceparty.hslToRgb(h, 0.8, 0.65);
                var rgbStr = rgb[0] + "," + rgb[1] + "," + rgb[2];
                socket.emit('message', '/create ' + (polydanceparty.shapeNumber - 1) + "|" + rgbStr + '|' + socket.socket.sessionid);
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


            //polydanceparty.rotateShape(smoothRotation, accel);
            polydanceparty.rotateShape(smoothRotation, shape);

            wrapper.style.backgroundColor = "hsl(" +
                    Math.abs(o.alpha).toFixed(0) + ", " +
                    "80%, " +
                    "65%)";

        });
    },
    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h, s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * @param   Number  h       The hue
     * @param   Number  s       The saturation
     * @param   Number  l       The lightness
     * @return  Array           The RGB representation
     */
    hslToRgb: function(h, s, l) {
        var r, g, b;

        if (s == 0) {
            r = g = b = l; // achromatic
        } else {
            function hue2rgb(p, q, t) {
                if (t < 0)
                    t += 1;
                if (t > 1)
                    t -= 1;
                if (t < 1 / 6)
                    return p + (q - p) * 6 * t;
                if (t < 1 / 2)
                    return q;
                if (t < 2 / 3)
                    return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
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
    setStyle: (function() {
        var cachedStyles = {};
        return function(styleName, styleValue, elem) {
            if (styleName in elem.style) {
                elem.style[styleName] = styleValue;
                return;
            }
            if (styleName in cachedStyles) {
                elem.style[cachedStyles[styleName]] = styleValue;
                return;
            }
            var vendors = ['Moz', 'webkit', 'ms'];
            var styleNameUpper = styleName.replace(styleName[0], styleName[0].toUpperCase());
            vendors.forEach(function(vendor) {
                var _styleName = vendor + styleNameUpper;
                if (_styleName in elem.style) {
                    cachedStyles[styleName] = _styleName;
                    elem.style[_styleName] = styleValue;
                }
            });
        };
    }()),
    rotateShape: function(rotation, div) {
        var styleValue = "perspective(500) " +
                "rotateZ(" + rotation.alpha + "deg) " +
                "rotateX(" + rotation.beta + "deg) " +
                "rotateY(" + rotation.gamma + "deg)";
        this.setStyle('transform', styleValue, div);
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