const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const auth = require("../_middleware/authorize");
const adminService = require("./admin.service");

router.post("/users/add-user", auth.authorizeAdmin(), addNewUser);
router.post("/settings", auth.authorizeAdmin(), settingsInit, settingsDefine);
router.get("/settings", auth.authorizeAdmin(), settingsInit, getSettings);
router.get("/settings/user", settingsInit, reqSettings);
router.put("/users/update", auth.authorizeAdmin(), updateUser);
router.delete("/users/delete/:id", auth.authorizeAdmin(), deleteUser);
router.get("/", auth.authorizeAdmin(), returnVerify);
router.get("/users/user/:id", auth.authorizeAdmin(), getUser);
router.get("/users/list/data/:query", auth.authorizeAdmin(), getSortedUsers);
router.get("/videos/list/:query", auth.authorizeAdmin(), getSortedVideos);
router.get("/users/list/all-data", auth.authorizeAdmin(), getAllUsers);

module.exports = router;

function addNewUser(req, res, next) {
  adminService
    .addNewUser(req.body)
    .then((user) => res.json(user))
    .catch(next);
}

function deleteUser(req, res, next) {
  adminService
    .deleteUser(req.params.id)
    .then((response) => res.json(response))
    .catch(next);
}

function getUser(req, res, next) {
  adminService
    .getUserById(req.params.id)
    .then((user) => res.json(user))
    .catch(next);
}

function updateUser(req, res, next) {
  adminService
    .updateUser(req.body)
    .then((response) => res.json(response))
    .catch(next);
}

function getSortedUsers(req, res, next) {
  adminService
    .sortedUsers(req.params.query)
    .then((users) => res.json(users))
    .catch(next);
}

function getSortedVideos(req, res, next) {
  adminService
    .sortedVideos(req.params.query)
    .then((users) => res.json(users))
    .catch(next);
}

function settingsInit(req, res, next) {
  adminService.settingsInit(next);
}

function settingsDefine(req, res, next) {
  adminService.settingsDefine(req.body)
    .then((response) => res.json(response))
    .catch(next);
}

function getSettings(req, res, next) {
  adminService.getSettings()
    .then((settings) => res.json(settings))
    .catch(next);
}

function reqSettings(req, res, next) {
  adminService.reqSettings()
    .then((settings) => res.json(settings))
    .catch(next);
}

function getAllUsers(req, res, next) {
  adminService
    .getAllUsers()
    .then((users) => res.json(users))
    .catch(next);
}

function returnVerify(req, res, next) {
    console.log("Admin Panel Deployed");
    res.json(true)
}
