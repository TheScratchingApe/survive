// =========================
// == game.js (client-side)
// =========================

// =========================
// === Variables / Setup ===
// =========================
var uiDiv = document.getElementById("uiDiv");
var countdownDiv = document.getElementById("countdown");
var scoreDiv = document.getElementById("scoreDiv");
var canvas = document.getElementById('ctx');
var ctx = canvas.getContext("2d");

var clickCooldown = 0;
ctx.font = "100px Arial";
ctx.textAlign = "center";
ctx.fillStyle = "#FFFFFF";
ctx.fillRect(0, 0, 1200, 600);
ctx.fillStyle = "#BBBBBB";

ctx.fillStyle = "#000000";
ctx.fillText("No game data =(", 600, 300);
ctx.font = "30px Arial";
ctx.fillText("Try reloading the page.", 600, 330);

ctx.font = "10px Arial";
setTimeout(function () {
    uiDiv.style.height = "0px";
    $("#menuTextDiv").height("20px");
}, 500);

// Connexion Socket.IO
var socket = io();

// Identifiant local
var id = 0.0;
var mx = 0;  // position souris X (0..1200)
var my = 0;  // position souris Y (0..600)
var lmx = -1;
var lmy = -1;

var upgHP = 500;
var uiVisible = false;
var shooter_blink_state = true;
var dead = false;
var respawnCooldown = 0;
var colorBlink = 0;

// =========================
// == Gestion du cache images
// =========================
var imageCache = {};
function getImage(src) {
    if (!imageCache[src]) {
        var img = new Image();
        img.src = src;
        imageCache[src] = img;
    }
    return imageCache[src];
}

// Chargement d'une image de fond (facultatif)
var backgroundImg = getImage("/client/assets/background.png");

// ==========================
// == Événements / Sockets ==
// ==========================
socket.on("id", function (data) {
    console.log("Your id is " + data.id);
    id = data.id;
    setTimeout(function () {
        socket.emit("kthx"); // avertir le serveur "ok je suis prêt"
    }, 100);
});

function nameInputKeydown(event) {
    if (event.keyCode == 13) {
        $('#setName').click();
    }
}

// Bouton upgrade HP
$("#upgradehp").click(function () {
    if (clickCooldown < 1) {
        clickCooldown = 1;
        setTimeout(function () {
            socket.emit("upgHPClicked");
        }, 100);
    }
});

// Fonction pour changer le nom
function changeName() {
    if (clickCooldown < 1) {
        clickCooldown = 1;
        let name = "" + $("#nameInput").val();
        if (name === "") {
            name = "Unnamed";
        }
        console.log("changing name to " + name);
        socket.emit("changeName", { name: name });
        setCookie("jsshooter_name", name, 60);
        $("#nameInput").val(name);
    }
}
// Au clic du bouton "Set name"
$("#setName").click(function () {
    changeName();
});

// Bouton upgrade dual bullets
$("#upgradedb").click(function () {
    if (clickCooldown < 1) {
        clickCooldown = 1;
        setTimeout(function () {
            socket.emit("upgDualBullets");
        }, 100);
    }
});

// Bouton upgrade bullet size
$("#upgradeBulletSize").click(function () {
    if (clickCooldown < 1) {
        clickCooldown = 1;
        setTimeout(function () {
            socket.emit("upgBulletSize");
        }, 100);
    }
});

// Bouton upgrade fire speed
$("#upgradefs").click(function () {
    if (clickCooldown < 1) {
        clickCooldown = 1;
        setTimeout(function () {
            socket.emit("upgFSpeedClicked");
        }, 100);
    }
});

// Gestion de l'UI (ex-bande du bas) si tu en as encore besoin
function mouseMove(e) {
    mx = Math.round((e.clientX / window.innerWidth) * 1200);
    my = Math.round((e.clientY / window.innerHeight) * 600);

    // Mécanique d'afficher / cacher le menu
    if (e.clientY < window.innerHeight - 70 && uiVisible && !$("#mlock").prop('checked')) {
        unfocus();
        uiVisible = false;
        uiDiv.style.height = "0px";
        $("#menuTextDiv").height("20px");
    } else if (e.clientY > window.innerHeight - 40 && !uiVisible) {
        uiVisible = true;
        $("#menuTextDiv").height("0px");
        uiDiv.style.height = "55px";
    }
}

function unfocus() {
    let tmp = document.createElement("input");
    document.body.appendChild(tmp);
    tmp.focus();
    document.body.removeChild(tmp);
}

// Réponse au ping "afk?" du serveur
socket.on("afk?", function (data) {
    socket.emit("not afk");
});

// =====================
// == Mise à jour prix ==
// =====================
socket.on("price", function (data) {
    upgHP = data.upgHP;

    // IMPORTANT : on vise désormais le <span id="upgradehp_label">
    $("#upgradehp_label").text("Upgrade HP (" + upgHP + ")");
    if (data.score >= upgHP && !dead) {
        $("#upgradehp").prop("disabled", false);
    } else {
        $("#upgradehp").prop("disabled", true);
    }

    // Fire Speed
    if (data.doubleFireSpeed) {
        if (data.quadrupleFireSpeed) {
            $("#upgradefs_label").text("Quadruple fire speed");
            $("#upgradefs").prop("disabled", true);
        } else {
            $("#upgradefs_label").text("Quadruple fire speed (8000)");
            if (data.score >= 8000 && !dead) {
                $("#upgradefs").prop("disabled", false);
            } else {
                $("#upgradefs").prop("disabled", true);
            }
        }
    } else {
        $("#upgradefs_label").text("Double fire speed (2000)");
        if (data.score >= 2000 && !dead) {
            $("#upgradefs").prop("disabled", false);
        } else {
            $("#upgradefs").prop("disabled", true);
        }
    }

    // Bullet size
    if (data.doubleBulletSize) {
        $("#upgradeBulletSize").prop("disabled", true);
        $("#upgradeBulletSize_label").text("Upgrade bullet size");
    } else {
        $("#upgradeBulletSize_label").text("Upgrade bullet size (5000)");
        if (data.score >= 5000 && !dead) {
            $("#upgradeBulletSize").prop("disabled", false);
        } else {
            $("#upgradeBulletSize").prop("disabled", true);
        }
    }

    // Dual / quadruple bullets
    if (data.dualBullets) {
        if (data.quadrupleBullets) {
            $("#upgradedb").prop("disabled", true);
            $("#upgradedb_label").text("Quadruple bullets");
        } else {
            $("#upgradedb").prop("disabled", true);
            $("#upgradedb_label").text("Quadruple bullets (8000)");
            if (data.score >= 8000 && !dead) {
                $("#upgradedb").prop("disabled", false);
            } else {
                $("#upgradedb").prop("disabled", true);
            }
        }
    } else {
        $("#upgradedb_label").text("Dual bullets (5000)");
        if (data.score >= 5000 && !dead) {
            $("#upgradedb").prop("disabled", false);
        } else {
            $("#upgradedb").prop("disabled", true);
        }
    }
});

// ======================
// == Rendu principal ==
// ======================
socket.on("newPositions", function (data) {
    // Efface et dessine fond
    ctx.clearRect(0, 0, 1200, 600);
    ctx.drawImage(backgroundImg, 0, 0, 1200, 600);

    // === Dessin des joueurs ===
    for (let i = 0; i < data.players.length; i++) {
        // Si c'est moi, mise à jour HP / Score
        if (data.players[i].id == id) {
            let status = "HP: " + data.players[i].hp + "/" + data.players[i].maxHp
                        + " Score: " + data.players[i].score;
            scoreDiv.innerHTML = status;
            $("#powerupCountdownTimer").html(data.players[i].powerupTime);

            if (data.players[i].powerupTime < 0) {
                $("#powerupCountdown").hide();
            }
            if (data.players[i].spawnCooldown > -1) {
                // mort => respawn
                dead = true;
                respawnCooldown = data.players[i].spawnCooldown;
            } else {
                dead = false;
            }
        }

        // On ne dessine que s’il spawnCooldown < 0 => vivant
        if (data.players[i].spawnCooldown < 0) {
            let playerAlpha = 1;
            let playerTextColor;

            // Effet powerup ?
            if (data.players[i].powerupTime > 0) {
                playerAlpha = 1 - colorBlink;
                // cercles colorés
                ctx.strokeStyle = "rgba(0, 0, 255, " + playerAlpha + ")";
                ctx.beginPath();
                ctx.arc(
                    data.players[i].x,
                    data.players[i].y,
                    10 + Math.sin(Date.now() / 500) * 5,
                    0,
                    2 * Math.PI
                );
                ctx.stroke();

                ctx.strokeStyle = "rgba(0, 255, 0, " + playerAlpha + ")";
                ctx.beginPath();
                ctx.arc(
                    data.players[i].x,
                    data.players[i].y,
                    10 + Math.cos(Date.now() / 500) * 5,
                    0,
                    2 * Math.PI
                );
                ctx.stroke();

                if (data.players[i].id == id) {
                    $("#powerupCountdown").show();
                }
            }

            // Couleur pseudo
            if (data.players[i].id == id) {
                playerTextColor = "rgba(0, 160, 0, " + playerAlpha + ")";
            } else {
                playerTextColor = "rgba(255, 0, 0, " + playerAlpha + ")";
            }

            // Image de joueur
            let playerImgSrc = data.players[i].image || "/client/assets/player.png";
            let playerImg = getImage(playerImgSrc);

            // Dessin sprite + rotation
            ctx.save();
            ctx.translate(data.players[i].x, data.players[i].y);
            ctx.rotate((data.players[i].angle * Math.PI) / 180);
            ctx.drawImage(playerImg, -20, -20, 40, 40);
            ctx.restore();

            // Dessin pseudo
            ctx.fillStyle = playerTextColor;
            ctx.textAlign = "center";
            ctx.fillText(data.players[i].name, data.players[i].x, data.players[i].y - 30);
            ctx.fillText(data.players[i].hp + " HP", data.players[i].x, data.players[i].y - 15);
        }
    }

    // === Dessin des powerups (boost.png) ===
    for (let i = 0; i < data.powerups.length; i++) {
        let pow = data.powerups[i];
        let powerupImg = getImage("/client/assets/boost.png");

        // Petit effet "bounce"
        let size = 24 + Math.sin(Date.now() / 250) * 2;
        ctx.drawImage(powerupImg, pow.x - size / 2, pow.y - size / 2, size, size);
    }

    // === Dessin des bullets ===
    for (let i = 0; i < data.bullets.length; i++) {
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        let renderSize = (data.bullets[i].size > 1) ? 3 : 2;
        ctx.arc(
            data.bullets[i].x - renderSize / 2,
            data.bullets[i].y - renderSize / 2,
            renderSize,
            0,
            Math.PI * 2,
            true
        );
        ctx.closePath();
        ctx.fill();
    }

    // === Dessin des blocks (remplacés par coin.png) ===
    for (let i = 0; i < data.blocks.length; i++) {
        let block = data.blocks[i];
        let coinImg = getImage("/client/assets/coin.png");

        // Pièce qui tourne
        ctx.save();
        ctx.translate(block.x, block.y);
        let coinAngle = (Date.now() / 200) % (2 * Math.PI);
        ctx.rotate(coinAngle);
        ctx.drawImage(coinImg, -12, -12, 24, 24);
        ctx.restore();
    }

    // === Dessin des attackers (fighter.png) ===
    for (let i = 0; i < data.attackers.length; i++) {
        let attacker = data.attackers[i];
        let attackerImg = getImage(attacker.image || "/client/assets/fighter.png");

        ctx.save();
        ctx.translate(attacker.x, attacker.y);
        ctx.rotate(attacker.angle * Math.PI / 180);
        ctx.drawImage(attackerImg, -20, -20, 40, 40);
        ctx.restore();
    }

    // === Dessin des shooters (shooter.png) ===
    for (let i = 0; i < data.shooters.length; i++) {
        let s = data.shooters[i];
        let shooterImg = getImage(s.image || "/client/assets/shooter.png");

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle * Math.PI / 180);
        ctx.drawImage(shooterImg, -20, -20, 40, 40);
        ctx.restore();

        // Blink rouge si me cible
        if (s.target == id) {
            if (shooter_blink_state) {
                ctx.beginPath();
                ctx.strokeStyle = "rgba(255,0,0,0.4)";
                ctx.arc(s.x, s.y, 30, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    }

    // Écran de mort (respawn)
    if (dead) {
        $("#death").show();
        countdownDiv.innerHTML = "Respawn in " + respawnCooldown;
    } else {
        $("#death").hide();
    }
});

// ==========================
// == Spam / click cooldown ==
// ==========================
setInterval(function () {
    if (clickCooldown > 0) {
        clickCooldown--;
    } else {
        clickCooldown = -1;
    }
}, 50);

// ============================
// == Envoi position souris ==
// ============================
// 20 fois par seconde
setInterval(function () {
    if (!(lmx == mx && lmy == my)) {
        let pack = { x: mx, y: my };
        socket.emit('mouseMove', pack);
        lmx = mx;
        lmy = my;
    }
}, 50);

// Blink state pour shooters
setInterval(function () {
    shooter_blink_state = !shooter_blink_state;
}, 500);

// Variation sinus pour effet colorBlink
setInterval(function () {
    colorBlink = Math.abs(Math.sin(new Date().getTime() / 700));
}, 50);

// =====================
// == Gestion clavier ==
// =====================
var keyRightDown, keyLeftDown, keyUpDown, keyDownDown = false;

document.onkeydown = function (event) {
    if ((event.keyCode === 68 || event.keyCode === 39) && !keyRightDown) {
        keyRightDown = true;
        socket.emit('keyPress', { inputId: 'right', state: true });
    } else if ((event.keyCode === 83 || event.keyCode === 40) && !keyDownDown) {
        keyDownDown = true;
        socket.emit('keyPress', { inputId: 'down', state: true });
    } else if ((event.keyCode === 65 || event.keyCode === 37) && !keyLeftDown) {
        keyLeftDown = true;
        socket.emit('keyPress', { inputId: 'left', state: true });
    } else if ((event.keyCode === 87 || event.keyCode === 38) && !keyUpDown) {
        keyUpDown = true;
        socket.emit('keyPress', { inputId: 'up', state: true });
    }
};

document.onkeyup = function (event) {
    if (event.keyCode === 68 || event.keyCode === 39) {
        keyRightDown = false;
        socket.emit('keyPress', { inputId: 'right', state: false });
    } else if (event.keyCode === 83 || event.keyCode === 40) {
        keyDownDown = false;
        socket.emit('keyPress', { inputId: 'down', state: false });
    } else if (event.keyCode === 65 || event.keyCode === 37) {
        keyLeftDown = false;
        socket.emit('keyPress', { inputId: 'left', state: false });
    } else if (event.keyCode === 87 || event.keyCode === 38) {
        keyUpDown = false;
        socket.emit('keyPress', { inputId: 'up', state: false });
    }
};

window.onblur = function () {
    keyRightDown = false;
    keyLeftDown = false;
    keyUpDown = false;
    keyDownDown = false;

    socket.emit('keyPress', { inputId: 'right', state: false });
    socket.emit('keyPress', { inputId: 'left', state: false });
    socket.emit('keyPress', { inputId: 'up', state: false });
    socket.emit('keyPress', { inputId: 'down', state: false });
};

// =========================
// == Gestion du cookie nom
// =========================
try {
    if (getCookie("jsshooter_name") !== "") {
        if (getCookie("jsshooter_name").length > 18) {
            console.error("[Warning] Name stored in cookie is too long. resetting to Unnamed");
            setCookie("jsshooter_name", "Unnamed", 360);
        }
        $("#nameInput").val(getCookie("jsshooter_name"));
        $('#setName').click();
    } else {
        setCookie("jsshooter_name", "Unnamed", 360);
    }
} catch (err) {
    // Ignore
}
