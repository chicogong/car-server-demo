const crypto = require('crypto');
const proc = require('process');
const prompt = require('prompt');

const { Config, DefaultKeys } = require('./config');
const LOG = require('./log');

const kSecretIdEnv = 'SECRET_ID';
const kSecretKeyEnv = 'SECRET_KEY';
const kApiSignEnv = 'API_SIGN';
const kTRTCSdkAppIdEnv = 'TRTC_SDKAPPID';
const kTRTCSecretKeyEnv = 'TRTC_SECRET_KEY';
const kSudAppIdEnv = 'SUD_APPID';
const kSudAppKeyEnv = 'SUD_APP_KEY';
const kSudAppSecretEnv = 'SUD_APP_SECRET';

const objectToString = Object.prototype.toString;
const toTypeString = v => objectToString.call(v);
const toRawTypeString = v => toTypeString(v).slice(8, -1);
const isMap = v => toTypeString(v) === '[object Map]';
const isSet = v => toTypeString(v) === '[object Set]';
const isObject = v => typeof (v) === 'object';
const isPlainObject = v => toTypeString(v) === '[object Object]';
const isSymbol = v => typeof (v) === 'symbol';
const isString = v => typeof (v) === 'string';
const isArray = v => Array.isArray(v);
const isFunction = v => typeof (v) === 'function' && toRawTypeString(v) === 'Function';
const isPromise = v => isObject(v) && isFunction(v.then) && isFunction(v.catch);
const isAsyncFunction = v => toRawTypeString(v) === 'AsyncFunction';
const isBoolean = v => typeof (v) === 'boolean';
const validString = v => isString(v) && v.length > 0;
const validArray = isArray;
const validNumber = v => !isNaN(v);

Config.registerModule(__filename, {
  loadEnv: currentConf => {
    const conf = {};
    if (validString(proc.env[kSecretIdEnv])) {
      conf[DefaultKeys.SECRET_ID] = proc.env[kSecretIdEnv];
    }
    if (validString(proc.env[kSecretKeyEnv])) {
      conf[DefaultKeys.SECRET_KEY] = proc.env[kSecretKeyEnv];
    }
    if (validString(proc.env[kTRTCSdkAppIdEnv])) {
      conf[DefaultKeys.TRTC_SDKAPPID] = proc.env[kTRTCSdkAppIdEnv];
    }
    if (validString(proc.env[kTRTCSecretKeyEnv])) {
      conf[DefaultKeys.TRTC_SECRET_KEY] = proc.env[kTRTCSecretKeyEnv];
    }
    if (validString(proc.env[kSudAppIdEnv])) {
      conf[DefaultKeys.SUD_APPID] = proc.env[kSudAppIdEnv];
    }
    if (validString(proc.env[kSudAppKeyEnv])) {
      conf[DefaultKeys.SUD_APP_KEY] = proc.env[kSudAppKeyEnv];
    }
    if (validString(proc.env[kSudAppSecretEnv])) {
      conf[DefaultKeys.SUD_APP_SECRET] = proc.env[kSudAppSecretEnv];
    }
    if (validString(proc.env[kApiSignEnv])) {
      conf[DefaultKeys.API_SIGN] = proc.env[kApiSignEnv];
    } else {
      conf[DefaultKeys.API_SIGN] = currentConf[DefaultKeys.API_SIGN] || 'N';
    }
    return conf;
  },
  install: async _ => {
    const schema = {
      properties: {
        secretId: {
          type: 'string',
          description: '请输入腾讯云 API SecretId',
          pattern: /^[a-zA-Z\d\s-]+$/,
          required: true,
          default: ''
        },
        secretKey: {
          type: 'string',
          description: '请输入腾讯云 API SecretKey',
          pattern: /^[a-zA-Z\d\s-]+$/,
          required: true,
          default: ''
        },
        TRTCSdkAppId: {
          type: 'string',
          description: '请输入腾讯云音视频 SdkAppId',
          pattern: /^[a-zA-Z\d\s-]+$/,
          required: true,
          default: ''
        },
        TRTCSecretKey: {
          type: 'string',
          description: '请输入腾讯云音视频 SecretKey',
          pattern: /^[a-zA-Z\d\s-]+$/,
          required: true,
          default: ''
        },
        sudAppId: {
          type: 'string',
          description: '请输入 Sud AppID',
          pattern: /^[a-zA-Z\d\s-]+$/,
          required: true,
          default: ''
        },
        sudAppKey: {
          type: 'string',
          description: '请输入 Sud App Key',
          pattern: /^[a-zA-Z\d\s-]+$/,
          required: true,
          default: ''
        },
        sudAppSecret: {
          type: 'string',
          description: '请输入 Sud App Secret',
          pattern: /^[a-zA-Z\d\s-]+$/,
          required: true,
          default: ''
        },
        sign: {
          type: 'string',
          description: '是否开启请求校验参数（Y/N），不填默认不开启',
          pattern: /^[YN]?$/,
          required: true,
          default: 'N'
        },
      }
    };
    const ret = await prompt.get(schema);
    Config.set(DefaultKeys.SECRET_ID, ret.secretId);
    Config.set(DefaultKeys.SECRET_KEY, ret.secretKey);
    Config.set(DefaultKeys.TRTC_SDKAPPID, ret.TRTCSdkAppId);
    Config.set(DefaultKeys.TRTC_SECRET_KEY, ret.TRTCSecretKey);
    Config.set(DefaultKeys.SUD_APPID, ret.sudAppId);
    Config.set(DefaultKeys.SUD_APP_KEY, ret.sudAppKey);
    Config.set(DefaultKeys.SUD_APP_SECRET, ret.sudAppSecret);
    Config.set(DefaultKeys.API_SIGN, ret.sign);
  }
});

const AppErrorMsg = {
  Ok: { Code: 0, Msg: 'Ok' },                                     // 请求正常
  InvalidSign: { Code: 10000, Msg: 'invalid signature' },         // sign 校验错误
  MissParam: { Code: 10001, Msg: 'miss or invalid parametors' },  // 缺少必要参数或者参数类型错误
  Queuing: { Code: 10100, Msg: 'queuing' },                       // 排队进行中，需要继续请求获取队列位置更新
  QueueDone: { Code: 10101, Msg: 'queue done' },                  // 排队完成
  CreateFailed: { Code: 10200, Msg: 'create session failed' },    // 创建云应用会话失败
  StopFailed: { Code: 10201, Msg: 'stop project failed' },        // 释放云应用会话失败
  LockFailed: { Code: 10202, Msg: 'apply concurrent failed' },    // 申请并发失败
  PublishFailed: { Code: 10203, Msg: 'start publish failed' },    // 发起推流失败
  StopStreamFailed: { Code: 10204, Msg: 'stop stream failed' },   // 停止推流失败
};

const QueueState = {
  Wait: 1,
  Locking: 2,
  Done: 3,
};

const getClientIp = (req) => {
  const ips = (req.headers['x-forwarded-for'])
    || (req.headers['x-real-ip'])
    || (req.connection.remoteAddress)
    || (req.socket.remoteAddress)
    || (req.connection.socket.remoteAddress);
  return ips ? ips.split(',')[0].trim() : '';
};

const simpleRespone = (req, res, errorMsg) => {
  const params = req.body;
  const response = { RequestId: params.RequestId, ...errorMsg };
  res ? res.json(response) : (_ => { })();
  errorMsg.Code != 0 ? LOG.error('RequestId', params.RequestId, errorMsg)
    : LOG.info('RequestId', params.RequestId, errorMsg);
  LOG.info('res content', req.body, response, errorMsg);
  return response;
};

const onMissParams = (req, res, next, missKeys) => {
  LOG.error(req.path, req.body, 'miss param', missKeys);
  simpleRespone(req, res, AppErrorMsg.MissParam);
};

const validSchema = (checker, isRequire) => {
  return { valid: checker, require: isRequire };
};

const TRTCUserSigExpire = 60 * 60 * 72

module.exports = {
  AppErrorMsg,
  QueueState,
  getClientIp,
  objectToString,
  toTypeString,
  toRawTypeString,
  isMap,
  isSet,
  isObject,
  isPlainObject,
  isSymbol,
  isString,
  isArray,
  isFunction,
  isPromise,
  isAsyncFunction,
  isBoolean,
  validString,
  validArray,
  validNumber,
  simpleRespone,
  onMissParams,
  validSchema,
  TRTCUserSigExpire
};
