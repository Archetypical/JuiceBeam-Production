const config = require("config.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("_helpers/db");
//const { body } = require("express-validator");
const videoService = require("../videos/video.service");

module.exports = {
  getAllUsers,
  getUserById,
  sortedUsers,
  sortedVideos,
  settingsInit,
  settingsDefine,
  getSettings,
  reqSettings,
  addNewUser,
  updateUser,
  deleteUser,
};

//Settings Model Constraints
const eventsMode = ["play", "stop"];

async function getAllUsers() {
  var data = await db.User.findAll({ raw: true });
  for (var i = 0; i < data.length; i++) {
    var { hash, createdAt, updatedAt, ...trimmedUser } = data[i];
    data[i] = trimmedUser;
  }
  return [200, data];
}

async function deleteUser(id) {
  const user = await getUserById(id);
  await user.destroy();
  return [200];
}

async function updateUser(params) {
  if (params.username.length > 15) {
    throw "Username must be less than 15 characters.";
  }

  const user = await db.User.findOne({ where: { id: params.id } });
  const comparedUser1 = await db.User.findOne({
    where: { username: params.username },
    raw: true,
  });
  const comparedUser2 = await db.User.findOne({
    where: { email: params.email },
    raw: true,
  });

  //check to see if the new parameters for this user
  //are already defined in another
  if (comparedUser1 && comparedUser1.id != user.id) {
    throw `Username ${params.username} is already taken`;
  } else if (comparedUser2 && comparedUser2.id != user.id) {
    throw "Email matches an existing account";
  }

  //capitalize
  params.role = params.role.charAt(0).toUpperCase() + params.role.slice(1);
  params.rank = params.rank.charAt(0).toUpperCase() + params.rank.slice(1);

  for (var property in params) {
    if (params[property] == "") {
      params[property] = user[property];
    }
  }

  Object.assign(user, params);
  await user.save();
  return [200];
}

const parseParams = (querystring) => {
  // parse query string
  const params = new URLSearchParams(querystring);

  const obj = {};

  // iterate over all keys
  for (const key of params.keys()) {
    if (params.getAll(key).length > 1) {
      obj[key] = params.getAll(key);
    } else {
      obj[key] = params.get(key);
    }
  }

  return obj;
};

async function sortedVideos(params) {
  params = parseParams(params);

  const { q = "", perPage = 10, page = 1 } = params;

  const data = await db.Video.findAll({ raw: true });

  for (var i = 0; i < data.length; i++) {
    var { description, ...trimmedVideo } = data[i];
    data[i] = trimmedVideo;
  }

  const queryLowered = q.toLowerCase();

  const filteredData = data.filter(
    (video) =>
      video.id.toString().includes(queryLowered) ||
      video.title.toLowerCase().includes(queryLowered) ||
      video.date.toString().toLowerCase().includes(queryLowered) ||
      video.resourceId.toString().toLowerCase().includes(queryLowered) ||
      video.thumbnail.toLowerCase().includes(queryLowered)
  );

  return [
    200,
    {
      videos: paginateArray(filteredData, perPage, page),
      allData: data,
      total: filteredData.length,
    },
  ];
}

async function settingsInit(next) {
  if (await settingsCheck()) {
    next();
    return;
  }

  const model = {
    playlistId: "undefined",
    eventsMode: "play",
    youtubeApiKey: "undefined", //defined by api manager
    twitchClientId: "undefined", //defined by api manager
    twitchClientSecret: "undefined", //defined by api manager
    twitchName: "undefined",
    channelName: "undefined",
    channelId: "undefined",
    maxResults: 50,
  };
  // save settings
  await db.Settings.create(model);
  next();
}

async function settingsCheck() {
  var check = await db.Settings.findOne({ where: { id: 1 } });
  return check != null ? true : false;
}

async function settingsDefine(params) {
  var settings = await db.Settings.findOne({ where: { id: 1 } }); //raw data doesn't have save function

  //discern between changing youtube channel, twitch channel, and changing api data
  if (params.channelName != settings.channelName) {
    if (!params.maxResults) params.maxResults = 50;
    //Repopulate the video database when the channel name is changed or if maxResults has been changed
    if (
      params.channelName != "" ||
      (settings.youtubeApiKey != "undefined" &&
        params.maxResults != settings.maxResults)
    ) {
      //Find users channel
      params.channelId = await videoService.findChannel(
        params.channelName,
        settings.youtubeApiKey
      );
      //If a user was found
      if (params.channelId) {
        //Repopulate database with new videos
        params.playlistId = await videoService.grabVideos(
          settings.youtubeApiKey,
          params.channelId,
          params.maxResults
        );
      }
    }
  }

  Object.assign(settings, params);
  await settings.save();
  return [200];
}

async function videoDataRefresh() {
  var settings = await db.Settings.findOne({ where: { id: 1 } });
  await videoService.grabVideos(
    settings.youtubeApiKey,
    settings.channelId,
    settings.maxResults
  );
}

async function reqSettings(){
  const settings = await db.Settings.findOne({ where: { id: 1 }, raw: true });
  let twitch = settings.twitchName;
  return [200, {twitchName: twitch}];
}

async function getSettings() {
  const settings = await db.Settings.findOne({ where: { id: 1 }, raw: true });

  //organize settings parameters into objects
  const api = {
    ytKey: settings.youtubeApiKey,
    twId: settings.twitchClientId,
    twSec: settings.twitchClientSecret,
  };
  const accounts = {
    youtube: { name: settings.channelName, ID: settings.channelId },
    twitch: { name: settings.twitchName },
  };
  const videoParam = {
    playlistId: settings.playlistId,
    maxResults: settings.maxResults,
  };
  const eventParam = { eventsMode: settings.eventsMode };

  const organizedSettings = {
    api: api,
    accounts: accounts,
    videoParam: videoParam,
    eventParam: eventParam,
  };

  return [200, organizedSettings];
}

async function sortedUsers(params) {
  params = parseParams(params);
  const {
    q = "",
    page = 1,
    role = null,
    perPage = 10,
    sort = "asc",
    rank = "",
    sortColumn = "username",
  } = params;
  console.log(params);
  const data = await db.User.findAll({ raw: true });

  for (var i = 0; i < data.length; i++) {
    var { hash, createdAt, updatedAt, ...trimmedUser } = data[i];
    data[i] = trimmedUser;
  }

  //user to find by name
  const queryLowered = q.toLowerCase();

  const dataAsc = data.sort((a, b) => (a[sortColumn] < b[sortColumn] ? -1 : 1));

  const dataToFilter = sort == "asc" ? dataAsc : dataAsc.reverse();

  const filteredData = dataToFilter.filter(
    (user) =>
      (user.email.toLowerCase().includes(queryLowered) ||
        user.username.toLowerCase().includes(queryLowered)) &&
      user.role === (role || user.role) &&
      user.rank === (rank || user.rank)
  );

  var userList = paginateArray(filteredData, perPage, page);
  return [
    200,
    {
      total: filteredData.length,
      users: userList,
    },
  ];
}

async function getUserById(id) {
  const user = await db.User.findByPk(id);
  if (!user) throw "User not found";
  return user;
}

async function addNewUser(params) {
  // validate
  var emailCheck = /^\S+@\S+\.\S+$/;
  if (await db.User.findOne({ where: { username: params.username } })) {
    throw 'Username "' + params.username + '" is already taken';
  } else if (await db.User.findOne({ where: { username: params.email } })) {
    throw "Email matches an existing account";
  }

  // hash password
  if (params.password) {
    params.hash = await bcrypt.hash(params.password, 10);
  }

  params.points = 0;
  params.twitchID = 0;
  // save user
  await db.User.create(params);
  return [201, { params }];
}

const paginateArray = (array, perPage, page) => {
  users = array.slice((page - 1) * perPage, page * perPage);
  return users;
};


