function UUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

class Element {
    constructor(querySelector) {
        this.HTMLElement = document.querySelector(querySelector);

        this.HTMLElement.addEventListener("mousedown", this.mousedown);
        this.HTMLElement.addEventListener("mouseup", this.mouseup);
        this.HTMLElement.addEventListener("mousemove", this.mousemove);
    }

    mousedown(e) {

    }

    mouseup(e) {

    }

    mousemove(e) {

    }
}

const Atom = (function() {
    const canvas = document.querySelector("#canvas");
    const layers = document.querySelector("#layers")
    const ctx = canvas.getContext("2d");
    const root = getComputedStyle(document.body);
    const cursor = (function() {
        let mousedown = false;

        const client = {
            x: 0,
            y: 0
        }

        canvas.addEventListener("mousedown", () => {
            mousedown = true;
        });

        canvas.addEventListener("mouseup", () => {
            mousedown = false;
        });

        const move = (e) => {
            const dim = canvas.getBoundingClientRect();

            client.x = e.clientX - dim.x;
            client.y = e.clientY - dim.y;
        };

        canvas.addEventListener("mousemove", move);

        const render = () => {
            ctx.globalCompositeOperation = "difference";
            ctx.lineWidth = 1;
            ctx.strokeStyle = mousedown ? "#0ff" : "#fff";

            ctx.beginPath();
            ctx.moveTo(-10 + client.x, 0 + client.y);
            ctx.lineTo(10 + client.x, 0 + client.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0 + client.x, -10 + client.y);
            ctx.lineTo(0 + client.x, 10 + client.y);
            ctx.stroke();

            ctx.globalCompositeOperation = "source-over";
        };

        return { render };
    })();

    let globals = {
        currentObject: () => {
            return document.querySelector("[name=object-type]:checked").value;
        },
        usesFill: () => {
            return document.querySelector("[name=object-fill]").checked;
        },
        usesStroke: () => {
            return document.querySelector("[name=object-stroke]").checked;
        }
    };

    class Color {
        constructor(r, g, b, a) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a || 1;

            return;
        }

        random({ red: r, green: g, blue: b, alpha: a }) {
            this.r = r || 255 * Math.random();
            this.g = g || 255 * Math.random();
            this.b = b || 255 * Math.random();
            this.a = a || 1 * Math.random();

            return;
        }

        get toString() {
            return `rgba(${this.r} ${this.g} ${this.b} / ${this.a})`;
        };
    }

    class Vertex {
        constructor(x, y, z) {
            this.x = parseFloat(x);
            this.y = parseFloat(y);
            this.z = parseFloat(z);
        }
    }

    class Vertex2D {
        constructor(x, y) {
            this.x = parseFloat(x);
            this.y = parseFloat(y);
        }
    };

    class Quaternion {
        constructor(x, y, z, w) {
            this.x = parseFloat(x);
            this.y = parseFloat(y);
            this.z = parseFloat(z);
            this.w = parseFloat(w);
        }
    }

    const RotateMesh = (center, vertices, theta, phi) => {
        for (let i = 0; i < vertices.length; ++i) {
            // Rotation matrix coefficients
            let ct = Math.cos(theta);
            let st = Math.sin(theta);
            let cp = Math.cos(phi);
            let sp = Math.sin(phi);

            // Rotation
            let x = vertices[i].x - center.x;
            let y = vertices[i].y - center.y;
            let z = vertices[i].z - center.z;

            vertices[i].x = ct * x - st * cp * y + st * sp * z + center.x;
            vertices[i].y = st * x + ct * cp * y - ct * sp * z + center.y;
            vertices[i].z = sp * y + cp * z + center.z;
        }

        return vertices;
    }

    const VertexDistance = (v1, v2) => {
        return Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2 + (v2.z - v1.z) ** 2);
    }

    class Mesh {
        constructor(camera, center, faces, vertices, quaternion, style, ruleSets) {
            this.parentLayer;
            this.camera = camera;
            this.center = center;
            this.vertices = vertices;
            // Find Better Way Of Doing Rotation? Quaternion?
            this.quaternion = quaternion || new Quaternion(0, 0, 0, 0);

            this.faces = faces;
            this.renderedFaces = [];

            this.currentStyle = "default";
            this.style = {
                default: {
                    lineWidth: document.querySelector("#stroke-width").value || 1,
                    lineJoin: document.querySelector("[name=line-join]:checked").value,
                    strokeStyle: document.querySelector("#stroke-color").value,
                    fillStyle: document.querySelector("#fill-color").value,
                },
                hover: {
                    strokeStyle: "#f00"
                },
                active: {
                    strokeStyle: "#f00"
                }
            }

            this.ruleSets = {
                usesStroke: globals.usesStroke(),
                usesFill: globals.usesFill(),
            }

            if (style) {
                this.style = style;
            }

            if (ruleSets) {
                this.ruleSets = ruleSets;
            }

            this.style.lineWidth = (this.ruleSets.usesStroke && this.ruleSets.usesFill) ? this.style.lineWidth * 2 : this.style.lineWidth;

            let bgColor = new Color();
            bgColor.random({ alpha: 0.05 });

            setInterval(function() {
                bgColor.random({ alpha: 0.05 });
            }, 10)

            this.ruleSets.get = () => {
                ctx.lineWidth = this.style[this.currentStyle].lineWidth;
                ctx.lineJoin = this.style[this.currentStyle].lineJoin;
                ctx.strokeStyle = this.style[this.currentStyle].strokeStyle;
                ctx.fillStyle = bgColor.toString;

                if (this.ruleSets.usesStroke) {
                    ctx.strokeStyle = this.style.strokeStyle;
                }

                if (this.ruleSets.usesFill) {
                    ctx.fillStyle = this.style.fillStyle;
                }
            }
        }

        set setParentLayer(layer) {
            if (layer instanceof Layer) {
                this.parentLayer = layer;
            }
        }

        sort() {
            // Make More Efficient

            let compare = (a, b) => {
                let a_count = 0;
                let b_count = 0;

                for (let k = 0, n_vertices = a.length; k < n_vertices; ++k) {
                    let a_dist = VertexDistance(a[k], this.camera);
                    let b_dist = VertexDistance(b[k], this.camera);

                    if (a_dist > b_dist) {
                        a_count++;
                    } else {
                        b_count++;
                    }
                }

                if (a_count > b_count) {
                    return -1;
                }
                if (b_count > a_count) {
                    return 1;
                }

                return 0;
            }
        }

        addEventListener = (type, callback) => {
            let cache = this;

            canvas.addEventListener(type, function(e) {
                if (cache.checkIfInContact(e)) {
                    cache.currentStyle = "active";

                    setTimeout(function() {
                        console.log()
                        cache.currentStyle = "default";
                    }, 100);

                    callback(e);
                }
            });
        }

        checkIfInContact(e) {
            for (let face in this.renderedFaces) {
                if (ctx.isPointInPath(this.renderedFaces[face], e.offsetX, e.offsetY)) {
                    return true;
                }
            }

            return false;
        }

        // change M
        project(M) {
            let r = this.camera.fov / M.y;

            return new Vertex2D(r * -M.x, r * M.z);
        }

        rotate(theta, phi) {
            this.vertices = RotateMesh(this.center, this.vertices, theta, phi);
        }

        render() {
            let dx = canvas.width / 2;
            let dy = canvas.height / 2;

            // Around X-axis:
            // X = x;
            // Y = y*cos(theta) - z*sin(theta);
            // Z = y*sin(theta) + z*cos(theta);
            // Around Y-axis:
            // X = x*cos(theta) + z*sin(theta);
            // Y = y;
            // Z = z*cos(theta) - x*sin(theta);
            // Around Z-axis:
            // X = x*cos(theta) - y*sin(theta);
            // Y = x*sin(theta) + y*cos(theta);
            // Z = z;

            // this.sort();

            let faces = JSON.parse(JSON.stringify((this.faces)));

            // For each face
            for (let j = 0; j < faces.length; j++) {
                // Current face

                let face = faces[j];
                let show_face = true;

                for (let k = 0; k < face.length; k++) {
                    face[k].visible = true;

                    face[k].x += this.camera.x;
                    face[k].y += this.camera.y;
                    face[k].z -= this.camera.z;

                    face[k] = RotateMesh(this.camera, face[k], this.camera.rotX, 0)

                    // TODO: fix so that it does not break when changing rotation
                    if (face[k].y < 0) {
                        show_face = false;
                    }
                }

                if (show_face) {
                    // Draw the first vertex
                    let P = this.project(face[0]);

                    this.ruleSets.get();

                    this.renderedFaces[j] = new Path2D();

                    this.renderedFaces[j].moveTo(P.x + dx, -P.y + dy);

                    // Draw the other vertices
                    for (let k = 1; k < face.length; k++) {
                        P = this.project(face[k]);
                        this.renderedFaces[j].lineTo(P.x + dx, -P.y + dy);
                    }

                    this.renderedFaces[j].closePath();


                    // Close the path and draw the face
                    ctx.stroke(this.renderedFaces[j]);
                    ctx.fill(this.renderedFaces[j]);
                }
            }
        }
    }

    class Prism extends Mesh {
        constructor(camera, center, scale, quaternion, faces, vertices, style, ruleSets) {
            super(camera, center, quaternion, faces, vertices, style, ruleSets)

            this.center = center;
            this.scale = scale / 2;

            this.vertices = [
                new Vertex(this.center.x - this.scale, this.center.y - this.scale, this.center.z - this.scale),
                new Vertex(this.center.x - this.scale, this.center.y + this.scale, this.center.z - this.scale),
                new Vertex(this.center.x + this.scale, this.center.y + this.scale, this.center.z - this.scale),
                new Vertex(this.center.x + this.scale, this.center.y - this.scale, this.center.z - this.scale),
                new Vertex(this.center.x, this.center.y, this.center.z + this.scale),
            ]

            this.faces = [
                [this.vertices[0], this.vertices[1], this.vertices[2], this.vertices[3]],
                [this.vertices[0], this.vertices[1], this.vertices[4]],
                [this.vertices[1], this.vertices[2], this.vertices[4]],
                [this.vertices[2], this.vertices[3], this.vertices[4]],
                [this.vertices[3], this.vertices[0], this.vertices[4]],
            ];
        }
    }

    class Cube extends Mesh {
        constructor(camera, center, scale, quaternion, faces, vertices, style, ruleSets) {
            super(camera, center, faces, quaternion, vertices, style, ruleSets)

            this.scale = scale / 2;

            this.vertices = [
                new Vertex(this.center.x - this.scale, this.center.y - this.scale, this.center.z + this.scale),
                new Vertex(this.center.x - this.scale, this.center.y - this.scale, this.center.z - this.scale),
                new Vertex(this.center.x + this.scale, this.center.y - this.scale, this.center.z - this.scale),
                new Vertex(this.center.x + this.scale, this.center.y - this.scale, this.center.z + this.scale),
                new Vertex(this.center.x + this.scale, this.center.y + this.scale, this.center.z + this.scale),
                new Vertex(this.center.x + this.scale, this.center.y + this.scale, this.center.z - this.scale),
                new Vertex(this.center.x - this.scale, this.center.y + this.scale, this.center.z - this.scale),
                new Vertex(this.center.x - this.scale, this.center.y + this.scale, this.center.z + this.scale)
            ];

            this.faces = [
                [this.vertices[0], this.vertices[1], this.vertices[2], this.vertices[3]],
                [this.vertices[3], this.vertices[2], this.vertices[5], this.vertices[4]],
                [this.vertices[4], this.vertices[5], this.vertices[6], this.vertices[7]],
                [this.vertices[7], this.vertices[6], this.vertices[1], this.vertices[0]],
                [this.vertices[7], this.vertices[0], this.vertices[3], this.vertices[4]],
                [this.vertices[1], this.vertices[6], this.vertices[5], this.vertices[2]]
            ];
        }
    }

    class Layer {
        constructor(name, camera) {
            this.objects = new Array();
            this.focus = 0;
            this.camera = camera;
            this.name = name;
            this.locked = false;
            this.id = UUID();
        }

        appendObject(object) {
            object.setParentLayer = this;
            this.objects.push(object);
        }

        removeObjectIndex(i) {
            this.objects.splice(i, 1);
        }

        render() {
            // Renders all objects in order

            this.objects.sort((a, b) => (a.center > b.center) ? 1 : -1);

            for (let i = 0; i < this.objects.length; i++) {
                // check Collision (box collision)
                if (this.objects[i].center.y + this.camera.y > 0) {
                    this.objects[i].render();
                }
            }
        }
    }

    class Camera {
        constructor(x = 0, y = 0, z = 0, fov = 400) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.velX = 0;
            this.velY = 0;
            this.velZ = 0;

            this.rotX = 0;
            this.rotY = 0;
            this.rotZ = 0;
            this.velRotX = 0;
            this.velRotY = 0;
            this.velRotZ = 0;

            this.friction = 0.95;
            this.speed = 15;
            this.scale = 200; // Scale is how much meter is
            this.fov = fov;
            this.distance = 100;

            this.loop = () => {
                this.velY *= this.friction;
                this.y += this.velY;
                this.velX *= this.friction;
                this.x += this.velX;
                this.velZ *= this.friction;
                this.z += this.velZ;

                this.velRotY *= this.friction;
                this.rotY += this.velRotY;
                this.velRotX *= this.friction;
                this.rotX += this.velRotX;
                this.velRotZ *= this.friction;
                this.rotZ += this.velRotZ;

                requestAnimationFrame(this.loop);
            };

            this.loop();

            // if (...) repetitive, TODO: Fix this later

            this.rotate = {
                left: () => {
                    if (this.velRotX < this.speed) {
                        this.velRotX--;
                    }
                },
                right: () => {
                    if (this.velRotX > -this.speed) {
                        this.velRotX++;
                    }
                }
            }

            this.move = {
                left: () => {
                    if (this.velX < this.speed) {
                        this.velX--;
                    }
                },
                right: () => {
                    if (this.velX > -this.speed) {
                        this.velX++;
                    }
                },
                up: () => {
                    if (this.velZ > -this.speed) {
                        this.velZ++;
                    }
                },
                down: () => {
                    if (this.velZ < this.speed) {
                        this.velZ--;
                    }
                },
                forward: () => {
                    if (this.velY > -this.speed) {
                        this.velY++;
                    }
                },
                backward: () => {
                    if (this.velY < this.speed) {
                        this.velY--;
                    }
                },
            };
        }

        zoom(scale) {
            // TODO: Improve Upon this!!
            if (this.scale + scale !== 0) this.scale += scale;
        }
    }

    class Client {
        constructor() {
            this.x = 0;
            this.y = 0;

            this.starting = {
                x: 0,
                y: 0
            }

            // TODO: Remove cache redundancy
            let cache = this;

            canvas.addEventListener("mousedown", (e) => {
                cache.updateClient(e);

                cache.starting.x = cache.x;
                cache.starting.y = cache.y;
            });

            canvas.addEventListener("mousemove", (e) => {
                cache.updateClient(e);
            });

            canvas.addEventListener("mouseup", (e) => {
                cache.updateClient(e);

                cache.starting.x = 0;
                cache.starting.y = 0;
            });
        }

        updateClient(e) {
            e.preventDefault();
            const dim = canvas.getBoundingClientRect();

            this.x = e.clientX - dim.x;
            this.y = e.clientY - dim.y;
        }
    }

    class fpsMount {
        constructor() {
            this.times = new Array();
            this.fps = 0;
        }

        clear() {
            this.times = new Array();
        }

        track() {
            const now = performance.now();
            while (this.times.length > 0 && this.times[0] <= now - 1000) {
                this.times.shift();
            }
            this.times.push(now);
            this.fps = this.times.length;
        }

        get() {
            return this.fps;
        }
    }

    class Viewport {
        constructor(camera) {
            this.mousedown = false;
            this.layers = [];
            this.currLayer;
            this.camera = camera || new Camera(0, 0);
            this.client = new Client();
        }

        init(callback) {
            callback(this);
        }

        addLayer() {
            this.layers.push(new Layer(`Layer ${this.layers.length + 1}`, this.camera));
            layers.innerHTML = "";

            this.calcLayer();
        }

        calcLayer() {
            for (let i = 0; i < this.layers.length; i++) {
                const inputRadio = document.createElement("input");
                inputRadio.name = "current-layer";
                inputRadio.value = i;
                inputRadio.setAttribute("type", "radio");

                if (this.layers[i] === this.layers[this.currLayer]) inputRadio.setAttribute("checked", "checked");

                const inputText = document.createElement("input");
                inputText.value = this.layers[i].name;
                inputText.classList.add("atom-form-control");
                inputText.setAttribute("type", "text");

                const label = document.createElement("label");
                label.appendChild(inputText);

                const li = document.createElement("li");
                li.id = this.layers[i].id;
                li.setAttribute("draggable", true);
                li.appendChild(inputRadio);
                li.appendChild(label);
                layers.appendChild(li);
            }
        }

        render() {
            ctx.fillStyle = "#fff";

            for (let i = 0; i < this.layers.length; i++) {
                this.layers[i].render();
            }
        }

    }

    let viewport = new Viewport();

    viewport.init((e) => {
        e.addLayer();
        e.currLayer = 0;
        let cache = e;
        let isRotating = false;

        canvas.addEventListener("contextmenu", function(e) {
            e.preventDefault();

            console.log(e);
        });

        for (let h = 0; h < 5; h++) {
            for (let v = 0; v < 5; v++) {
                let cube = new Cube(e.camera, new Vertex(10 * v + (5 * -15), 10 * h, -20), Math.random() * 10);
                e.layers[e.currLayer].appendObject(cube);

                setInterval(function() {
                    cube.rotate(Math.PI / 360 * (v + 1), Math.PI / 360 * (v + 1));


                }, 100);
            }
        }

        for (let i = 0; i < 5; i++) {
            let prism = new Prism(e.camera, new Vertex(-10 * (i + 1), 10 * i, 10 * i), 10 * (i + 1));
            let cube = new Cube(e.camera, new Vertex(10 * (i + 1), 10 * i, 10 * i), 10 * (i + 1));

            e.layers[e.currLayer].appendObject(prism);
            e.layers[e.currLayer].appendObject(cube);

            prism.addEventListener("mousemove", function(e) {
                setInterval(function() {
                    prism.rotate(Math.PI / 360, Math.PI / 360);
                }, 10);
            });

            setInterval(function() {
                if (isRotating) prism.rotate(Math.PI / 360 * i, Math.PI / 360 * i);
            }, 10);

            cube.addEventListener("click", function(e) {
                setInterval(function() {
                    cube.rotate(Math.PI / 360, Math.PI / 360);
                }, 10);
            });

            setInterval(function() {
                if (isRotating) cube.rotate(-Math.PI / 360 * i, -Math.PI / 360 * i);
            }, 10);
        }

        let rothsch = new Audio("./media/rothsch.ogg");
        let intro = new Audio("./media/intro.ogg");

        rothsch.onplay = () => {
            isRotating = true;
        }

        intro.onplay = () => {
            isRotating = true;
        }

        rothsch.onended = () => {
            isRotating = false;
        }

        intro.onended = () => {
            isRotating = false;
        }

        window.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.altKey) {
                if (e.code === "Equal") cache.camera.zoom(1);
                if (e.key === "-") cache.camera.zoom(-1);
                if (e.key === "w") cache.camera.fov += 20;
                if (e.key === "s") cache.camera.fov -= 20;
                if (e.key === "1") {
                    intro.pause();
                    intro.currentTime = 0;
                    rothsch.play();
                }
                if (e.key === "2") {
                    rothsch.pause();
                    rothsch.currentTime = 0;
                    intro.play();
                }
            } else {
                if (e.key === "w") {
                    cache.camera.move.forward();
                }

                if (e.key === "s") {
                    cache.camera.move.backward();
                }

                if (e.key === "d") {
                    cache.camera.move.right();
                }

                if (e.key === "a") {
                    cache.camera.move.left();
                }

                if (e.key === "ArrowUp") {
                    cache.camera.move.up();
                }

                if (e.key === "ArrowDown") {
                    cache.camera.move.down();
                }

                if (e.key === "ArrowLeft") {
                    cache.camera.rotate.left();
                }

                if (e.key === "ArrowRight") {
                    cache.camera.rotate.right();
                }
            }
        });

        document.querySelector("#layers-btn-add").addEventListener("click", () => {
            cache.addLayer();
        });

        (function() {
            let isVisisble = false;

            document.querySelector("#atom-nav .list-item").addEventListener("click", (e) => {
                let navOptList = e.currentTarget.parentElement.querySelector(".atom-nav__opt");
                isVisisble = !isVisisble;

                navOptList.style.display = isVisisble ? "flex" : "none";
            });
        })();
    });

    let fps = new fpsMount();

    canvas.resize = () => {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    canvas.loop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#404040";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        viewport.render();
        cursor.render();

        ctx.font = `12px ${root.getPropertyValue("--atom-font")}`;
        ctx.fillStyle = `#fff`;
        ctx.fillText(`FPS: ${fps.get()} Camera: { X: ${viewport.camera.x.toFixed(0)} Y: ${viewport.camera.y.toFixed(0)} Z: ${viewport.camera.z.toFixed(0)} rotX: ${viewport.camera.rotX.toFixed(3)} rotY: ${viewport.camera.rotY.toFixed(0)} rotZ: ${viewport.camera.rotZ.toFixed(0)} }`, 0, 12, canvas.width);

        reqFrame = window.requestAnimationFrame(() => {
            fps.track();
            canvas.loop();
        });
    }

    canvas.loop();

    document.addEventListener("DOMContentLoaded", () => {
        canvas.resize();
    });
    window.addEventListener("resize", function() {
        canvas.resize();
    });

    return { canvas, viewport }
})();
