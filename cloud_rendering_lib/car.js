const proc = require('process');

const LOG = require('./log');
const { AppErrorMsg } = require('./com');
const newCarClient = require('./car_client');

const deleteUselessParams = reqParams => {
  delete reqParams['Sign'];
  delete reqParams['RequestId'];
};

const applyConcurrent = (params) => {
  return new Promise((resolve, reject) => {
    const reqParams = { ...params };
    deleteUselessParams(reqParams);
    const begin = proc.uptime();
    newCarClient().ApplyConcurrent(reqParams).then((res) => {
      const elapsed = Math.round((proc.uptime() - begin) * 1000);
      LOG.debug('ApplyConcurrent res:', res, elapsed, 'ms');
      resolve(AppErrorMsg.Ok);
    }, (err) => {
      LOG.debug('ApplyConcurrent error:', err);
      reject({ Error: err, ...AppErrorMsg.LockFailed });
    }).catch((e) => {
      LOG.debug('ApplyConcurrent except:', e);
      reject({ Error: err, ...AppErrorMsg.LockFailed });
    });
  });
};

const createSession = (params) => {
  return new Promise((resolve, reject) => {
    const reqParams = { ...params };
    deleteUselessParams(reqParams);
    const begin = proc.uptime();
    newCarClient().CreateSession(reqParams).then((res) => {
      const elapsed = Math.round((proc.uptime() - begin) * 1000);
      LOG.debug('CreateSession res:', res, elapsed, 'ms');
      resolve({ SessionDescribe: res, ...AppErrorMsg.Ok });
    }, (err) => {
      LOG.debug('CreateSession error:', err);
      reject(AppErrorMsg.CreateFailed);
    }).catch((e) => {
      LOG.debug('CreateSession except:', e);
      reject(AppErrorMsg.CreateFailed);
    });
  });
};

const startPublishStreamWithURL = (params) => {
  return new Promise((resolve, reject) => {
    const reqParams = { ...params };
    deleteUselessParams(reqParams);
    const begin = proc.uptime();
    newCarClient().StartPublishStreamWithURL(reqParams).then((res) => {
      const elapsed = Math.round((proc.uptime() - begin) * 1000);
      LOG.debug('StartPublishStreamWithURL res:', res, elapsed, 'ms');
      resolve({ SessionDescribe: res, ...AppErrorMsg.Ok });
    }, (err) => {
      LOG.debug('StartPublishStreamWithURL error:', err);
      reject(AppErrorMsg.PublishFailed);
    }).catch((e) => {
      LOG.debug('StartPublishStreamWithURL except:', e);
      reject(AppErrorMsg.PublishFailed);
    });
  });
};

const stopPublishStream = (params) => {
  return new Promise((resolve, reject) => {
    const reqParams = { ...params };
    deleteUselessParams(reqParams);
    const begin = proc.uptime();
    newCarClient().StopPublishStream(reqParams).then((res) => {
      const elapsed = Math.round((proc.uptime() - begin) * 1000);
      LOG.debug('StopPublishStream res:', res, elapsed, 'ms');
      resolve({ SessionDescribe: res, ...AppErrorMsg.Ok });
    }, (err) => {
      LOG.debug('StopPublishStream error:', err);
      reject(AppErrorMsg.StopStreamFailed);
    }).catch((e) => {
      LOG.debug('StopPublishStream except:', e);
      reject(AppErrorMsg.StopStreamFailed);
    });
  });
};

const destroySession = (params) => {
  return new Promise((resolve, reject) => {
    const reqParams = { ...params };
    deleteUselessParams(reqParams);
    const begin = proc.uptime();
    newCarClient().DestroySession(reqParams).then((res) => {
      const elapsed = Math.round((proc.uptime() - begin) * 1000);
      LOG.debug('DestroySession res:', res, elapsed, 'ms');
      resolve(AppErrorMsg.Ok);
    }, (err) => {
      LOG.debug('DestroySession error:', err);
      reject(AppErrorMsg.StopFailed);
    }).catch((e) => {
      LOG.debug('DestroySession except:', e);
      reject(AppErrorMsg.StopFailed);
    });
  });
};

module.exports = {
  applyConcurrent,
  destroySession,
  createSession,
  startPublishStreamWithURL,
  stopPublishStream,
};
