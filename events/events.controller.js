const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('_middleware/validate-request');
const auth = require('_middleware/authorize');
const eventService = require('./event.service');


router.get('/', auth.authorize(), getEvents);
router.post('/run', auth.authorize(), eventSchema, runEvent);

module.exports = router;

function getEvents(req, res, next) {
    eventService.getEvents(req.user.username)
        .then(rankEvents => res.json(rankEvents))
        .catch(next);
}

function runEvent(req, res, next) {
    eventService.create(req.body.eventname, req.user.username)
        .then(() => eventService.eventPusher())
        .then(() => res.json({ status: true }))
        .catch(next);
}

function eventSchema(req, res, next) {
    const schema = Joi.object({
        eventname: Joi.string().required(),
    });
    validateRequest(req, next, schema);
}
