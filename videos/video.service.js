const db = require("_helpers/db");
const fetch = require("cross-fetch");

module.exports = {
  grabVideos,
  pushVideos,
  findChannel,
};

//every request pulls 5 rows of video data
async function pushVideos(page) {
  var pageOffset = (page * 5 - 5) * 1;

  var servedVideoData = await db.Video.findAll({
    offset: pageOffset,
    limit: 5,
    subQuery: false,
  });
  var storedVideoNum = await db.Video.count();

  return { total: storedVideoNum, currPage: servedVideoData };
}

async function grabVideos(apiKey, channelId, maxResults) {
  //var channelName = "Vinesauce: The Full Sauce"; //admin page input
  //var maxResults = 50; //admin page input

  var settings = await db.Settings.findOne({ where: { id: 1 } });

  const requestOptions = {
    method: "GET",
    headers: { Accept: "application/json" },
  };

  //to conserve Google quota, only search for Playlist ID if...
  //It hasn't been defined
  //The active channel is being changed
  if (settings.playlistId == "undefined" || settings.channelId != channelId) {
    //Request For Channels Playist ID
    var url =
      "https://www.googleapis.com/youtube/v3/channels?part=contentDetails" +
      "&id=" +
      channelId +
      "&key=" +
      apiKey;
    const res1 = await fetch(url, requestOptions);

    if (res1.status >= 400) {
      throw new Error("Bad response from server on response 1");
    }
    var first = await res1.json();
    //Pull playlist id from channel data request
    var playlistId = first.items[0].contentDetails.relatedPlaylists.uploads;
  } else {
    playlistId = settings.playlistId;
  }

  //Request the Videos in the Channel's Uploads Playlist
  url =
    "https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=" +
    maxResults +
    "&playlistId=" +
    playlistId +
    "&key=" +
    apiKey;
  var res2 = await fetch(url, requestOptions);

  if (res2.status >= 400) {
    throw new Error("Bad response from server on response 2");
  }
  var final = await res2.json();
  var videos = final.items;
  var initialMax = maxResults;

  //send all videos if the total requested is less than the requested max
  if(final.items.length < maxResults && !final.nextPageToken){
    videos = [...final.items];
  }
  else{
    //keep adding next page of videos until the number of videos is surpassed
    while (maxResults > 0 || final.items.length < 0) {
      maxResults = maxResults - videos.length;
      url =
        "https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=" +
        initialMax +
        "&playlistId=" +
        playlistId +
        "&key=" +
        apiKey +
        "&pageToken=" +
        final.nextPageToken;
      res2 = await fetch(url, requestOptions);
      final = await res2.json();
      videos = [...videos, ...final.items];
    }
    //pop extra videos off the end of the array
    //until we reach the desired number
    while(videos.length > initialMax){
      videos.pop();
    }
  }

  //Clear video database
  await db.Video.destroy({ truncate: true });
  //Repopulate Video Database
  var params = {};
  for (var i = 0; i < videos.length; i++) {
    params.resourceId = videos[i].snippet.resourceId.videoId;
    params.date = videos[i].snippet.publishedAt
      .replace("T", " ")
      .replace("Z", " ");
    params.title = videos[i].snippet.title;
    params.thumbnail = videos[i].snippet.thumbnails.high.url;
    params.description = videos[i].snippet.description;
    await db.Video.create(params);
  }
  console.log("Video Aggregation Completed");
  return playlistId;
}

/* Data:  
    {
      "kind": "youtube#playlistItem",
      "etag": "tqzQKlyR-jwaM9KP0i9qdO7pxIU",
      "id": "VVUyb1d1VVNkM3QzdDVPM1Z4cDRsZ0FBLmFKMW1HaXl0b3FB",
      "snippet": {
        "publishedAt": "2022-01-16T15:00:00Z",
        "channelId": "UC2oWuUSd3t3t5O3Vxp4lgAA",
        "title": "Jerma Streams - Everhood",
        "description": "Jerma archived Everhood (The original title of this stream was \"You are Required to Feel the Music (Please use one of the posted exit signs if this request can not be fulfilled)\", and was originally streamed/recorded on January 15, 2022)\n\n0:00 Start of Stream\n4:50 Everhood\n1:18:36 1st Brb Ends\n4:22:07 2nd Brb Ends\n6:36:47 End of Stream \n\nWant to see a replay of chat? Download our chat replay browser extension!\nhttps://chatreplay.stream/\n(For mobile and unsupported browsers, paste the link of the Jerma stream into the website)\n\n(Note: This channel is not run by Jerma, just a couple of fans wanting to archive the streams for a later date, and just for the community of fans.) \n\nArchive Channel's Discord: https://discord.gg/xUeJCZa\nArchive Channel's Ko-fi: https://ko-fi.com/sterjermastreamarchive\n\nTwitch: https://www.twitch.tv/jerma985\nTwitter:https://twitter.com/Jerma985\nYoutube: https://www.youtube.com/user/Jerma985\nYouTube 2nd/Highlight channel: https://www.youtube.com/channel/UCL7DDQWP6x7wy0O6L5ZIgxg",
        "thumbnails": {
          "default": {
            "url": "https://i.ytimg.com/vi/aJ1mGiytoqA/default.jpg",
            "width": 120,
            "height": 90
          },
          "medium": {
            "url": "https://i.ytimg.com/vi/aJ1mGiytoqA/mqdefault.jpg",
            "width": 320,
            "height": 180
          },
          "high": {
            "url": "https://i.ytimg.com/vi/aJ1mGiytoqA/hqdefault.jpg",
            "width": 480,
            "height": 360
          },
          "standard": {
            "url": "https://i.ytimg.com/vi/aJ1mGiytoqA/sddefault.jpg",
            "width": 640,
            "height": 480
          },
          "maxres": {
            "url": "https://i.ytimg.com/vi/aJ1mGiytoqA/maxresdefault.jpg",
            "width": 1280,
            "height": 720
          }
        },
        "channelTitle": "Jerma Stream Archive",
        "playlistId": "UU2oWuUSd3t3t5O3Vxp4lgAA",
        "position": 0,
        "resourceId": {
          "kind": "youtube#video",
          "videoId": "aJ1mGiytoqA"
        },
        "videoOwnerChannelTitle": "Jerma Stream Archive",
        "videoOwnerChannelId": "UC2oWuUSd3t3t5O3Vxp4lgAA"
      }
    }*/

async function findChannel(channelName, apiKey) {
  const requestOptions = {
    method: "GET",
    headers: { Accept: "application/json" },
  };
  //Request for Channels that Match Name
  var url =
    "https://youtube.googleapis.com/youtube/v3/search?part=id%2Csnippet&q=" +
    channelName +
    "&type=channel" +
    "&key=" +
    apiKey;
  const res = await fetch(url, requestOptions);
  if (res.status >= 400) {
    throw new Error("Bad response from server");
  }
  var final = await res.json();
  var channelID;

  if(final.items.length == 1){
    channelID = final.items[0].id.channelId;
  }
  else {
    //Find Correct Channel from the response and Extract the ID
    for (var i = 0; i < final.items.length - 1; i++) {
      if (
        final.items[i].snippet.channelTitle
          .toLowerCase()
          .includes(channelName.toLowerCase())
      ) {
        channelID = final.items[i].id.channelId;
        break;
      } else if (i >= final.items.length - 1 && !channelID) {
        throw new Error("No Such Channel Found");
      }
    } 
  }
  return channelID;
}
