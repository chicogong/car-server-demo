const express = require('express');
const router = express.Router();

const {
  applyConcurrent,
  destroySession,
  createSession,
  startPublishStreamWithURL,
  stopPublishStream } = require('../cloud_rendering_lib/car');
const {
  AppErrorMsg,
  QueueState,
  getClientIp,
  validString,
  validSchema,
  simpleRespone,
  onMissParams } = require('../cloud_rendering_lib/com');
const { verifySign } = require('../cloud_rendering_lib/sign');
const { createRedisConnection } = require('../cloud_rendering_lib/redis');
const { Config, DefaultKeys } = require('../cloud_rendering_lib/config');
const RequestConstraint = require('../cloud_rendering_lib/constraint');
const BaseQueue = require('../cloud_rendering_lib/base_queue');
const MemQueue = require('../cloud_rendering_lib/mem_queue');
const RedisQueue = require('../cloud_rendering_lib/redis_queue');
const LOG = require('../cloud_rendering_lib/log');
const { GenUserSig } = require('../cloud_rendering_lib/trtc_user_sig');
const { GetUrl, InitGame } = require('../cloud_rendering_lib/sud');

let apiParamsSchema = {};
const waitQueue = {};
const enqueueTimeout = 30000;   // ms
const queueCheckInterval = 1000; // ms
const noIdleMsg = 'ResourceNotFound.NoIdle';

queue = new BaseQueue(queueCheckInterval);
if (Config.configs[DefaultKeys.REDIS_QUEUE] == 'Y') {
  createRedisConnection();
  queue = new RedisQueue("WaitQueue", queueCheckInterval);
} else {
  queue = new MemQueue(queueCheckInterval);
}

if (Config.configs[DefaultKeys.API_SIGN] == 'Y') {
  apiParamsSchema = {
    '/StartProject': {
      UserId: validSchema(validString, true),
      ProjectId: validSchema(validString, true),
      ApplicationId: validSchema(validString, false),
      ApplicationVersionId: validSchema(validString, false),
      ClientSession: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/StartPublishStream': {
      UserId: validSchema(validString, true),
      RoomId: validSchema(validString, true),
      SdkAppId: validSchema(validString, true),
    },
    '/StopPublishStream': {
      UserId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/StopProject': {
      UserId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    '/Enqueue': {
      UserId: validSchema(validString, true),
      ProjectId: validSchema(validString, true),
      ApplicationId: validSchema(validString, false),
      ApplicationVersionId: validSchema(validString, false),
      Sign: validSchema(validString, true),
    },
    '/Dequeue': {
      UserId: validSchema(validString, true),
      Sign: validSchema(validString, true),
    },
    onFailed: onMissParams
  };
} else {
  apiParamsSchema = {
    '/StartProject': {
      UserId: validSchema(validString, true),
      ProjectId: validSchema(validString, true),
      ApplicationId: validSchema(validString, false),
      ApplicationVersionId: validSchema(validString, false),
      ClientSession: validSchema(validString, true),
    },
    '/StartPublishStreamWithURL': {
      UserId: validSchema(validString, true),
      RoomId: validSchema(validString, true),
      SdkAppId: validSchema(validString, false),
    },
    '/StopPublishStream': {
      UserId: validSchema(validString, true),
    },
    '/StopProject': {
      UserId: validSchema(validString, true),
    },
    '/Enqueue': {
      UserId: validSchema(validString, true),
      ProjectId: validSchema(validString, true),
      ApplicationId: validSchema(validString, false),
      ApplicationVersionId: validSchema(validString, false),
    },
    '/Dequeue': {
      UserId: validSchema(validString, true),
    },
    onFailed: onMissParams
  };
}

const verifyReqParams = RequestConstraint.prototype.verify.bind(new RequestConstraint(apiParamsSchema));

router.post('/StartProject', verifyReqParams, verifySign, async (req, res, next) => {
  const params = req.body;
  LOG.info(req.path, 'req content:', params);

  try {
    const userIp = getClientIp(req);

    // 获取游戏的URL 详细接口说明参照 (https://docs.sud.tech/zh-CN/app/Server/API/ObtainServerEndAPIConfigurations.html)
    const urlsRsp = await GetUrl();

    // 初始化游戏 详细接口说明参照  (https://docs.sud.tech/zh-CN/app/Server/API/BulletAPI/BulletInit.html)
    const urls = JSON.parse(urlsRsp)
    const initGameReq = {
      mg_id: 'xxxx',
      anchor_info: {
        uid: params.UserId,
        nick_name: `${params.UserId}_game`,
        avatar_url: "https://imgcache.qq.com/qcloud/public/static/avatar3_100.20191230.png"
      }
    }
    const initGameRsp = await InitGame(urls.bullet_api.init, initGameReq)

    LOG.info(req.path,'initGame rsp:', initGameRsp)
    const initGameRspJson = JSON.parse(initGameRsp)
    const roomCode = initGameRspJson && initGameRspJson.data && initGameRspJson.data.room_code || 'xxxx';
    // 申请并发，详细接口说明参照（https://cloud.tencent.com/document/product/1547/72827）
    let ret = await applyConcurrent({
      UserId: params.UserId,
      UserIp: userIp,
      ProjectId: params.ProjectId,
      ApplicationId: params.ApplicationId,
      ApplicationVersionId: params.ApplicationVersionId,
    });
    if (ret.Code != 0) {
      simpleRespone(req, res, ret);
      return;
    }

    // 创建会话，详细接口说明参照（https://cloud.tencent.com/document/product/1547/72826）
    ret = await createSession({
      UserId: params.UserId,
      UserIp: userIp,
      ClientSession: params.ClientSession,
      ApplicationParameters: `-roomCode ${roomCode}`
    });

    if (ret.Code != 0) {
      simpleRespone(req, res, ret);
      return;
    }
    ret.RoomCode = roomCode;
    ret.UserSig = GenUserSig(params.UserId);

    ret.MGId = initGameReq.mg_id;
    ret.AnchorInfo = {
      Uid: initGameReq.anchor_info.uid,
      NickName: initGameReq.anchor_info.nick_name,
      AvatarUrl: initGameReq.anchor_info.avatar_url
    }
    simpleRespone(req, res, ret);
  } catch (e) {
    LOG.error(req.path, 'raise except:', e);
    simpleRespone(req, res, e);
  }
});

router.post('/StartPublishStream', verifyReqParams, verifySign, async (req, res, next) => {
  const params = req.body;
  const userId = params.UserId;
  const roomId = params.RoomId;
  const sdkAppId = Config.configs[DefaultKeys.TRTC_SDKAPPID];
  const userSig = params.UserSig;
  const url = `rtmp://rtmp.rtc.qq.com/push/${roomId}?sdkappid=${sdkAppId}&userid=${userId}&usersig=${userSig}&use_number_room_id=1`;
  LOG.info(req.path, 'req content:', params, url);
  try {
    // 开始云端推流到指定URL，详细接口说明参照（https://cloud.tencent.com/document/product/1547/98726）
    let ret = await startPublishStreamWithURL({
      UserId: userId,
      PublishStreamURL: url
    });
    if (ret.Code != 0) {
      simpleRespone(req, res, ret);
      return;
    }

    simpleRespone(req, res, ret);
  } catch (e) {
    LOG.error(req.path, 'raise except:', e);
    simpleRespone(req, res, e);
  }
});

router.post('/StopPublishStream', verifyReqParams, verifySign, async (req, res, next) => {
  const params = req.body;
  const userId = params.UserId;
  LOG.info(req.path, 'req content:', params);
  try {
    // 停止云端推流，详细接口说明参照（https://cloud.tencent.com/document/product/1547/89668）
    let ret = await stopPublishStream({
      UserId: userId,
    });
    if (ret.Code != 0) {
      simpleRespone(req, res, ret);
      return;
    }

    simpleRespone(req, res, ret);
  } catch (e) {
    LOG.error(req.path, 'raise except:', e);
    simpleRespone(req, res, e);
  }
});

router.post('/StopProject', verifyReqParams, verifySign, async (req, res, next) => {
  const params = req.body;
  const userId = params.UserId;
  LOG.info(req.path, 'req content:', params);
  try {
    // 销毁会话，详细接口说明参照（https://cloud.tencent.com/document/product/1547/72812）
    let ret = await destroySession({
      UserId: userId
    });

    simpleRespone(req, res, ret);
  } catch (e) {
    LOG.error(req.path, 'raise except:', e);
    simpleRespone(req, res, ret);
  }
});

const doCheckQueue = async key => {
  do {
    try {
      const item = waitQueue[key];
      if ((Date.now() - item.TimeStamp) > enqueueTimeout) {
        LOG.debug(`${item.UserId} enqueue timeout`);
        break;
      }

      const params = {
        UserId: item.UserId,
        ProjectId: item.ProjectId,
        ApplicationId: item.ApplicationId,
        ApplicationVersionId: item.ApplicationVersionId,
        UserIp: item.UserIp
      };
      waitQueue[key].State = QueueState.Locking;
      const ret = await applyConcurrent(params);
      LOG.debug(`${item.UserId} ready to play, applyConcurrent ret:`, ret);
    } catch (e) {
      if (e.Error && e.Error.code === noIdleMsg) {
        if (waitQueue[key]) {
          waitQueue[key].State = QueueState.Wait;
          LOG.debug(`${waitQueue[key].UserId} reset to wait`);
        }
        return false;
      }
      LOG.debug(`${waitQueue[key].UserId} reject error: ${e.Error.code}, remove from queue`);
    }
  } while (0);
  delete waitQueue[key];
  return true;
};

router.post('/Enqueue', verifyReqParams, verifySign, async (req, res, next) => {
  const Params = req.body;
  const UserId = Params.UserId;
  const ProjectId = Params.ProjectId;
  const ApplicationId = Params.ApplicationId;
  const ApplicationVersionId = Params.ApplicationVersionId;
  const UserIp = getClientIp(req);

  const response = (item, index) => {
    let ret = AppErrorMsg.Queuing;
    if (item.State === QueueState.Done) {
      ret = AppErrorMsg.QueueDone;
      LOG.debug(`${item.UserId} queue done`);
    }
    res.json({
      RequestId: Params.RequestId,
      Data: {
        Index: index,
        UserId: item.UserId,
        ProjectId: item.ProjectId
      }, ...ret
    });
    return LOG.debug(ret.Msg);
  };

  if (waitQueue[UserId]) {
    waitQueue[UserId].TimeStamp = Date.now();
    waitQueue[UserId].ProjectId = ProjectId;
    waitQueue[UserId].ApplicationId = ApplicationId;
    waitQueue[UserId].ApplicationVersionId = ApplicationVersionId;
    LOG.debug(`${UserId} update timestamp`);
    return response(waitQueue[UserId], await queue.indexOf(UserId));
  }

  const newUser = {
    UserId,
    ProjectId,
    ApplicationId,
    ApplicationVersionId,
    UserIp,
    TimeStamp: Date.now(),
    State: QueueState.Wait,
  };
  try {
    await applyConcurrent({ UserId: UserId, ProjectId: ProjectId, ApplicationId: ApplicationId, ApplicationVersionId: ApplicationVersionId, UserIp: UserIp });
    newUser.State = QueueState.Done;
    newUser.TimeStamp = Date.now();
    LOG.debug(`${UserId} ready to play`);
    return response(newUser, 0);
  } catch (e) {
    LOG.error(req.path, 'imediately trylock raise except:', e);
  }

  newUser.TimeStamp = Date.now();
  queue.enqueue(UserId, doCheckQueue);
  waitQueue[UserId] = newUser;
  LOG.debug(`new user ${UserId} queuing`);

  return response(newUser, await queue.indexOf(UserId));
});

router.post('/Dequeue', verifyReqParams, verifySign, async (req, res, next) => {
  const Params = req.body;
  const UserId = Params.UserId;

  queue.dequeue(UserId);
  delete waitQueue[UserId];
  LOG.debug(`${UserId} dequeue`);
  res.json({ RequestId: Params.RequestId, ...AppErrorMsg.Ok });
});

Config.registerModule(__filename, {
  router
});
