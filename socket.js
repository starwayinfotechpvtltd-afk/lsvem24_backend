//import model
const User = require("./models/user.model");
const LiveUser = require("./models/liveUser.model");
const LiveHistory = require("./models/liveHistory.model");
const LiveView = require("./models/liveView.model");

//moment
const moment = require("moment-timezone");

//mongoose
const mongoose = require("mongoose");

const safeParse = (data) => {
  if (!data) return null;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Socket JSON parse error:", e);
    return null;
  }
};

io.on("connect", async (socket) => {
  console.log("Socket Connection done: ", socket.id);

  const { liveRoom } = socket.handshake.query || {};
  console.log("liveRoom: ", liveRoom);
  console.log("socket.handshake.query: ", socket.handshake.query);

  const id =
    liveRoom && typeof liveRoom === "string" && liveRoom.includes(":")
      ? liveRoom.split(":")[1]
      : null;
  console.log("id: ", id);

  if (liveRoom) {
    try {
      const initiatedSockets = await io.in(liveRoom).fetchSockets();
      console.log("Initiated Sockets length: ", initiatedSockets.length);
      if (initiatedSockets.length === 0) {
        console.log("Socket Join ==============");
        socket.join(liveRoom);
      }
    } catch (err) {
      console.error("Error joining liveRoom:", err);
    }
  }

  //connect user in liveRoom
  socket.on("liveRoomConnect", async (data) => {
    try {
      console.log("liveRoomConnect connected: ");

      const parsedData = safeParse(data);
      if (!parsedData || !parsedData.liveHistoryId) return;

      console.log("liveRoomConnect connected (parsed): ", parsedData);

      if (liveRoom) {
        const sockets = await io.in(liveRoom).fetchSockets();
        sockets?.length
          ? sockets[0].join("liveUserRoom:" + parsedData.liveHistoryId)
          : console.log("sockets not able to emit");
      }

      io.in("liveUserRoom:" + parsedData.liveHistoryId).emit(
        "liveRoomConnect",
        data
      );
    } catch (error) {
      console.error("Error in liveRoomConnect:", error);
    }
  });

  socket.on("addView", async (data) => {
    try {
      console.log("data in addView: ", data);

      const dataOfaddView = safeParse(data);
      if (!dataOfaddView || !dataOfaddView.liveHistoryId) return;

      console.log("parsed data in addView: ", dataOfaddView);

      if (liveRoom) {
        const sockets = await io.in(liveRoom).fetchSockets();
        sockets?.length
          ? sockets[0].join("liveUserRoom:" + dataOfaddView.liveHistoryId)
          : console.log("sockets not able to emit");
      }

      const user = dataOfaddView.userId && mongoose.Types.ObjectId.isValid(dataOfaddView.userId)
        ? await User.findById(dataOfaddView.userId)
        : null;

      const liveUser = await LiveUser.findOne({
        liveHistoryId: dataOfaddView.liveHistoryId,
      });

      if (user && liveUser) {
        const existLiveView = await LiveView.findOne({
          userId: dataOfaddView.userId,
          liveHistoryId: dataOfaddView.liveHistoryId,
        });
        console.log("existLiveView in user and liveUser (addView): ", existLiveView);

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

      io.in("liveUserRoom:" + dataOfaddView.liveHistoryId).emit(
        "addView",
        liveView.length
      );
    } catch (error) {
      console.error("Error in addView:", error);
    }
  });

  socket.on("lessView", async (data) => {
    try {
      console.log("data in lessView: ", data);

      const dataOflessView = safeParse(data);
      if (!dataOflessView || !dataOflessView.liveHistoryId) return;

      console.log("parsed data in lessView: ", dataOflessView);

      if (liveRoom) {
        const sockets = await io.in(liveRoom).fetchSockets();
        sockets?.length
          ? sockets[0].leave("liveUserRoom:" + dataOflessView.liveHistoryId)
          : console.log("sockets not able to leave in lessView");
        console.log("sockets in lessView liveRoom: ", sockets?.length);
      }

      if (dataOflessView.userId) {
        const existLiveView = await LiveView.findOne({
          userId: dataOflessView.userId,
          liveHistoryId: dataOflessView.liveHistoryId,
        });

        if (existLiveView) {
          console.log("existLiveView deleted in lessView for that liveHistoryId");
          await existLiveView.deleteOne();
        }
      }

      const liveView = await LiveView.find({
        liveHistoryId: dataOflessView.liveHistoryId,
      });
      console.log("liveView in lessView: ", liveView.length);

      const liveUser = await LiveUser.findOne({
        liveHistoryId: dataOflessView.liveHistoryId,
      });
      if (liveUser) {
        liveUser.view = liveView.length;
        await liveUser.save();
      }

      io.in("liveUserRoom:" + dataOflessView?.liveHistoryId).emit(
        "lessView",
        liveView.length
      );
    } catch (error) {
      console.error("Error in lessView:", error);
    }
  });

  socket.on("liveChat", async (data) => {
    try {
      console.log("data in liveChat: ", data);

      const dataOfComment = safeParse(data);
      if (!dataOfComment || !dataOfComment.liveHistoryId) return;

      console.log("parsed data in liveChat: ", dataOfComment);

      if (liveRoom) {
        const sockets = await io.in(liveRoom).fetchSockets();
        sockets?.length
          ? sockets[0].join("liveUserRoom:" + dataOfComment.liveHistoryId)
          : console.log("sockets not able to emit in liveChat");
      }

      io.in("liveUserRoom:" + dataOfComment?.liveHistoryId).emit(
        "liveChat",
        data
      );

      const liveHistory = await LiveHistory.findById(
        dataOfComment.liveHistoryId
      );
      if (liveHistory) {
        liveHistory.totalLiveChat += 1;
        await liveHistory.save();
      }
    } catch (error) {
      console.error("Error in liveChat:", error);
    }
  });

  socket.on("endLiveUser", async (data) => {
    try {
      console.log("data in endLiveUser: ", data);

      const parsedData = safeParse(data);
      if (!parsedData || !parsedData.liveHistoryId) return;

      console.log("parsedData in endLiveUser: ", parsedData);

      const [user, liveHistory] = await Promise.all([
        User.findOne({ liveHistoryId: parsedData?.liveHistoryId }),
        LiveHistory.findById(parsedData?.liveHistoryId),
      ]);

      if (user && liveHistory) {
        if (user.isLive) {
          const endTime = moment().tz("Asia/Kolkata").format();
          liveHistory.endTime = endTime;

          const start = moment.tz(liveHistory.startTime, "Asia/Kolkata");
          const end = moment.tz(endTime, "Asia/Kolkata");
          const duration = moment.utc(end.diff(start)).format("HH:mm:ss");

          liveHistory.duration = duration;

          await Promise.all([
            liveHistory.save(),
            User.findOneAndUpdate(
              { _id: user._id },
              { $set: { isLive: false, liveHistoryId: null } },
              { new: true }
            ),
            LiveUser.deleteOne({ userId: user._id }),
            LiveView.deleteMany({ liveHistoryId: liveHistory._id }),
          ]);

          console.log("liveUser and related liveView deleted in endLiveUser");
        }

        io.in("liveUserRoom:" + parsedData?.liveHistoryId).emit(
          "endLiveUser",
          parsedData
        );

        const sockets = await io
          .in("liveUserRoom:" + parsedData?.liveHistoryId)
          .fetchSockets();
        console.log("sockets.length: ", sockets.length);

        sockets?.length
          ? io.socketsLeave("liveUserRoom:" + parsedData?.liveHistoryId)
          : console.log("sockets not able to leave in endLiveUser");
      }
    } catch (error) {
      console.error("Error in endLiveUser:", error);
    }
  });

  socket.on("disconnect", async (reason) => {
    try {
      console.log(`socket disconnect ===============`, id, socket?.id, reason);

      if (id && mongoose.Types.ObjectId.isValid(id)) {
        const userId = new mongoose.Types.ObjectId(id);

        if (liveRoom) {
          const sockets = await io.in(liveRoom).fetchSockets();

          if (sockets?.length === 0) {
            const user = await User.findById(userId);
            if (user && user.isLive && user.liveHistoryId) {
              const liveHistory = await LiveHistory.findById(user.liveHistoryId);
              console.log("liveHistory in disconnect liveRoom: ", liveHistory);

              if (liveHistory) {
                const endTime = moment().tz("Asia/Kolkata").format();
                const start = moment.tz(liveHistory?.startTime, "Asia/Kolkata");
                const end = moment.tz(endTime, "Asia/Kolkata");
                const duration = moment.utc(end.diff(start)).format("HH:mm:ss");

                liveHistory.endTime = endTime;
                liveHistory.duration = duration;

                await Promise.all([
                  liveHistory?.save(),
                  User.findOneAndUpdate(
                    { _id: user._id },
                    { $set: { isLive: false, liveHistoryId: null } },
                    { new: true }
                  ),
                  LiveUser.deleteOne({ userId: user._id }),
                  LiveView.deleteMany({ liveHistoryId: liveHistory._id }),
                ]);

                console.log("liveUser and related liveView deleted in disconnect");

                const roomSockets = await io
                  .in("liveUserRoom:" + user?.liveHistoryId?.toString())
                  .fetchSockets();
                roomSockets?.length
                  ? io.socketsLeave("liveUserRoom:" + user?.liveHistoryId?.toString())
                  : console.log("sockets not able to leave in disconnect");
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in socket disconnect handler:", error);
    }
  });
});
