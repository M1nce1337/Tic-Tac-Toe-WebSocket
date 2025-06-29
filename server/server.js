const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const app = express();
app.use(express.static(path.join(__dirname, '..','client'))); // обработка статических файлов клиента
app.listen(3000);
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });
httpServer.listen(8080); // по порту 8080 общаемся через вебсокет

const clientConnections = {};
let clientIdsWaitingMatch = [];
opponents = {};
wss.on('connection', (connection) => {
    const clientId = createClientId();
    clientConnections[clientId] = connection;
    matchClients(clientId);
    connection.on("message", message => {
        const result = JSON.parse(message);
        if (result.method === "move") {
            moveHandler(result, clientId);
        }
    });
});
let clientIdCounter = 0;

function createClientId() {
    clientIdCounter++;
    return clientIdCounter;
}

function matchClients(clientId) {
    clientIdsWaitingMatch.push(clientId);
    if (clientIdsWaitingMatch.length < 2) return;
    const firstClientId = clientIdsWaitingMatch.shift();
    const secondClientId = clientIdsWaitingMatch.shift();
    opponents[firstClientId] = secondClientId;
    opponents[secondClientId] = firstClientId;
    clientConnections[firstClientId].send(JSON.stringify({
        method: 'join',
        symbol: 'X',
        turn: 'X'
    }));

    clientConnections[secondClientId].send(JSON.stringify({
        method: 'join',
        symbol: 'O',
        turn: 'X'
    }));
}

function moveHandler(result, clientId) {
    const opponentId = opponents[clientId];
    if (checkWin(result.field)) {
        [clientId, opponentId].forEach((connectionId) => {
            clientConnections[connectionId].send(JSON.stringify({
                method: 'result',
                message: `${result.symbol} won!`,
                field: result.field
            }));
        });
        return;
    }
    if (checkDraw(result.field)) {
        [clientId, opponentId].forEach((connectionId) => {
            clientConnections[connectionId].send(JSON.stringify({
                method: 'result',
                message: `Draw!`,
                field: result.field
            }));
        });
        return;
    }
    [clientId, opponentId].forEach((connectionId) => {
        clientConnections[connectionId].send(JSON.stringify({
            method: 'update',
            turn: result.symbol === "X" ? "O" : "X",
            field: result.field
        }));
    });
}

const winningCombinations = [
    [0,1,2], [3,4,5], [6,7,8], // строки
    [0,3,6], [1,4,7], [2,5,8], // столбцы
    [0,4,8], [2,4,6]           // диагонали
];
function checkWin(field) {
    return winningCombinations.some(combo => {
        const [first,second,third] = combo;
        return field[first] !== "" && field[first] === field[second] && field[first] === field[third];
    })
}
function checkDraw(field) {
    return field.every(symbol => symbol === "X" || symbol === "O");
}