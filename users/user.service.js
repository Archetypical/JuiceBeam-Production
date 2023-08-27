const config = require("config.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("_helpers/db");
const fetch = require("cross-fetch");

module.exports = {
  authenticate,
  resetPassword,
  twitchAuth,
  getById,
  create,
  update,
  returnUser,
  updateRank,
};




async function authenticate({ username, password }) {
  const user = await db.User.scope("withHash").findOne({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.hash)))
    throw "Username or password is incorrect";

  // authentication successful
  const token = jwt.sign({ sub: user.id }, config.secret, { expiresIn: "7d" });
  return { ...omitHash(user.get()), token };
}

async function resetPassword(username, params){
  const user = await db.User.scope("withHash").findOne({ where: { username } });
  if (!user || !(await bcrypt.compare(params.password, user.hash)))
    throw "Password is incorrect";
  
  if (params.newPassword) {
    params.hash = await bcrypt.hash(params.newPassword, 10);
  }
  
  Object.assign(user, params);
  await user.save();
  return "User Password Changed Successfully";
}

async function twitchAuth(params) {
  const clientID = "2ycvvf2zsvwyvso2b8q9i9mjajs9yd";
  const clientSecret = "90780h0gm017viv4i1ejd678da2s2o";
  const accessCode = "Bearer " + params.accessCode;
  const header = {
    Authorization: accessCode,
    "Client-Id": clientID,
  };

  const requestOptions = {
    method: "GET",
    headers: header,
  };

  //const url = `https://id.twitch.tv/oauth2/token?client_id=${clientID}&client_secret=${clientSecret}&code=${accessCode}&grant_type=authorization_code&redirect_uri=http://localhost:8080/`;
  const url = "https://api.twitch.tv/helix/users";

  const res = await fetch(url, requestOptions);

  if (res.status >= 400) {
    throw new Error("Bad response from server");
  }

  var final = await res.json();
  var twitchUser = final.data[0];
  var user = await db.User.findOne({ where: { email: twitchUser.email }});
  var token;
  var model = {};
  console.log(user);
  if (!user){
    user = await db.User.findAll({ where: { twitchID: twitchUser.id }, raw: true});
    console.log(user);
    if(user[1]){
      throw "Your Twitch ID is linked to multiple accounts. Manual sign in is required.";
    }
    else if(user[0] && user[0].twitchID != 0){
      token = jwt.sign({ sub: user[0].id }, config.secret, { expiresIn: "7d" });
      user = { ...omitHash(user[0]) };
      user.token = token;
      console.log("User Login with ID: " + user.username); 
      return {action: "login", user: user}; //return user info and login
    }
  }
  else if (user.twitchID == twitchUser.id){ //if email and twitch id match
    token = jwt.sign({ sub: user.dataValues.id }, config.secret, { expiresIn: "7d" });
    user = { ...omitHash(user.dataValues) };
    user.token = token;
    console.log("User Login with Email then check ID: " + user.username);
    return {action: "login", user: user}; //return user info and login
  }
  else if (user.twitchID == 0){ //if twitch id empty, marry the accounts through the id
    model.twitchID = twitchUser.id;
    Object.assign(user, model);
    await user.save();
    token = jwt.sign({ sub: user.dataValues.id }, config.secret, { expiresIn: "7d" });
    user = { ...omitHash(user.dataValues) };
    user.token = token;
    console.log("User Merge ID and Login: " + user.username + " with " + twitchUser.id);
    return {action: "login", user: user};
  }


  if( await db.User.findOne({ where: { username: twitchUser.login }})){
    throw "Your Twitch username is in use by another account. Please sign up manually and link Twitch in your account settings."
  }

  //create new user
  model.email = twitchUser.email;
  model.username = twitchUser.login;
  model.rank = "Dreamer";
  model.points = '0';
  model.twitchID = twitchUser.id;
  model.hash = await bcrypt.hash(twitchUser.id, 10); 
  model.role = "User";
  await db.User.create(model);
  user = { ...omitHash(user.dataValues) };
  token = jwt.sign({ sub: user.id }, config.secret, { expiresIn: "7d" });
  user.token = token;
  console.log("User Created and Logged In: " + model.username);
  return {action: "login", user: user}; //return user info and login
}


async function twitchLink(){
  
}

async function getById(id) {
  return await getUser(id);
}

async function create(params) {
  // validate
  var emailCheck = /^\S+@\S+\.\S+$/;
  if (params.username.length > 15){
    throw "Username must be less than 15 characters.";
  }
  else if (await db.User.findOne({ where: { username: params.username } })) {
    throw 'Username "' + params.username + '" is already taken';
  }
  else if (await db.User.findOne({ where: { username: params.email } })){
    throw 'Email matches an existing account';
  }
  else if(!emailCheck.test(params.email)){
    throw 'Please use a valid email';
  }

  // hash password
  if (params.password) {
    params.hash = await bcrypt.hash(params.password, 10);
  }
  params.rank = "Dreamer";
  params.points = "0";
  params.twitchID = "0";
  params.role = "User";
  // save user
  await db.User.create(params);
}

async function update(id, params) {
  const user = await getUser(id);

  // validate
  const usernameChanged = params.username && user.username !== params.username;
  if (
    usernameChanged &&
    (await db.User.findOne({ where: { username: params.username } }))
  ) {
    throw 'Username "' + params.username + '" is already taken';
  }

  // hash password if it was entered
  if (params.password) {
    params.hash = await bcrypt.hash(params.password, 10);
  }

  // copy params to user and save
  Object.assign(user, params);
  await user.save();
  return omitHash(user.get());
}

async function updateRank(name) {
  //each channel point will equal 5% of a juice point
  //ex: 100 Channel = 5 Juice
  const ranks = [
    {
      rank: "Dreamer",
      cost: "0",
    },
    {
      rank: "Heartbeat",
      cost: "200",
    },
    {
      rank: "Insightful",
      cost: "350",
    },
    {
      rank: "Lucid",
      cost: "400",
    },
    {
      rank: "Visionary",
      cost: "550",
    },
    {
      rank: "Enlightened",
      cost: "800",
    },
  ];

  const user = await getUserByName(name);
  var param = user;
  if(user.rank == ranks[ranks.length - 1].rank){
    throw new Error("You have already reached Enlightenment.");
  }
  for (var i = 0; i <= ranks.length; i++) {
    if (user.rank == ranks[i].rank) {
      //find current rank of user
      if (user.points >= ranks[i + 1].cost) {
        //check if user has enough points to upgrade
        param.rank = ranks[i + 1].rank; //increment rank for model
        param.points = user.points - ranks[i + 1].cost; //subtract rank cost from current points
        break;
      } else {
        throw new Error("Not Enough Juice.");
      }
    }
  }
  Object.assign(user, param); //assign model to user
  await user.save(); //save model to database
  return [200];
}


// helper functions

async function getUser(id) {
  const user = await db.User.findByPk(id);
  if (!user) throw "User not found";
  return user;
}

async function returnUser(name, token) {
  var user = await getUserByName(name);
  user = omitHash(user.dataValues);
  const { username, rank, points } = user;
  return { username, rank, points, token };
}

async function getUserByName(name) {
  const user = await db.User.findOne({ where: { username: name } });
  if (!user) throw "User not found";
  return user;
}

function omitHash(user) {
  const { hash, email, id, createdAt, updatedAt, ...userWithoutHash } = user;
  return userWithoutHash;
}
