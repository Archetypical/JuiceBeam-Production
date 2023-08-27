const express = require('express');
const videoService = require('./video.service');
const router = express.Router();


router.get('/:page', pushVideos);


module.exports = router;



function pushVideos(req, res, next) {
    videoService.pushVideos(req.params.page)
        .then(videoData => res.json(videoData))
        .catch(next);
}