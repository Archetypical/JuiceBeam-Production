const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const auth = require('../_middleware/authorize');
const userService = require('./user.service');
const eventService = require('../events/event.service');
// routes
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/register', registerSchema, register);
router.post('/password', auth.authorize(), resetPassword);
router.get('/', auth.authorize(), returnVerify);
router.post('/twitch', twitchAuth);
router.get('/current', auth.authorize(), getCurrent);
router.get('/balance/:event', auth.authorize(), checkBalance);
router.get('/update', auth.authorize(), returnUser);
router.get('/rank', auth.authorize(), updateRank);
router.get('/:id', auth.authorize(), getById);
router.put('/:id', auth.authorize(), updateSchema, update);
router.delete('/:id', auth.authorize(), _delete);

module.exports = router;

function authenticateSchema(req, res, next) {
    const schema = Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
    userService.authenticate(req.body)
        .then(user => res.json(user))
        .catch(next);
}


function resetPassword(req, res, next) {
    userService.resetPassword(req.user.username, req.body)
        .then(user => res.json(user))
        .catch(next);
}

function twitchAuth(req, res, next) {
    userService.twitchAuth(req.body)
        .then(response => res.json(response))
        .catch(next);
}

function registerSchema(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().min(6).required()
    });
    validateRequest(req, next, schema);
}
function register(req, res, next) {
    userService.create(req.body)
        .then(() => res.json({ message: 'Registration successful' }))
        .catch(next);
}

function getCurrent(req, res, next) {
    res.json(req.user);
}

function getById(req, res, next) {
    userService.getById(req.params.id)
        .then(user => res.json(user))
        .catch(next);
}

function returnUser(req, res, next){
    userService.returnUser(req.user.username, req.headers.authorization.replace("Bearer ", ""))
        .then(user => res.json(user))
        .catch(next);
}

function returnVerify(req, res, next) {
    res.json(true);
}

function checkBalance(req, res, next) {
    eventService.checkBalance(req.user.username, req.params.event)
        .then(isEnough => res.json(isEnough))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().empty(''),
        username: Joi.string().empty(''),
        password: Joi.string().min(6).empty(''),
        rank: Joi.string().empty(''),
        points: Joi.string().empty(''),
        twitchID: Joi.string().empty(''),
    });
    validateRequest(req, next, schema);
}

function updateRank(req, res, next) {
    userService.updateRank(req.user.username)
        .then(response => res.json(response))
        .catch(next);
}

function update(req, res, next) {
    userService.update(req.params.id, req.body)
        .then(user => res.json(user))
        .catch(next);
}

function _delete(req, res, next) {
    userService.delete(req.params.id)
        .then(() => res.json({ message: 'User deleted successfully' }))
        .catch(next);
}