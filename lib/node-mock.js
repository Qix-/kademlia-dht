'use strict';

var events  = require('events');
var util    = require('util');

function makeRandomIP() {
    return (Math.random() * 255 | 0).toString() + '.' +
           (Math.random() * 255 | 0).toString() + '.' +
           (Math.random() * 255 | 0).toString() + '.' +
           (Math.random() * 255 | 0).toString();
}

// Timeout duration while waiting for responses for a 'remote' mock node.
//
Object.defineProperty(exports, 'MOCK_TIMEOUT', {value: 500});

exports.NetworkMock = function() {
    this._nodes = {};
}

// Simple mock node implementation, for testing purposes. All the nodes in a
// same MockNetwork will be able to communicate. Endpoints are represented by
// random IPs.
//
exports.NodeMock = function(network) {
    events.EventEmitter.call(this);
    this._endpoint = makeRandomIP();
    this._network = network;
    network._nodes[this._endpoint] = this;
};

util.inherits(exports.NodeMock, events.EventEmitter);

// Get the node endpoint.
//
Object.defineProperty(exports.NodeMock.prototype, 'endpoint', {
    get: function() { return this._endpoint; }
});

// Send an arbitrary message to another node. If the node does not exist
// then timeout with an error. It it exists, and reply something, then
// call `cb(err, ...)` with the replied arguments.
//
// Here, 'sending' a message is actually just emitting an event on the 'remote'
// node, providing a callback that must be called back for the 'response' to
// be sent.
//
function sendMessage(message, endpoint, args, cb) {
    var node = this._network._nodes[endpoint];
    var res = false;
    setTimeout(function onTimeout() {
        if (res) return;
        res = true;
        var err = new Error('mock node timeout');
        err.code = 'ETIMEDOUT';
        cb(err);
    }, exports.MOCK_TIMEOUT);
    if (typeof node === 'undefined') return;
    var reply = function onMessageReply() {
        if (res) return;
        res = true;
        cb.apply(null, arguments);
    };
    node.emit.apply(node, [message].concat(args).concat(reply));
}

// PING the specified endpoint and calls `cb(err, replied)`. `replied`
// specify if the remote node replied positively to the ping.
//
exports.NodeMock.prototype.ping = function(endpoint, cb) {
    sendMessage.call(this, 'ping', endpoint, [], cb);
}

// Try a STORE operation of the key/value pair at the specified endpoint.
//
exports.NodeMock.prototype.store = function(endpoint, key, value, cb) {
    sendMessage.call(this, 'store', endpoint, [key, value], cb);
}

// Ask the specified endpoint about the specified ID closest nodes with
// a FIND_NODE.
//
exports.NodeMock.prototype.findNode = function(endpoint, id, cb) {
    sendMessage.call(this, 'findNode', endpoint, [id], cb);
}

// Ask the specified endpoint about the specified node ID value with a
// FIND_VALUE.
//
exports.NodeMock.prototype.findValue = function(endpoint, key, cb) {
    sendMessage.call(this, 'findValue', endpoint, [key], cb);
}

// Remove the mock node from the network.
//
exports.NodeMock.prototype.close = function() {
    delete this._network._nodes[this._endpoint];
}