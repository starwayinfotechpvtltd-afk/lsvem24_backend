//import model
const User = require("./models/user.model");
const LiveUser = require("./models/liveUser.model");
const LiveHistory = require("./models/liveHistory.model");
const LiveView = require("./models/liveView.model");

//momemt
const moment = require("moment-timezone");

//mongoose
const mongoose = require("mongoose");

io.on("connect", async (socket) => {
  console.log("Socket Connection done: ", socket.id);

  const { liveRoom } = socket.handshake.query;
  console.log("liveRoom", liveRoom);
  console.log("socket.handshake.query", socket.handshake.query);

  const initiatedSockets = await io.in(liveRoom).fetchSockets();
  console.log("Initiated Sockets length:       ", initiatedSockets.length);

  const id = liveRoom && liveRoom.split(":")[1];
  console.log("id: ", id);

  if (initiatedSockets.length === 0) {
    console.log("Socket Join ==============");
    socket.join(liveRoom);
  }

  //connect user in liveRoom
  socket.on("liveRoomConnect", async (data) => {
    console.log("liveRoomConnect  connected:   ");

    const parsedData = JSON.parse(data);
    console.log("liveRoomConnect connected (parsed):   ", parsedData);

    const sockets = await io.in(liveRoom).fetchSockets();
    //console.log("sockets: ", sockets);

    sockets?.length
      ? sockets[0].join("liveUserRoom:" + parsedData.liveHistoryId)
      : console.log("sockets not able to emit");

    io.in("liveUserRoom:" + parsedData.liveHistoryId).emit(
      "liveRoomConnect",
      data,
    );
  }); //to join the first socket (sockets[0]) to a new room named "liveUserRoom:" + liveHistoryId

  socket.on("addView", async (data) => {
    console.log("data in addView:  ", data);

    const dataOfaddView = JSON.parse(data);
    console.log("parsed data in addView:  ", dataOfaddView);

    const sockets = await io.in(liveRoom).fetchSockets();
    //console.log("sockets in addView viewUserRoom:  ", sockets);

    sockets?.length
      ? sockets[0].join("liveUserRoom:" + dataOfaddView.liveHistoryId)
      : console.log("sockets not able to emit");

    const user = await User.findById(dataOfaddView.userId);
    const liveUser = await LiveUser.findOne({
      liveHistoryId: dataOfaddView.liveHistoryId,
    });

    if (user && liveUser) {
      const existLiveView = await LiveView.findOne({
        userId: dataOfaddView.userId,
        liveHistoryId: dataOfaddView.liveHistoryId,
      });
      console.log(
        "existLiveView in user and liveUser (addView):  ",
        existLiveView,
      );

      if (!existLiveView) {
        console.log("new liveView in user and liveUser (addView): ");

        const liveView = new LiveView();

        liveView.userId = dataOfaddView.userId;
        liveView.liveHistoryId = dataOfaddView.liveHistoryId;
        liveView.fullName = user.fullName;
        liveView.nickName = user.nickName;
        liveView.image = user.image;

        await liveView.save();
      }
    }

    const liveView = await LiveView.find({
      liveHistoryId: dataOfaddView.liveHistoryId,
    });
    console.log("liveView in addView: ", liveView.length);

    if (liveUser) {
      liveUser.view = liveView.length;
      await liveUser.save();
    }

    if (liveView.length === 0) {
      return io
        .in("liveUserRoom:" + dataOfaddView.liveHistoryId)
        .emit("addView", liveView.length);
    }

    io.in("liveUserRoom:" + dataOfaddView.liveHistoryId).emit(
      "addView",
      liveView.length,
    );
  });

  socket.on("lessView", async (data) => {
    console.log("data in lessView:  ", data);

    const dataOflessView = JSON.parse(data);
    console.log("parsed data in lessView:  ", dataOflessView);

    const sockets = await io.in(liveRoom).fetchSockets();
    sockets?.length
      ? sockets[0].leave("liveUserRoom:" + dataOflessView.liveHistoryId)
      : console.log("sockets not able to leave in lessView");

    console.log("sockets in lessView liveRoom:  ", sockets?.length);

    const existLiveView = await LiveView.findOne({
      userId: dataOflessView.userId,
      liveHistoryId: dataOflessView.liveHistoryId,
    });

    if (existLiveView) {
      console.log("existLiveView deleted in lessView for that liveHistoryId");
      await existLiveView.deleteOne();
    }

    const liveView = await LiveView.find({
      liveHistoryId: dataOflessView.liveHistoryId,
    });
    console.log("liveView in lessView:  ", liveView.length);

    const liveUser = await LiveUser.findOne({
      liveHistoryId: dataOflessView.liveHistoryId,
    });
    if (liveUser) {
      liveUser.view = liveView.length;
      await liveUser.save();
    }

    if (liveView.length === 0) {
      return io
        .in("liveUserRoom:" + dataOflessView.liveHistoryId)
        .emit("lessView", liveView.length);
    }

    io.in("liveUserRoom:" + dataOflessView?.liveHistoryId).emit(
      "lessView",
      liveView.length,
    );
  });

  socket.on("liveChat", async (data) => {
    console.log("data in liveChat: ", data);

    const dataOfComment = JSON.parse(data);
    console.log("parsed data in liveChat: ", dataOfComment);

    const sockets = await io.in(liveRoom).fetchSockets();
    sockets?.length
      ? sockets[0].join("liveUserRoom:" + dataOfComment.liveHistoryId)
      : console.log("sockets not able to emit in liveChat");

    io.in("liveUserRoom:" + dataOfComment?.liveHistoryId).emit(
      "liveChat",
      data,
    );

    const liveHistory = await LiveHistory.findById(dataOfComment.liveHistoryId);
    if (liveHistory) {
      liveHistory.totalLiveChat += 1;
      await liveHistory.save();
    }
  });

  socket.on("endLiveUser", async (data) => {
    console.log("data in endLiveUser: ", data);

    const parsedData = JSON.parse(data);
    console.log("parsedData in endLiveUser: ", parsedData);

    try {
      const [user, liveHistory] = await Promise.all([
        User.findOne({ liveHistoryId: parsedData?.liveHistoryId }),
        LiveHistory.findById(parsedData?.liveHistoryId),
      ]);

      if (user) {
        if (user.isLive) {
          liveHistory.endTime = moment().tz("Asia/Kolkata").format();

          const start = moment.tz(liveHistory.startTime, "Asia/Kolkata");
          const end = moment.tz(endTime, "Asia/Kolkata");
          const duration = moment.utc(end.diff(start)).format("HH:mm:ss");

          liveHistory.duration = duration;

          await Promise.all([
            liveHistory.save(),
            User.findOneAndUpdate(
              { _id: user._id },
              { $set: { isLive: false, liveHistoryId: null } },
              { new: true },
            ),
            LiveUser.deleteOne({ userId: user._id }),
            LiveView.deleteMany({ liveHistoryId: liveHistory._id }),
          ]);

          console.log("liveUser and related liveView deleted in endLiveUser");
        }

        io.in("liveUserRoom:" + parsedData?.liveHistoryId).emit(
          "endLiveUser",
          parsedData,
        );

        const sockets = await io
          .in("liveUserRoom:" + parsedData?.liveHistoryId)
          .fetchSockets();
        console.log("sockets.length: ", sockets.length);

        sockets?.length
          ? io.socketsLeave(parsedData?.liveHistoryId)
          : console.log("sockets not able to leave in endLiveUser");
      }
    } catch (error) {
      console.error("Error in endLiveUser:", error);
    }
  });

  socket.on("disconnect", async (reason) => {
    console.log("socket disconnect ===============", id, socket.id, reason);

    try {
      // Validate user id
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        console.log("Invalid or missing user id:", id);
        return;
      }

      // Validate live room
      if (!liveRoom) {
        console.log("No liveRoom found.");
        return;
      }

      const userId = new mongoose.Types.ObjectId(id);

      // Check whether anyone is still connected to this room
      const sockets = await io.in(liveRoom).fetchSockets();
      console.log("Remaining sockets in room:", sockets.length);

      // If there are still sockets connected, don't end the live
      if (sockets.length > 0) {
        console.log("Users are still connected. Skipping cleanup.");
        return;
      }

      // Find user
      const user = await User.findById(userId);

      if (!user) {
        console.log("User not found.");
        return;
      }

      if (!user.isLive) {
        console.log("User is not live.");
        return;
      }

      // Find live history
      const liveHistory = await LiveHistory.findById(user.liveHistoryId);

      if (!liveHistory) {
        console.log("LiveHistory not found.");
        return;
      }

      console.log("Ending live because broadcaster disconnected.");

      // Calculate duration
      const endTime = moment().tz("Asia/Kolkata").format();

      const start = moment.tz(liveHistory.startTime, "Asia/Kolkata");
      const end = moment.tz(endTime, "Asia/Kolkata");

      const duration = moment.utc(end.diff(start)).format("HH:mm:ss");

      // Update history
      liveHistory.endTime = endTime;
      liveHistory.duration = duration;

      await Promise.all([
        liveHistory.save(),

        User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              isLive: false,
              liveHistoryId: null,
            },
          },
          { new: true },
        ),

        LiveUser.deleteOne({
          userId: user._id,
        }),

        LiveView.deleteMany({
          liveHistoryId: liveHistory._id,
        }),
      ]);

      console.log("Live ended successfully.");

      // Notify all viewers
      io.in("liveUserRoom:" + liveHistory._id.toString()).emit(
        "endLiveUser",
        JSON.stringify({
          liveHistoryId: liveHistory._id,
          userId: user._id,
        }),
      );

      // Remove everyone from live room
      io.socketsLeave("liveUserRoom:" + liveHistory._id.toString());

      console.log("All sockets removed from liveUserRoom.");
    } catch (error) {
      console.error("Disconnect Error:", error);
    }
  });
});
